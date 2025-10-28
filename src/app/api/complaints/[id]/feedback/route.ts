import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { User } from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { ComplaintStatus } from '@/models/interfaces';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        // Ensure models are registered
        User;

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
        const { rating, comments } = await req.json();

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }

        if (!comments || comments.trim().length === 0) {
            return NextResponse.json({ error: 'Feedback comments are required' }, { status: 400 });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Check if user is the owner
        const isOwner = complaint.submittedBy.userId?.toString() === user.userId ||
            complaint.submittedBy.anonymousId === user.userId;

        if (!isOwner) {
            return NextResponse.json({ error: 'Only the complaint owner can provide feedback' }, { status: 403 });
        }

        // Check if complaint is closed
        if (complaint.status !== ComplaintStatus.CLOSED) {
            return NextResponse.json({ error: 'Feedback can only be provided for closed complaints' }, { status: 400 });
        }

        // Add feedback to complaint
        if (!complaint.feedback) {
            complaint.feedback = {
                rating,
                comments,
                submittedAt: new Date()
            };
        } else {
            // Update existing feedback
            complaint.feedback.rating = rating;
            complaint.feedback.comments = comments;
            complaint.feedback.submittedAt = new Date();
        }

        await complaint.save();

        return NextResponse.json({
            message: 'Feedback submitted successfully',
            feedback: complaint.feedback
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
