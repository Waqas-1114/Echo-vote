import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';
import { ComplaintStatus } from '@/models/interfaces';

export async function PUT(
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

        const { status, comments } = await req.json();

        if (!status || !Object.values(ComplaintStatus).includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { id } = await params;

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Check if officer is assigned to this complaint
        const isAssigned = complaint.assignedTo.officers.some(
            (officerId: any) => officerId.toString() === user.userId
        );

        if (!isAssigned) {
            return NextResponse.json({ error: 'You are not assigned to this complaint' }, { status: 403 });
        }

        // Update status
        complaint.status = status;
        complaint.statusHistory.push({
            status,
            updatedBy: user.userId,
            comments: comments || `Status updated to ${status}`,
            updatedAt: new Date()
        });

        await complaint.save();

        return NextResponse.json({
            message: 'Status updated successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status
            }
        });

    } catch (error) {
        console.error('Error updating complaint status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
