import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { generateTicketNumber } from '@/lib/auth';
import { ComplaintStatus, ComplaintPriority, AdminLevel } from '@/models/interfaces';

async function findAppropriateJurisdiction(location: any) {
    // Find the most specific administrative division for the complaint
    let query: any = {
        state: location.state,
        isActive: true
    };

    if (location.district) {
        query.district = location.district;
    }

    // Try to find the most specific level available
    const divisions = await AdministrativeDivision.find(query).sort({ level: -1 });

    if (divisions.length > 0) {
        // Find the most appropriate level based on available data
        if (location.ward) {
            const ward = divisions.find(d => d.level === AdminLevel.WARD && d.name.includes(location.ward));
            if (ward) return ward;
        }

        if (location.panchayat) {
            const panchayat = divisions.find(d => d.level === AdminLevel.PANCHAYAT && d.name.includes(location.panchayat));
            if (panchayat) return panchayat;
        }

        if (location.block) {
            const block = divisions.find(d => d.level === AdminLevel.BLOCK && d.name.includes(location.block));
            if (block) return block;
        }

        // Default to district level
        const district = divisions.find(d => d.level === AdminLevel.DISTRICT && d.district === location.district);
        if (district) return district;
    }

    // Fallback to state level
    return await AdministrativeDivision.findOne({
        state: location.state,
        level: AdminLevel.STATE,
        isActive: true
    });
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        await dbConnect();

        const {
            title,
            description,
            category,
            subcategory,
            priority,
            location,
            department,
            tags,
            isAnonymous
        } = await req.json();

        // Validation
        if (!title || !description || !category || !location || !department) {
            return NextResponse.json(
                { error: 'Title, description, category, location, and department are required' },
                { status: 400 }
            );
        }

        // Set default department based on category if not provided
        const defaultDepartment = department || 'General Administration';

        // Find STATE level jurisdiction (complaints always go to state first)
        const stateJurisdiction = await AdministrativeDivision.findOne({
            state: location.state,
            level: AdminLevel.STATE,
            isActive: true
        });

        if (!stateJurisdiction) {
            return NextResponse.json(
                { error: 'Could not find state jurisdiction' },
                { status: 400 }
            );
        }

        // Find STATE level officer of the appropriate department
        const User = (await import('@/models/User')).User;
        const stateOfficer = await User.findOne({
            'governmentDetails.adminLevel': AdminLevel.STATE,
            'governmentDetails.department': defaultDepartment,
            'governmentDetails.jurisdiction': stateJurisdiction._id,
            'governmentDetails.isVerified': true,
            userType: 'government_officer',
            isActive: true
        });

        // Generate unique ticket number
        const ticketNumber = generateTicketNumber(location.state, location.district);

        // Prepare complaint data
        const complaintData: any = {
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
            statusHistory: [{
                status: ComplaintStatus.SUBMITTED,
                updatedBy: req.user!.userId,
                comments: 'Complaint submitted',
                updatedAt: new Date(),
            }],
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
        if (req.user!.isAnonymous || isAnonymous) {
            complaintData.submittedBy = {
                anonymousId: req.user!.userId, // For anonymous users, userId is actually anonymousId
            };
        } else {
            complaintData.submittedBy = {
                userId: req.user!.userId,
            };
        }

        // Create complaint
        const complaint = new Complaint(complaintData);
        await complaint.save();

        // Populate jurisdiction details for response
        await complaint.populate('assignedTo.division');

        return NextResponse.json({
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
        }, { status: 201 });

    } catch (error) {
        console.error('Create complaint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const state = searchParams.get('state');
        const district = searchParams.get('district');
        const userComplaints = searchParams.get('userComplaints') === 'true';

        const skip = (page - 1) * limit;

        // Build query
        let query: any = {};

        // Filter by user's complaints if requested
        if (userComplaints) {
            if (req.user!.isAnonymous) {
                query['submittedBy.anonymousId'] = req.user!.userId;
            } else {
                query['submittedBy.userId'] = req.user!.userId;
            }
        }

        // Apply filters
        if (status) query.status = status;
        if (category) query.category = category;
        if (state) query['location.state'] = state;
        if (district) query['location.district'] = district;

        // For public complaints, exclude non-public ones unless user is government officer
        if (!userComplaints && req.user!.userType !== 'government_officer') {
            query.isPublic = true;
        }

        // Execute query
        const complaints = await Complaint.find(query)
            .populate('assignedTo.division', 'name level')
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCount = await Complaint.countDocuments(query);

        // Filter sensitive information for non-owners
        const filteredComplaints = complaints.map(complaint => {
            const isOwner = complaint.submittedBy.userId?.toString() === req.user!.userId ||
                complaint.submittedBy.anonymousId === req.user!.userId;

            const isGovernmentOfficer = req.user!.userType === 'government_officer';

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

        return NextResponse.json({
            complaints: filteredComplaints,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });

    } catch (error) {
        console.error('Get complaints error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
});
