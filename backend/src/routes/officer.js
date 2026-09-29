import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { uploadPhotos } from '../middleware/upload.js';
import { requireOfficer } from '../middleware/auth.js';
import {
    findDivision,
    getComplaintById,
    getSupabase,
    getUserById,
    isUuid,
    listComplaints,
    populateComplaints,
    ConflictError, saveComplaint,
    toUser,
    unwrap,
} from '../lib/db.js';
import { AdminLevel, ComplaintStatus } from '../lib/constants.js';

const router = Router();

// Public Supabase Storage bucket created by the initial migration
const BUCKET = 'proof-of-work';

/** A state officer may act on complaints in their own state and department. */
function isInStateJurisdiction(complaint, stateOfficer) {
    return (
        complaint.location.state === stateOfficer.profile.address?.state &&
        complaint.assignedTo.department === stateOfficer.governmentDetails.department
    );
}

// GET /api/officer/profile
router.get('/profile', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const officer = await getUserById(user.userId, { withJurisdiction: true });

        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        return res.json({
            profile: {
                name: officer.profile.name,
                designation: officer.governmentDetails.designation,
                department: officer.governmentDetails.department,
                employeeId: officer.governmentDetails.employeeId,
                adminLevel: officer.governmentDetails.adminLevel,
                jurisdiction: {
                    name: officer.governmentDetails.jurisdiction.name,
                    level: officer.governmentDetails.jurisdiction.level,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching officer profile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/my-complaints
router.get('/my-complaints', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        // Find complaints assigned to this officer
        const complaints = await listComplaints(
            getSupabase().from('complaints').select('*').contains('officer_ids', [user.userId]).order('created_at', { ascending: false })
        );
        await populateComplaints(complaints, ['division', 'officers']);

        // Calculate days open for each complaint
        const complaintsWithDays = complaints.map((complaint) => {
            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedTo: complaint.assignedTo,
                submittedBy: complaint.submittedBy,
                publicSupport: complaint.publicSupport,
                createdAt: complaint.createdAt,
                updatedAt: complaint.updatedAt,
                daysOpen,
            };
        });

        return res.json({
            complaints: complaintsWithDays,
        });
    } catch (error) {
        console.error('Error fetching officer complaints:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/area-complaints
router.get('/area-complaints', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        // Get officer details
        const officer = await getUserById(user.userId, { withJurisdiction: true });
        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        // Find all complaints in the same jurisdiction
        const complaints = await listComplaints(
            getSupabase()
                .from('complaints')
                .select('*')
                .eq('division_id', officer.governmentDetails.jurisdiction._id)
                .order('created_at', { ascending: false })
        );
        await populateComplaints(complaints, ['division', 'officers']);

        // Map complaints with assigned officer info
        const areaComplaints = complaints.map((complaint) => {
            const assignedOfficer =
                complaint.assignedTo.officers && complaint.assignedTo.officers.length > 0 ? complaint.assignedTo.officers[0] : null;

            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                department: complaint.assignedTo.department,
                assignedOfficer: assignedOfficer ? assignedOfficer.profile.name : 'Unassigned',
                designation: assignedOfficer ? assignedOfficer.governmentDetails.designation : 'N/A',
                daysOpen,
            };
        });

        return res.json({
            complaints: areaComplaints,
        });
    } catch (error) {
        console.error('Error fetching area complaints:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/subordinate-tasks
router.get('/subordinate-tasks', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        // Get officer details
        const officer = await getUserById(user.userId);
        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        // Find subordinates (officers with lower admin level in the same jurisdiction and department)
        const subordinateLevels = {
            [AdminLevel.STATE]: [AdminLevel.DISTRICT, AdminLevel.BLOCK, AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.DISTRICT]: [AdminLevel.BLOCK, AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.BLOCK]: [AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.PANCHAYAT]: [AdminLevel.WARD],
            [AdminLevel.WARD]: [],
        };

        const allowedLevels = subordinateLevels[officer.governmentDetails.adminLevel] || [];

        // Subordinates work inside this officer's area: the same state, and for
        // district-level (and lower) officers also the same district
        const area = officer.profile.address || {};
        let subordinateQuery = getSupabase()
            .from('users')
            .select('*')
            .eq('user_type', 'government_officer')
            .eq('government_details->>department', officer.governmentDetails.department)
            .in('government_details->>adminLevel', allowedLevels)
            .eq('profile->address->>state', area.state);
        if (officer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            subordinateQuery = subordinateQuery.eq('profile->address->>district', area.district);
        }
        const subordinates = allowedLevels.length && area.state ? unwrap(await subordinateQuery).map(toUser) : [];

        const subordinateIds = subordinates.map((s) => s._id);

        // Find complaints assigned to subordinates
        const complaints = await listComplaints(
            getSupabase().from('complaints').select('*').overlaps('officer_ids', subordinateIds).order('updated_at', { ascending: false })
        );
        await populateComplaints(complaints, ['division', 'officers']);

        // Map to subordinate tasks
        const tasks = complaints
            .map((complaint) => {
                const assignedSubordinate = complaint.assignedTo.officers.find((o) =>
                    subordinateIds.some((id) => id.toString() === o._id.toString())
                );

                if (!assignedSubordinate) return null;

                const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

                const lastStatusUpdate =
                    complaint.statusHistory && complaint.statusHistory.length > 0
                        ? complaint.statusHistory[complaint.statusHistory.length - 1]
                        : null;

                return {
                    complaint: {
                        id: complaint._id,
                        ticketNumber: complaint.ticketNumber,
                        title: complaint.title,
                        description: complaint.description,
                        category: complaint.category,
                        status: complaint.status,
                        priority: complaint.priority,
                        location: complaint.location,
                        assignedTo: complaint.assignedTo,
                        submittedBy: complaint.submittedBy,
                        publicSupport: complaint.publicSupport,
                        createdAt: complaint.createdAt,
                        updatedAt: complaint.updatedAt,
                        daysOpen,
                    },
                    subordinate: {
                        name: assignedSubordinate.profile.name,
                        designation: assignedSubordinate.governmentDetails.designation,
                        employeeId: assignedSubordinate.governmentDetails.employeeId,
                    },
                    assignedDate: complaint.createdAt,
                    lastUpdate: complaint.updatedAt,
                    progress: lastStatusUpdate ? lastStatusUpdate.comments : 'No updates yet',
                };
            })
            .filter((task) => task !== null);

        return res.json({
            tasks,
        });
    } catch (error) {
        console.error('Error fetching subordinate tasks:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/state-dashboard
router.get('/state-dashboard', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        // Get current officer
        const officer = await getUserById(user.userId, { withJurisdiction: true });
        if (!officer || officer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return res.status(403).json({ error: 'Only state level officers can access this' });
        }

        // 1. Get FREE district officers (same department, same state, not currently assigned)
        const districtOfficers = unwrap(
            await getSupabase()
                .from('users')
                .select('*')
                .eq('user_type', 'government_officer')
                .eq('is_active', true)
                .eq('government_details->>adminLevel', AdminLevel.DISTRICT)
                .eq('government_details->>department', officer.governmentDetails.department)
                .eq('government_details->>isVerified', 'true')
                .eq('profile->address->>state', officer.profile.address.state)
                .order('created_at')
        ).map(toUser);

        // Complaints for this officer's department in this state
        const departmentComplaints = () =>
            getSupabase()
                .from('complaints')
                .select('*')
                .eq('department', officer.governmentDetails.department)
                .eq('location->>state', officer.profile.address.state);

        // Get all complaints assigned to district officers to calculate workload
        const allComplaints = await listComplaints(
            departmentComplaints().not('status', 'in', '(resolved,closed,rejected)').order('created_at')
        );

        // Calculate workload for each district officer
        const officerWorkload = districtOfficers.map((districtOfficer) => {
            const assignedComplaints = allComplaints.filter((complaint) =>
                complaint.assignedTo.officers.some((id) => id.toString() === districtOfficer._id.toString())
            );

            return {
                id: districtOfficer._id.toString(),
                name: districtOfficer.profile.name,
                designation: districtOfficer.governmentDetails.designation,
                employeeId: districtOfficer.governmentDetails.employeeId,
                district: districtOfficer.profile.address.district,
                phone: districtOfficer.profile.phone,
                activeComplaints: assignedComplaints.length,
                isFree: assignedComplaints.length < 5, // Consider free if less than 5 active complaints
                lastAssigned: assignedComplaints.length > 0 ? assignedComplaints[assignedComplaints.length - 1].createdAt : null,
            };
        });

        // 2. Get UNASSIGNED complaints (complaints in the state that haven't been assigned to district officers)
        const unassignedComplaints = await listComplaints(
            departmentComplaints()
                // No officers assigned, or assigned to state officer but not delegated
                .or(`officer_ids.eq.{},and(officer_ids.cs.{${officer._id}},status.eq.submitted)`)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true })
        );

        const unassignedList = unassignedComplaints.map((complaint) => {
            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                location: complaint.location,
                publicSupport: complaint.publicSupport,
                submittedAt: complaint.createdAt,
                createdAt: complaint.createdAt,
                daysOpen,
            };
        });

        // 3. Get ASSIGNED complaints (delegated to district officers)
        const assignedComplaints = await listComplaints(
            departmentComplaints()
                .overlaps(
                    'officer_ids',
                    districtOfficers.map((o) => o._id)
                )
                .not('status', 'in', '(resolved,closed)')
                .order('updated_at', { ascending: false })
        );
        await populateComplaints(assignedComplaints, ['officers']);

        const assignedList = assignedComplaints.map((complaint) => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    _id: assignedOfficer._id,
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId,
                    district: assignedOfficer.profile.address.district,
                },
                lastUpdate: complaint.updatedAt,
                daysOpen,
                proofCount: complaint.proofOfWork?.length || 0,
            };
        });

        // 4. Get RESOLVED complaints awaiting verification
        const resolvedComplaints = await listComplaints(
            departmentComplaints().eq('status', ComplaintStatus.RESOLVED).order('updated_at', { ascending: false })
        );
        await populateComplaints(resolvedComplaints, ['officers']);

        const resolvedList = resolvedComplaints.map((complaint) => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId,
                },
                submittedAt: complaint.createdAt,
                daysOpen,
                proofOfWork: complaint.proofOfWork || [],
            };
        });

        // 5. Get CLOSED complaints (recently closed within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const closedComplaints = await listComplaints(
            departmentComplaints()
                .eq('status', ComplaintStatus.CLOSED)
                .gte('resolution->>closedAt', thirtyDaysAgo.toISOString())
                .order('resolution->>closedAt', { ascending: false })
                .limit(20) // Limit to 20 most recent
        );
        await populateComplaints(closedComplaints, ['officers']);

        const closedList = closedComplaints.map((complaint) => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId,
                },
                submittedAt: complaint.createdAt,
                daysOpen,
                proofCount: complaint.proofOfWork?.length || 0,
            };
        });

        return res.json({
            officer: {
                name: officer.profile.name,
                designation: officer.governmentDetails.designation,
                employeeId: officer.governmentDetails.employeeId,
                department: officer.governmentDetails.department,
            },
            freeOfficers: officerWorkload.filter((o) => o.isFree),
            busyOfficers: officerWorkload.filter((o) => !o.isFree),
            unassignedComplaints: unassignedList,
            assignedComplaints: assignedList,
            resolvedComplaints: resolvedList,
            closedComplaints: closedList,
            statistics: {
                totalDistrictOfficers: districtOfficers.length,
                freeOfficers: officerWorkload.filter((o) => o.isFree).length,
                unassignedComplaints: unassignedList.length,
                assignedComplaints: assignedList.length,
                resolvedComplaints: resolvedList.length,
                closedComplaints: closedList.length,
            },
        });
    } catch (error) {
        console.error('Error fetching state dashboard:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/district-dashboard
router.get('/district-dashboard', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        // Get district officer
        const districtOfficer = await getUserById(user.userId);
        if (!districtOfficer || districtOfficer.governmentDetails.adminLevel !== AdminLevel.DISTRICT) {
            return res.status(403).json({ error: 'Only district officers can access this dashboard' });
        }

        // Get all complaints assigned to this district officer
        const assignedComplaints = await listComplaints(
            getSupabase().from('complaints').select('*').contains('officer_ids', [user.userId]).order('created_at', { ascending: false })
        );
        await populateComplaints(assignedComplaints, ['division']);

        const now = new Date();

        // Process complaints with additional info
        const processedComplaints = assignedComplaints.map((complaint) => {
            const daysOpen = Math.floor((now.getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            let deadlineStatus = 'NO_DEADLINE';
            let daysRemaining = null;

            if (complaint.dueDate) {
                const deadline = new Date(complaint.dueDate);
                daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysRemaining < 0) {
                    deadlineStatus = 'OVERDUE';
                } else if (daysRemaining <= 2) {
                    deadlineStatus = 'URGENT';
                } else if (daysRemaining <= 5) {
                    deadlineStatus = 'APPROACHING';
                } else {
                    deadlineStatus = 'ON_TRACK';
                }
            }

            // Check if acknowledged by district officer
            const hasAcknowledged = complaint.statusHistory.some(
                (history) => history.updatedBy.toString() === user.userId && history.status === ComplaintStatus.ACKNOWLEDGED
            );

            // Check if proof submitted
            const hasProof = complaint.proofOfWork && complaint.proofOfWork.length > 0;

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                location: complaint.location,
                daysOpen,
                dueDate: complaint.dueDate,
                deadlineStatus,
                daysRemaining,
                hasAcknowledged,
                hasProof,
                proofCount: complaint.proofOfWork?.length || 0,
                submittedAt: complaint.createdAt,
                lastUpdate: complaint.statusHistory[complaint.statusHistory.length - 1]?.updatedAt || complaint.createdAt,
                escalationInfo: complaint.escalationHistory[complaint.escalationHistory.length - 1] || null,
            };
        });

        // Categorize complaints
        const pending = processedComplaints.filter(
            (c) => !c.hasAcknowledged && (c.status === ComplaintStatus.SUBMITTED || c.status === ComplaintStatus.ACKNOWLEDGED)
        );

        const acknowledged = processedComplaints.filter(
            (c) => c.hasAcknowledged && c.status !== ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.CLOSED
        );

        const inProgress = processedComplaints.filter((c) => c.status === ComplaintStatus.IN_PROGRESS);

        const resolved = processedComplaints.filter((c) => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED);

        const overdue = processedComplaints.filter((c) => c.deadlineStatus === 'OVERDUE');
        const urgent = processedComplaints.filter((c) => c.deadlineStatus === 'URGENT');

        // Calculate category breakdown
        const categoryStats = processedComplaints.reduce((acc, complaint) => {
            const category = complaint.category;
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    pending: 0,
                    inProgress: 0,
                    resolved: 0,
                };
            }
            acc[category].total++;
            if (complaint.status === ComplaintStatus.SUBMITTED || complaint.status === ComplaintStatus.ACKNOWLEDGED) {
                acc[category].pending++;
            } else if (complaint.status === ComplaintStatus.IN_PROGRESS) {
                acc[category].inProgress++;
            } else if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
                acc[category].resolved++;
            }
            return acc;
        }, {});

        // Priority breakdown
        const priorityStats = {
            CRITICAL: processedComplaints.filter((c) => c.priority === 'CRITICAL').length,
            HIGH: processedComplaints.filter((c) => c.priority === 'HIGH').length,
            MEDIUM: processedComplaints.filter((c) => c.priority === 'MEDIUM').length,
            LOW: processedComplaints.filter((c) => c.priority === 'LOW').length,
        };

        // Time-based analytics
        const avgResolutionTime = resolved.length > 0 ? resolved.reduce((sum, c) => sum + c.daysOpen, 0) / resolved.length : 0;

        const oldestComplaint = processedComplaints.length > 0 ? Math.max(...processedComplaints.map((c) => c.daysOpen)) : 0;

        // Performance metrics
        const completionRate = processedComplaints.length > 0 ? ((resolved.length / processedComplaints.length) * 100).toFixed(1) : '0';

        const onTimeResolutions = resolved.filter((c) => {
            if (!c.dueDate) return true;
            const resolvedDate = new Date(c.lastUpdate);
            const dueDate = new Date(c.dueDate);
            return resolvedDate <= dueDate;
        }).length;

        const onTimeRate = resolved.length > 0 ? ((onTimeResolutions / resolved.length) * 100).toFixed(1) : '0';

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentComplaints = processedComplaints.filter((c) => new Date(c.submittedAt) >= sevenDaysAgo).length;

        const recentResolutions = resolved.filter((c) => new Date(c.lastUpdate) >= sevenDaysAgo).length;

        // Workload distribution
        const workloadByLocation = processedComplaints.reduce((acc, complaint) => {
            const location = complaint.location.block || complaint.location.district;
            if (!acc[location]) {
                acc[location] = { total: 0, pending: 0, resolved: 0 };
            }
            acc[location].total++;
            if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
                acc[location].resolved++;
            } else {
                acc[location].pending++;
            }
            return acc;
        }, {});

        return res.json({
            officer: {
                name: districtOfficer.profile.name,
                designation: districtOfficer.governmentDetails.designation,
                employeeId: districtOfficer.governmentDetails.employeeId,
                department: districtOfficer.governmentDetails.department,
                district: districtOfficer.profile.address.district,
            },
            complaints: {
                pending,
                acknowledged,
                inProgress,
                resolved,
            },
            statistics: {
                total: processedComplaints.length,
                pendingAcknowledgment: pending.length,
                acknowledged: acknowledged.length,
                inProgress: inProgress.length,
                resolved: resolved.length,
                overdue: overdue.length,
                urgent: urgent.length,
                withProof: processedComplaints.filter((c) => c.hasProof).length,
            },
            analytics: {
                categoryBreakdown: categoryStats,
                priorityBreakdown: priorityStats,
                performance: {
                    completionRate: parseFloat(completionRate),
                    onTimeRate: parseFloat(onTimeRate),
                    avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
                    oldestComplaint: oldestComplaint,
                    totalResolved: resolved.length,
                    onTimeResolutions: onTimeResolutions,
                },
                recentActivity: {
                    newComplaintsLast7Days: recentComplaints,
                    resolvedLast7Days: recentResolutions,
                    dailyAverage: (recentComplaints / 7).toFixed(1),
                },
                workloadByLocation: workloadByLocation,
            },
        });
    } catch (error) {
        console.error('Error fetching district dashboard:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/assign-complaint
router.post('/assign-complaint', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const body = req.body;
        console.log('📥 Received assignment request body:', body);

        const { complaintId, officerId, deadline, instructions } = body;

        console.log('🔍 Extracted values:', {
            complaintId,
            officerId,
            hasComplaintId: !!complaintId,
            hasOfficerId: !!officerId,
            complaintIdType: typeof complaintId,
            officerIdType: typeof officerId,
        });

        if (!complaintId || !officerId) {
            console.log('❌ Validation failed - missing IDs');
            return res.status(400).json({ error: 'Complaint ID and Officer ID are required' });
        }

        // Get state officer
        const stateOfficer = await getUserById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return res.status(403).json({ error: 'Only state officers can assign complaints' });
        }

        // Get complaint
        const complaint = await getComplaintById(complaintId);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Verify complaint is in the state officer's jurisdiction
        if (!isInStateJurisdiction(complaint, stateOfficer)) {
            return res.status(403).json({ error: 'This complaint is not in your jurisdiction' });
        }

        // Get district officer
        const districtOfficer = await getUserById(officerId);
        if (!districtOfficer || districtOfficer.governmentDetails.adminLevel !== AdminLevel.DISTRICT) {
            return res.status(400).json({ error: 'Invalid district officer' });
        }

        // Find district jurisdiction
        const districtJurisdiction = await findDivision({
            state: complaint.location.state,
            district: complaint.location.district,
            level: AdminLevel.DISTRICT,
            is_active: true,
        });

        // Update complaint
        complaint.assignedTo.division = districtJurisdiction ? districtJurisdiction._id : complaint.assignedTo.division;
        complaint.assignedTo.officers = [districtOfficer._id]; // Replace state officer with district officer
        complaint.status = ComplaintStatus.ACKNOWLEDGED;

        if (deadline) {
            complaint.dueDate = new Date(deadline);
        }

        // Add to escalation history (tracking the assignment flow)
        complaint.escalationHistory.push({
            fromDivision: stateOfficer.governmentDetails.jurisdiction,
            toDivision: districtOfficer.governmentDetails.jurisdiction,
            reason: instructions || 'Assigned by state officer to district officer for resolution',
            escalatedBy: user.userId,
            escalatedAt: new Date(),
        });

        // Add status update
        complaint.statusHistory.push({
            status: ComplaintStatus.ACKNOWLEDGED,
            updatedBy: user.userId,
            comments: `Assigned to ${districtOfficer.profile.name} (${districtOfficer.governmentDetails.designation}) - ${districtOfficer.governmentDetails.employeeId}. ${instructions || ''}`,
            updatedAt: new Date(),
        });

        await saveComplaint(complaint);

        return res.json({
            message: 'Complaint assigned successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                assignedTo: {
                    name: districtOfficer.profile.name,
                    designation: districtOfficer.governmentDetails.designation,
                    employeeId: districtOfficer.governmentDetails.employeeId,
                },
                deadline: complaint.dueDate,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error assigning complaint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/acknowledge
router.post('/complaints/:id/acknowledge', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { message } = req.body;
        const { id } = req.params;

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Verify officer is assigned
        const isAssigned = complaint.assignedTo.officers.some((id) => id.toString() === user.userId);

        if (!isAssigned) {
            return res.status(403).json({ error: 'This complaint is not assigned to you' });
        }

        // Get officer details
        const officer = await getUserById(user.userId);

        // Update status to IN_PROGRESS
        complaint.status = ComplaintStatus.IN_PROGRESS;

        // Add acknowledgment to status history
        complaint.statusHistory.push({
            status: ComplaintStatus.IN_PROGRESS,
            updatedBy: user.userId,
            comments: `Acknowledged by ${officer.profile.name}. ${message || 'Work will begin shortly.'}`,
            updatedAt: new Date(),
        });

        await saveComplaint(complaint);

        return res.json({
            message: 'Complaint acknowledged successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error acknowledging complaint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/add-work-progress
router.post('/complaints/:id/add-work-progress', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { description, workDetails, photosUrls, progressPercentage } = req.body;

        if (!description || !workDetails) {
            return res.status(400).json({ error: 'Description and work details are required' });
        }

        const { id } = req.params;

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Verify officer is assigned
        const isAssigned = complaint.assignedTo.officers.some((officerId) => officerId.toString() === user.userId);

        if (!isAssigned) {
            return res.status(403).json({ error: 'This complaint is not assigned to you' });
        }

        // Get officer details
        const officer = await getUserById(user.userId);
        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        // Initialize proofOfWork array if it doesn't exist
        if (!complaint.proofOfWork) {
            complaint.proofOfWork = [];
        }

        // Add work progress update
        complaint.proofOfWork.push({
            description,
            workDetails,
            photos: photosUrls || [],
            submittedBy: user.userId,
            submittedAt: new Date(),
        });

        // Add to status history
        const progressInfo = progressPercentage ? ` (${progressPercentage}% complete)` : '';
        complaint.statusHistory.push({
            status: complaint.status,
            updatedBy: user.userId,
            comments: `Work progress update by ${officer.profile.name}${progressInfo}: ${description}`,
            updatedAt: new Date(),
        });

        await saveComplaint(complaint);

        return res.json({
            message: 'Work progress added successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
                proofCount: complaint.proofOfWork.length,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error adding work progress:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/submit-proof
router.post('/complaints/:id/submit-proof', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { description, workDetails, photosUrls, markAsResolved, estimatedCompletionDate } = req.body;

        if (!description || !workDetails) {
            return res.status(400).json({ error: 'Description and work details are required' });
        }

        if (markAsResolved && (!photosUrls || photosUrls.length === 0)) {
            return res.status(400).json({
                error: 'At least one proof photo is required to mark complaint as resolved',
            });
        }

        const { id } = req.params;

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Verify officer is assigned
        const isAssigned = complaint.assignedTo.officers.some((officerId) => officerId.toString() === user.userId);

        if (!isAssigned) {
            return res.status(403).json({ error: 'This complaint is not assigned to you' });
        }

        // Get officer details
        const officer = await getUserById(user.userId);
        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        // Initialize proofOfWork array if it doesn't exist
        if (!complaint.proofOfWork) {
            complaint.proofOfWork = [];
        }

        // Add proof of work
        complaint.proofOfWork.push({
            description,
            workDetails,
            photos: photosUrls || [],
            submittedBy: user.userId,
            submittedAt: new Date(),
        });

        // If markAsResolved is true, update status and resolution details
        if (markAsResolved) {
            // Check if work was completed before deadline (if any)
            const isBeforeDeadline = !complaint.dueDate || new Date() <= new Date(complaint.dueDate);
            const deadlineStatus = complaint.dueDate
                ? isBeforeDeadline
                    ? ' (completed before deadline)'
                    : ' (completed after deadline)'
                : '';

            // Update status to RESOLVED
            complaint.status = ComplaintStatus.RESOLVED;
            complaint.resolvedAt = new Date();

            // Set resolution details
            complaint.resolution = {
                description: `${description}\n\nWork Details: ${workDetails}`,
                resolvedBy: user.userId,
                resolvedAt: new Date(),
                verificationRequired: true, // Requires state officer verification
            };

            // Add to status history
            complaint.statusHistory.push({
                status: ComplaintStatus.RESOLVED,
                updatedBy: user.userId,
                comments: `Work completed by ${officer.profile.name}${deadlineStatus}. Awaiting verification by state officer.\n\n${description}`,
                updatedAt: new Date(),
            });
        } else {
            // Just a progress update
            if (estimatedCompletionDate) {
                complaint.dueDate = new Date(estimatedCompletionDate);
            }

            complaint.statusHistory.push({
                status: complaint.status,
                updatedBy: user.userId,
                comments: `Proof of work submitted by ${officer.profile.name}. ${description}`,
                updatedAt: new Date(),
            });
        }

        await saveComplaint(complaint);

        return res.json({
            message: markAsResolved
                ? 'Complaint marked as resolved and submitted for verification'
                : 'Proof of work submitted successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
                proofCount: complaint.proofOfWork.length,
                requiresVerification: markAsResolved ? true : false,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error submitting proof:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/upload-proof-photos
router.post('/complaints/:id/upload-proof-photos', requireOfficer, uploadPhotos, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Only officers assigned to the complaint may attach evidence to it
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        if (!complaint.assignedTo.officers.includes(req.user.userId)) {
            return res.status(403).json({ error: 'This complaint is not assigned to you' });
        }

        // Parsed by multer (see upload middleware on this route: ≤10 files, ≤5 MB each)
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        if (files.some((file) => !file.mimetype.startsWith('image/'))) {
            return res.status(400).json({ error: 'Only image files can be uploaded' });
        }

        const storage = getSupabase().storage.from(BUCKET);
        const uploadedPaths = [];
        try {
            for (const file of files) {
                // Unique object name: several phone photos can share a file name
                const extension = (file.originalname.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || file.mimetype.split('/')[1] || 'jpg').toLowerCase();
                const objectPath = `${id}/${Date.now()}-${randomUUID()}.${extension}`;
                unwrap(await storage.upload(objectPath, file.buffer, { contentType: file.mimetype }));
                uploadedPaths.push(objectPath);
            }
        } catch (error) {
            // Don't leave half an upload behind
            if (uploadedPaths.length) await storage.remove(uploadedPaths);
            throw error;
        }
        const uploadedUrls = uploadedPaths.map((objectPath) => storage.getPublicUrl(objectPath).data.publicUrl);

        return res.json({
            message: 'Photos uploaded successfully',
            urls: uploadedUrls,
        });
    } catch (error) {
        console.error('Error uploading photos:', error);
        return res.status(500).json({ error: 'Failed to upload photos' });
    }
});

// PUT /api/officer/complaints/:id/status
router.put('/complaints/:id/status', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { status, comments } = req.body;

        if (!status || !Object.values(ComplaintStatus).includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const { id } = req.params;

        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Check if officer is assigned to this complaint
        const isAssigned = complaint.assignedTo.officers.some((officerId) => officerId.toString() === user.userId);

        if (!isAssigned) {
            return res.status(403).json({ error: 'You are not assigned to this complaint' });
        }

        // Update status
        complaint.status = status;
        complaint.statusHistory.push({
            status,
            updatedBy: user.userId,
            comments: comments || `Status updated to ${status}`,
            updatedAt: new Date(),
        });

        await saveComplaint(complaint);

        return res.json({
            message: 'Status updated successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error updating complaint status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/notify
router.post('/complaints/:id/notify', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { message } = req.body;
        const { id } = req.params;

        if (!message) {
            return res.status(400).json({ error: 'Notification message is required' });
        }

        // Get officer details
        const officer = await getUserById(user.userId);
        if (!officer) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Check authorization based on officer level
        const isAssigned = complaint.assignedTo.officers.some((officerId) => officerId.toString() === user.userId);

        const isStateOfficer = officer.governmentDetails.adminLevel === AdminLevel.STATE;
        const isDistrictOfficer = officer.governmentDetails.adminLevel === AdminLevel.DISTRICT;

        // District officers can only notify during work progress (not after resolved)
        if (isDistrictOfficer && !isAssigned) {
            return res.status(403).json({
                error: 'This complaint is not assigned to you',
            });
        }

        if (isDistrictOfficer && complaint.status === ComplaintStatus.RESOLVED) {
            return res.status(403).json({
                error: 'District officers cannot send notifications after complaint is resolved. Wait for state officer verification.',
            });
        }

        // District officers can send final notification after state officer closes the complaint
        // This allows them to send courtesy messages after official closure

        // State officers can notify at any stage, but primarily after verification
        if (isStateOfficer && complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
            return res.status(403).json({
                error: 'State officers should notify citizens after verifying and closing complaints',
            });
        }

        // Add notification to status history
        complaint.statusHistory.push({
            status: complaint.status,
            updatedBy: officer._id,
            comments: `📢 Citizen Notification from ${officer.profile.name} (${officer.governmentDetails.designation}): ${message}`,
            updatedAt: new Date(),
        });

        await saveComplaint(complaint);

        return res.json({
            message: 'Notification sent to citizen successfully',
            notification: {
                from: officer.profile.name,
                role: officer.governmentDetails.designation,
                message,
                sentAt: new Date(),
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error sending notification:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/verify-and-close
router.post('/complaints/:id/verify-and-close', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { verificationNotes, approved, notifyCitizen, notificationMessage } = req.body;
        const { id } = req.params;

        // Get state officer details
        const stateOfficer = await getUserById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return res.status(403).json({
                error: 'Only state level officers can verify and close complaints',
            });
        }

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        if (!isInStateJurisdiction(complaint, stateOfficer)) {
            return res.status(403).json({ error: 'This complaint is not in your jurisdiction' });
        }

        // Check if complaint is resolved
        if (complaint.status !== ComplaintStatus.RESOLVED) {
            return res.status(400).json({
                error: 'Only resolved complaints can be verified and closed',
            });
        }

        if (approved) {
            // Verify and close the complaint
            complaint.status = ComplaintStatus.CLOSED;
            const closedAt = new Date();
            complaint.resolution = {
                ...complaint.resolution,
                resolvedBy: complaint.resolution?.resolvedBy || complaint.assignedTo.officers[0],
                resolvedAt: complaint.resolution?.resolvedAt || complaint.resolvedAt || closedAt,
                verificationRequired: false,
                verificationNotes,
                verifiedBy: stateOfficer._id,
                verifiedAt: closedAt,
                closedAt,
            };

            complaint.statusHistory.push({
                status: ComplaintStatus.CLOSED,
                updatedBy: stateOfficer._id,
                comments: `Verified and closed by ${stateOfficer.profile.name}.${verificationNotes ? ` ${verificationNotes}` : ''}`,
                updatedAt: new Date(),
            });

            // If state officer chooses to notify citizen
            if (notifyCitizen && notificationMessage) {
                // Add notification to status history
                complaint.statusHistory.push({
                    status: ComplaintStatus.CLOSED,
                    updatedBy: stateOfficer._id,
                    comments: `📢 Citizen Notification from ${stateOfficer.profile.name} (${stateOfficer.governmentDetails.designation}): ${notificationMessage}`,
                    updatedAt: new Date(),
                });
            }

            await saveComplaint(complaint);

            return res.json({
                message: 'Complaint verified and closed successfully',
                notificationSent: notifyCitizen,
                complaint: {
                    id: complaint._id,
                    ticketNumber: complaint.ticketNumber,
                    status: complaint.status,
                    verifiedBy: stateOfficer.profile.name,
                    verifiedAt: new Date(),
                },
            });
        } else {
            // Reject the resolution - send back to district officer
            complaint.status = ComplaintStatus.IN_PROGRESS;
            complaint.statusHistory.push({
                status: ComplaintStatus.IN_PROGRESS,
                updatedBy: stateOfficer._id,
                comments: `Resolution rejected by ${stateOfficer.profile.name}. Reason: ${verificationNotes || 'not given'}. Please review and resubmit.`,
                updatedAt: new Date(),
            });

            await saveComplaint(complaint);

            return res.json({
                message: 'Resolution rejected. Complaint sent back to district officer.',
                complaint: {
                    id: complaint._id,
                    ticketNumber: complaint.ticketNumber,
                    status: complaint.status,
                },
            });
        }
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error verifying complaint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/officer/complaints/:id/verify-resolution
router.post('/complaints/:id/verify-resolution', requireOfficer, async (req, res) => {
    try {
        const user = req.user;

        const { approved, comments } = req.body;

        // Get state officer
        const stateOfficer = await getUserById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return res.status(403).json({ error: 'Only state officers can verify resolutions' });
        }

        const { id } = req.params;

        // Get complaint
        const complaint = await getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        if (!isInStateJurisdiction(complaint, stateOfficer)) {
            return res.status(403).json({ error: 'This complaint is not in your jurisdiction' });
        }

        if (complaint.status !== ComplaintStatus.RESOLVED) {
            return res.status(400).json({ error: 'Complaint must be resolved before verification' });
        }

        if (approved) {
            // Approve and close complaint
            const closedAt = new Date();
            complaint.status = ComplaintStatus.CLOSED;
            complaint.resolvedAt = complaint.resolvedAt || closedAt;
            complaint.resolution = {
                ...complaint.resolution,
                verificationRequired: false,
                verificationNotes: comments,
                verifiedBy: stateOfficer._id,
                verifiedAt: closedAt,
                closedAt,
            };

            complaint.statusHistory.push({
                status: ComplaintStatus.CLOSED,
                updatedBy: user.userId,
                comments: `Verified and approved by ${stateOfficer.profile.name}. ${comments || 'Resolution verified successfully.'}`,
                updatedAt: new Date(),
            });
        } else {
            // Reject resolution and send back to district officer
            complaint.status = ComplaintStatus.IN_PROGRESS;

            complaint.statusHistory.push({
                status: ComplaintStatus.IN_PROGRESS,
                updatedBy: user.userId,
                comments: `Resolution rejected by ${stateOfficer.profile.name}. ${comments || 'Please review and resubmit.'}`,
                updatedAt: new Date(),
            });
        }

        await saveComplaint(complaint);

        return res.json({
            message: approved ? 'Complaint closed successfully' : 'Resolution rejected',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
            },
        });
    } catch (error) {
        if (error instanceof ConflictError) return res.status(409).json({ error: error.message });
        console.error('Error verifying resolution:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
