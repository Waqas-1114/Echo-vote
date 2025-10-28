import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // Get tokens from Authorization header
        const authorization = req.headers.get('authorization');
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authorization token required' },
                { status: 401 }
            );
        }

        const token = authorization.substring(7);
        const payload = verifyToken(token);

        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Find complaints for a user
        let complaints;
        if (payload.isAnonymous && payload.userId) {
            // For anonymous users, find by anonymousId
            const user = await import('@/models/User').then(m => m.User);
            const userData = await user.findById(payload.userId);
            if (!userData?.anonymousId) {
                return NextResponse.json(
                    { error: 'Anonymous user data not found' },
                    { status: 404 }
                );
            }

            complaints = await Complaint.find({
                'submittedBy.anonymousId': userData.anonymousId
            }).sort({ createdAt: -1 });
        } else {
            // For registered users, find by userId
            complaints = await Complaint.find({
                'submittedBy.userId': payload.userId
            }).sort({ createdAt: -1 });
        }

        return NextResponse.json({
            complaints,
            total: complaints.length
        });

    } catch (error) {
        console.error('Error fetching user complaints:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
