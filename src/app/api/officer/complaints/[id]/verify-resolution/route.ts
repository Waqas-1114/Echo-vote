import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';
import { ComplaintStatus, AdminLevel } from '@/models/interfaces';

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

        const { approved, comments } = await req.json();

        // Get state officer
        const stateOfficer = await User.findById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return NextResponse.json({ error: 'Only state officers can verify resolutions' }, { status: 403 });
        }

        const { id } = await params;

        // Get complaint
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        if (complaint.status !== ComplaintStatus.RESOLVED) {
            return NextResponse.json({ error: 'Complaint must be resolved before verification' }, { status: 400 });
        }

        if (approved) {
            // Approve and close complaint
            complaint.status = ComplaintStatus.CLOSED;
            complaint.resolvedAt = new Date();

            complaint.statusHistory.push({
                status: ComplaintStatus.CLOSED,
                updatedBy: user.userId,
                comments: `Verified and approved by ${stateOfficer.profile.name}. ${comments || 'Resolution verified successfully.'}`,
                updatedAt: new Date()
            });
        } else {
            // Reject resolution and send back to district officer
            complaint.status = ComplaintStatus.IN_PROGRESS;

            complaint.statusHistory.push({
                status: ComplaintStatus.IN_PROGRESS,
                updatedBy: user.userId,
                comments: `Resolution rejected by ${stateOfficer.profile.name}. ${comments || 'Please review and resubmit.'}`,
                updatedAt: new Date()
            });
        }

        await complaint.save();

        return NextResponse.json({
            message: approved ? 'Complaint closed successfully' : 'Resolution rejected',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status
            }
        });

    } catch (error) {
        console.error('Error verifying resolution:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
