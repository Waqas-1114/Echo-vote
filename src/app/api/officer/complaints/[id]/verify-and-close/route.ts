import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { verifyToken } from '@/lib/auth';
import { ComplaintStatus, AdminLevel } from '@/models/interfaces';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        // Ensure models are registered
        AdministrativeDivision;
        User;

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user || user.userType !== 'government_officer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { verificationNotes, approved, notifyCitizen, notificationMessage } = await req.json();
        const { id } = await params;

        // Get state officer details
        const stateOfficer = await User.findById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return NextResponse.json({
                error: 'Only state level officers can verify and close complaints'
            }, { status: 403 });
        }

        // Get complaint
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Check if complaint is resolved
        if (complaint.status !== ComplaintStatus.RESOLVED) {
            return NextResponse.json({
                error: 'Only resolved complaints can be verified and closed'
            }, { status: 400 });
        }

        if (approved) {
            // Verify and close the complaint
            complaint.status = ComplaintStatus.CLOSED;
            complaint.resolution = {
                description: verificationNotes,
                resolvedBy: complaint.assignedTo.officers[0],
                resolvedAt: complaint.resolvedAt || new Date(),
                verificationRequired: false,
                verifiedBy: stateOfficer._id,
                verifiedAt: new Date()
            };

            complaint.statusHistory.push({
                status: ComplaintStatus.CLOSED,
                updatedBy: stateOfficer._id,
                comments: `Verified and closed by ${stateOfficer.profile.name}. ${verificationNotes}`,
                updatedAt: new Date()
            });

            // If state officer chooses to notify citizen
            if (notifyCitizen && notificationMessage) {
                // Add notification to status history
                complaint.statusHistory.push({
                    status: ComplaintStatus.CLOSED,
                    updatedBy: stateOfficer._id,
                    comments: `📢 Citizen Notification: ${notificationMessage}`,
                    updatedAt: new Date()
                });
            }

            await complaint.save();

            return NextResponse.json({
                message: 'Complaint verified and closed successfully',
                notificationSent: notifyCitizen,
                complaint: {
                    id: complaint._id,
                    ticketNumber: complaint.ticketNumber,
                    status: complaint.status,
                    verifiedBy: stateOfficer.profile.name,
                    verifiedAt: new Date()
                }
            });
        } else {
            // Reject the resolution - send back to district officer
            complaint.status = ComplaintStatus.IN_PROGRESS;
            complaint.statusHistory.push({
                status: ComplaintStatus.IN_PROGRESS,
                updatedBy: stateOfficer._id,
                comments: `Resolution rejected by ${stateOfficer.profile.name}. Reason: ${verificationNotes}. Please review and resubmit.`,
                updatedAt: new Date()
            });

            await complaint.save();

            return NextResponse.json({
                message: 'Resolution rejected. Complaint sent back to district officer.',
                complaint: {
                    id: complaint._id,
                    ticketNumber: complaint.ticketNumber,
                    status: complaint.status
                }
            });
        }

    } catch (error) {
        console.error('Error verifying complaint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
