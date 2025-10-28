import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';
import { ComplaintStatus } from '@/models/interfaces';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user || user.userType !== 'government_officer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { message } = await req.json();
        const { id } = await params;

        // Get complaint
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Verify officer is assigned
        const isAssigned = complaint.assignedTo.officers.some(
            (id: any) => id.toString() === user.userId
        );

        if (!isAssigned) {
            return NextResponse.json({ error: 'This complaint is not assigned to you' }, { status: 403 });
        }

        // Get officer details
        const officer = await User.findById(user.userId);

        // Update status to IN_PROGRESS
        complaint.status = ComplaintStatus.IN_PROGRESS;

        // Add acknowledgment to status history
        complaint.statusHistory.push({
            status: ComplaintStatus.IN_PROGRESS,
            updatedBy: user.userId,
            comments: `Acknowledged by ${officer.profile.name}. ${message || 'Work will begin shortly.'}`,
            updatedAt: new Date()
        });

        await complaint.save();

        return NextResponse.json({
            message: 'Complaint acknowledged successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status
            }
        });

    } catch (error) {
        console.error('Error acknowledging complaint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
