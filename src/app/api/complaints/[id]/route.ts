import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { User } from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        
        // Ensure models are registered
        AdministrativeDivision;
        User;

        // Get and verify token
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { id } = await params;

        const complaint = await Complaint.findById(id)
            .populate('assignedTo.division', 'name level')
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation');

        if (!complaint) {
            return NextResponse.json(
                { error: 'Complaint not found' },
                { status: 404 }
            );
        }

        // Check if user can view this complaint
        const isOwner = complaint.submittedBy.userId?.toString() === user.userId ||
            complaint.submittedBy.anonymousId === user.userId;

        const isGovernmentOfficer = user.userType === 'government_officer';
        const isPublic = complaint.isPublic;

        if (!isOwner && !isGovernmentOfficer && !isPublic) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
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
        };

        return NextResponse.json({
            complaint: complaintData
        });

    } catch (error) {
        console.error('Error fetching complaint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
