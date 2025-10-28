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

        const { description, workDetails, photosUrls, markAsResolved, estimatedCompletionDate } = await req.json();

        if (!description || !workDetails) {
            return NextResponse.json({ error: 'Description and work details are required' }, { status: 400 });
        }

        if (markAsResolved && (!photosUrls || photosUrls.length === 0)) {
            return NextResponse.json({
                error: 'At least one proof photo is required to mark complaint as resolved'
            }, { status: 400 });
        }

        const { id } = await params;

        // Get complaint
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Verify officer is assigned
        const isAssigned = complaint.assignedTo.officers.some(
            (officerId: any) => officerId.toString() === user.userId
        );

        if (!isAssigned) {
            return NextResponse.json({ error: 'This complaint is not assigned to you' }, { status: 403 });
        }

        // Get officer details
        const officer = await User.findById(user.userId);
        if (!officer) {
            return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
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
            submittedAt: new Date()
        });

        // If markAsResolved is true, update status and resolution details
        if (markAsResolved) {
            // Check if work was completed before deadline (if any)
            const isBeforeDeadline = !complaint.dueDate || new Date() <= complaint.dueDate;
            const deadlineStatus = complaint.dueDate
                ? (isBeforeDeadline ? ' (completed before deadline)' : ' (completed after deadline)')
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
                updatedAt: new Date()
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
                updatedAt: new Date()
            });
        }

        await complaint.save();

        return NextResponse.json({
            message: markAsResolved
                ? 'Complaint marked as resolved and submitted for verification'
                : 'Proof of work submitted successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
                proofCount: complaint.proofOfWork.length,
                requiresVerification: markAsResolved ? true : false
            }
        });

    } catch (error) {
        console.error('Error submitting proof:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
