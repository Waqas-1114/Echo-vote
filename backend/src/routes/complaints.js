import { Router } from 'express';
import { optionalAuth, requireAuth, requireOfficer } from '../middleware/auth.js';
import {
    findDivision,
    getComplaintById,
    getSupabase,
    getUserById,
    ilikeAny,
    insertComplaint,
    listComplaints,
    populateComplaints,
    ConflictError, saveComplaint,
    toUser,
    unwrap,
    updateComplaint,
} from '../lib/db.js';
import { generateTicketNumber } from '../lib/auth.js';
import { AdminLevel, ComplaintPriority, ComplaintStatus, DEPARTMENTS, UserType } from '../lib/constants.js';

const router = Router();

// POST /api/complaints
router.post('/', requireAuth, async (req, res) => {
    try {
        // Complaints are filed by citizens; officers and admins work on them.
        // (One login is shared by all tabs, so this also catches filing from the wrong account.)
        if (req.user.userType !== UserType.CITIZEN) {
            return res.status(403).json({
                error: 'Only citizen accounts can submit complaints. You are logged in as an officer or admin; log out and sign in as a citizen.',
            });
        }

        const { title, description, category, subcategory, priority, location, department, tags, isAnonymous } = req.body;

        // Validation
        if (!title || !description || !category || !location || !department) {
            return res.status(400).json({ error: 'Title, description, category, location, and department are required' });
        }

        // Complaints are routed to officers by exact department name
        if (!DEPARTMENTS.includes(department)) {
            return res.status(400).json({ error: 'Please select a valid department' });
        }
        const defaultDepartment = department;

        // Find STATE level jurisdiction (complaints always go to state first)
        const stateJurisdiction = await findDivision({
            state: location.state,
            level: AdminLevel.STATE,
            is_active: true,
        });

        if (!stateJurisdiction) {
            return res.status(400).json({ error: 'Could not find state jurisdiction' });
        }

        // Find STATE level officer of the appropriate department
        const stateOfficerRow = unwrap(
            await getSupabase()
                .from('users')
                .select('*')
                .eq('user_type', UserType.GOVERNMENT_OFFICER)
                .eq('is_active', true)
                .eq('jurisdiction_id', stateJurisdiction._id)
                .eq('government_details->>adminLevel', AdminLevel.STATE)
                .eq('government_details->>department', defaultDepartment)
                .eq('government_details->>isVerified', 'true')
                .limit(1)
                .maybeSingle()
        );
        const stateOfficer = toUser(stateOfficerRow);

        // Generate unique ticket number
        const ticketNumber = generateTicketNumber(location.state, location.district);

        // Prepare complaint data
        const complaintData = {
            ticketNumber,
            title: title.trim(),
            description: description.trim(),
            category,
            subcategory,
            priority: priority || ComplaintPriority.MEDIUM,
            status: ComplaintStatus.SUBMITTED,
            location: {
                state: location.state,
                district: location.district,
                subDivision: location.subDivision,
                block: location.block,
                panchayat: location.panchayat,
                ward: location.ward,
                address: location.address,
                coordinates: location.coordinates,
            },
            assignedTo: {
                division: stateJurisdiction._id,
                department: defaultDepartment,
                officers: stateOfficer ? [stateOfficer._id] : [], // Automatically assign to state officer
            },
            statusHistory: [
                {
                    status: ComplaintStatus.SUBMITTED,
                    updatedBy: req.user.userId,
                    comments: 'Complaint submitted',
                    updatedAt: new Date(),
                },
            ],
            escalationHistory: [],
            attachments: [],
            publicSupport: {
                upvotes: 0,
                comments: [],
            },
            isPublic: !isAnonymous,
            tags: tags || [],
        };

        // Handle user identification (anonymous vs registered)
        if (req.user.isAnonymous || isAnonymous) {
            complaintData.submittedBy = {
                anonymousId: req.user.userId, // For anonymous users, userId is actually anonymousId
            };
        } else {
            complaintData.submittedBy = {
                userId: req.user.userId,
            };
        }

        // Create complaint
        const complaint = await insertComplaint(complaintData);
        complaint.assignedTo.division = stateJurisdiction;

        return res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedTo: complaint.assignedTo,
                createdAt: complaint.createdAt,
            },
        });
    } catch (error) {
        console.error('Create complaint error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/complaints
router.get('/', optionalAuth, async (req, res) => {
    try {
        const user = req.user;

        const { searchParams } = new URL(req.originalUrl, 'http://localhost');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const state = searchParams.get('state');
        const district = searchParams.get('district');
        const search = searchParams.get('search')?.trim();
        const userComplaints = searchParams.get('userComplaints') === 'true';

        if (userComplaints && !user) {
            return res.status(401).json({ error: 'No valid authorization token provided' });
        }

        const skip = (page - 1) * limit;

        // Visibility: the user's own complaints if requested, and only public
        // ones unless the user is a government officer. A user's complaints are
        // either filed under their id or, when filed anonymously, under anonymous_id.
        const ownerId = userComplaints ? user.userId : null;
        const ownerFilter = ownerId && `submitted_by_user_id.eq.${ownerId},anonymous_id.eq.${ownerId}`;
        const publicOnly = !userComplaints && user?.userType !== 'government_officer';

        // Stats reflect the visible set before the status/category/search filters are applied
        let byStatus;
        let statesCount;
        if (ownerFilter) {
            const own = unwrap(await getSupabase().from('complaints').select('status, state:location->>state').or(ownerFilter));
            byStatus = own.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
            statesCount = new Set(own.map((c) => c.state)).size;
        } else {
            const statsRow = unwrap(await getSupabase().rpc('complaint_stats', { p_public_only: publicOnly }));
            byStatus = statsRow.byStatus;
            statesCount = statsRow.states;
        }
        const countOf = (...statuses) => statuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0);
        const stats = {
            total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
            resolved: countOf(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED),
            inProgress: countOf(ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED),
            submitted: countOf(ComplaintStatus.SUBMITTED),
            states: statesCount,
        };

        // Build query
        let query = getSupabase().from('complaints').select('*', { count: 'exact' });

        if (ownerFilter) query = query.or(ownerFilter);
        if (publicOnly) query = query.eq('is_public', true);

        // Apply filters
        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);
        if (state) query = query.eq('location->>state', state);
        if (district) query = query.eq('location->>district', district);
        if (search) {
            query = query.or(
                ilikeAny(['title', 'ticket_number', 'location->>district', 'location->>state', 'location->>address', 'category'], search)
            );
        }

        // Execute query
        const result = await query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);
        const complaints = await listComplaints(result);
        const totalCount = result.count ?? 0;

        await populateComplaints(complaints, ['division', 'officers']);

        // Filter sensitive information for non-owners
        const filteredComplaints = complaints.map((complaint) => {
            const isOwner =
                !!user && (complaint.submittedBy.userId?.toString() === user.userId || complaint.submittedBy.anonymousId === user.userId);

            const isGovernmentOfficer = user?.userType === 'government_officer';

            return {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: isOwner || isGovernmentOfficer ? complaint.description : complaint.description.substring(0, 100) + '...',
                category: complaint.category,
                subcategory: complaint.subcategory,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedTo: complaint.assignedTo,
                publicSupport: complaint.publicSupport,
                tags: complaint.tags,
                createdAt: complaint.createdAt,
                updatedAt: complaint.updatedAt,
                isOwner,
            };
        });

        return res.json({
            complaints: filteredComplaints,
            stats,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/complaints/my-complaints
router.get('/my-complaints', requireAuth, async (req, res) => {
    try {
        const payload = req.user;

        // Complaints filed under the user's id, or anonymously (anonymous_id holds the same id)
        const ids = [payload.userId];
        if (payload.isAnonymous) {
            const userData = await getUserById(payload.userId);
            if (userData?.anonymousId) ids.push(userData.anonymousId);
        }
        const ownerFilter = [`submitted_by_user_id.eq.${payload.userId}`, ...ids.map((id) => `anonymous_id.eq.${id}`)].join(',');
        const query = getSupabase().from('complaints').select('*').or(ownerFilter);
        const complaints = await listComplaints(query.order('created_at', { ascending: false }));
        // Timeline authors (officer names/designations) power the dashboard's updates feed
        await populateComplaints(complaints, ['statusHistory']);

        return res.json({
            complaints,
            total: complaints.length,
        });
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/complaints/assigned
router.get('/assigned', requireOfficer, async (req, res) => {
    try {
        const decoded = req.user;

        // Fetch complaints assigned to this officer
        const allAssigned = await listComplaints(
            getSupabase().from('complaints').select('*').contains('officer_ids', [decoded.userId]).order('created_at', { ascending: false })
        );
        const complaints = allAssigned.slice(0, 10);

        // Calculate statistics
        const stats = {
            assigned: allAssigned.length,
            pending: allAssigned.filter((c) => c.status === 'submitted').length,
            inProgress: allAssigned.filter((c) => c.status === 'in_progress').length,
            resolved: allAssigned.filter((c) => c.status === 'resolved').length,
        };

        return res.json({
            success: true,
            complaints,
            stats,
        });
    } catch (error) {
        console.error('Error fetching assigned complaints:', error);
        return res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// GET /api/complaints/jurisdiction
router.get('/jurisdiction', requireOfficer, async (req, res) => {
    try {
        const decoded = req.user;

        // Fetch officer details to get jurisdiction
        const officer = await getUserById(decoded.userId);
        if (!officer || !officer.profile?.address) {
            return res.status(400).json({ error: 'Officer profile not complete' });
        }

        // Fetch complaints in officer's jurisdiction that are not fully assigned
        const complaints = await listComplaints(
            getSupabase()
                .from('complaints')
                .select('*')
                .eq('location->>state', officer.profile.address.state)
                .eq('location->>district', officer.profile.address.district)
                .in('status', ['submitted', 'acknowledged', 'in_progress'])
                .not('officer_ids', 'cs', `{${decoded.userId}}`) // Not assigned to this officer yet
                .order('created_at', { ascending: false })
                .limit(10)
        );

        return res.json({
            success: true,
            complaints,
        });
    } catch (error) {
        console.error('Error fetching jurisdiction complaints:', error);
        return res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// GET /api/complaints/:id
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        // Auth is optional: guests may view public complaints (transparency),
        // owners and officers get the full details.
        const user = req.user;

        const { id } = req.params;

        const complaint = await getComplaintById(id);

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        await populateComplaints([complaint], ['division', 'officers', 'statusHistory', 'proofOfWork', 'resolution']);

        // Check if user can view this complaint
        const isOwner =
            !!user && (complaint.submittedBy.userId?.toString() === user.userId || complaint.submittedBy.anonymousId === user.userId);

        const isGovernmentOfficer = user?.userType === 'government_officer';
        const isPublic = complaint.isPublic;

        if (!isOwner && !isGovernmentOfficer && !isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Filter sensitive information for non-owners
        const complaintData = {
            id: complaint._id,
            ticketNumber: complaint.ticketNumber,
            title: complaint.title,
            description: isOwner || isGovernmentOfficer ? complaint.description : complaint.description.substring(0, 200) + '...',
            category: complaint.category,
            subcategory: complaint.subcategory,
            status: complaint.status,
            priority: complaint.priority,
            location: complaint.location,
            assignedTo: complaint.assignedTo,
            statusHistory: complaint.statusHistory,
            publicSupport: complaint.publicSupport,
            tags: complaint.tags,
            createdAt: complaint.createdAt,
            updatedAt: complaint.updatedAt,
            isOwner,
            hasUpvoted: !!user && complaint.publicSupport.upvoters.includes(user.userId),
            // Additional details for owners and officers
            ...(isOwner || isGovernmentOfficer
                ? {
                      proofOfWork: complaint.proofOfWork,
                      resolution: complaint.resolution,
                      // Last hand-off (state → district officer) and its deadline
                      assignedAt: complaint.escalationHistory.at(-1)?.escalatedAt,
                      deadline: complaint.dueDate,
                      escalationHistory: complaint.escalationHistory,
                      attachments: complaint.attachments,
                      feedback: complaint.feedback,
                  }
                : {}),
        };

        return res.json({
            complaint: complaintData,
        });
    } catch (error) {
        console.error('Error fetching complaint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/complaints/:id/assign
router.post('/:id/assign', requireOfficer, async (req, res) => {
    try {
        const decoded = req.user;

        const { id } = req.params;

        const complaint = await getComplaintById(id);

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Add officer to assigned officers list if not already assigned
        if (!complaint.assignedTo.officers) {
            complaint.assignedTo.officers = [];
        }

        if (!complaint.assignedTo.officers.includes(decoded.userId)) {
            complaint.assignedTo.officers.push(decoded.userId);
        }

        complaint.status = 'in_progress';
        await saveComplaint(complaint);

        return res.json({
            success: true,
            message: 'Complaint assigned successfully',
            complaint,
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error assigning complaint:', error);
        return res.status(500).json({ error: 'Failed to assign complaint' });
    }
});

// POST /api/complaints/:id/support
// Community support: { type: 'upvote' } (once per user) or { type: 'comment', comment }
router.post('/:id/support', requireAuth, async (req, res) => {
    try {
        const { type, comment } = req.body;
        const { id } = req.params;

        if (type !== 'upvote' && type !== 'comment') {
            return res.status(400).json({ error: "Support type must be 'upvote' or 'comment'" });
        }
        const text = typeof comment === 'string' ? comment.trim() : '';
        if (type === 'comment' && (text.length === 0 || text.length > 1000)) {
            return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters' });
        }

        const existing = await getComplaintById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Same visibility rule as the detail page
        const isOwner = existing.submittedBy.userId === req.user.userId || existing.submittedBy.anonymousId === req.user.userId;
        if (!existing.isPublic && !isOwner && req.user.userType !== UserType.GOVERNMENT_OFFICER) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Comments show the supporter's name, unless they chose an anonymous account
        let author = 'Anonymous citizen';
        if (type === 'comment' && !req.user.isAnonymous) {
            const supporter = await getUserById(req.user.userId);
            author = supporter?.profile?.name || author;
        }

        let alreadyUpvoted = false;
        const complaint = await updateComplaint(id, (c) => {
            const support = c.publicSupport;
            if (type === 'upvote') {
                alreadyUpvoted = support.upvoters.includes(req.user.userId);
                if (alreadyUpvoted) return false; // nothing to save
                support.upvoters = [...support.upvoters, req.user.userId];
                support.upvotes += 1;
            } else {
                support.comments = [...support.comments, { comment: text, submittedBy: author, submittedAt: new Date() }];
            }
        });

        return res.json({
            message: type === 'upvote' ? (alreadyUpvoted ? 'You already support this complaint' : 'Support added') : 'Comment added',
            publicSupport: complaint.publicSupport,
            hasUpvoted: complaint.publicSupport.upvoters.includes(req.user.userId),
        });
    } catch (error) {
        console.error('Error adding support:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/complaints/:id/feedback
router.post('/:id/feedback', requireAuth, async (req, res) => {
    try {
        const user = req.user;

        const { id } = req.params;
        const { rating, comments } = req.body;

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (!comments || comments.trim().length === 0) {
            return res.status(400).json({ error: 'Feedback comments are required' });
        }

        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Check if user is the owner
        const isOwner = complaint.submittedBy.userId?.toString() === user.userId || complaint.submittedBy.anonymousId === user.userId;

        if (!isOwner) {
            return res.status(403).json({ error: 'Only the complaint owner can provide feedback' });
        }

        // Check if complaint is closed
        if (complaint.status !== ComplaintStatus.CLOSED) {
            return res.status(400).json({ error: 'Feedback can only be provided for closed complaints' });
        }

        // Add feedback to complaint
        if (!complaint.feedback) {
            complaint.feedback = {
                rating,
                comments,
                submittedAt: new Date(),
            };
        } else {
            // Update existing feedback
            complaint.feedback.rating = rating;
            complaint.feedback.comments = comments;
            complaint.feedback.submittedAt = new Date();
        }

        await saveComplaint(complaint);

        return res.json({
            message: 'Feedback submitted successfully',
            feedback: complaint.feedback,
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error submitting feedback:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
