import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';

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

        const { description, workDetails, photosUrls, progressPercentage } = await req.json();

        if (!description || !workDetails) {
            return NextResponse.json(
                { error: 'Description and work details are required' },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: 'This complaint is not assigned to you' },
                { status: 403 }
            );
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

        // Add work progress update
        complaint.proofOfWork.push({
            description,
            workDetails,
            photos: photosUrls || [],
            submittedBy: user.userId,
            submittedAt: new Date()
        });

        // Add to status history
        const progressInfo = progressPercentage ? ` (${progressPercentage}% complete)` : '';
        complaint.statusHistory.push({
            status: complaint.status,
            updatedBy: user.userId,
            comments: `Work progress update by ${officer.profile.name}${progressInfo}: ${description}`,
            updatedAt: new Date()
        });

        await complaint.save();

        return NextResponse.json({
            message: 'Work progress added successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                status: complaint.status,
                proofCount: complaint.proofOfWork.length
            }
        });

    } catch (error) {
        console.error('Error adding work progress:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
