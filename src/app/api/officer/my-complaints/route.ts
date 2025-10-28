import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // Ensure AdministrativeDivision model is registered
        AdministrativeDivision;

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user || user.userType !== 'government_officer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Find complaints assigned to this officer
        const complaints = await Complaint.find({
            'assignedTo.officers': user.userId
        })
            .populate('assignedTo.division', 'name level')
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation')
            .sort({ createdAt: -1 });

        // Calculate days open for each complaint
        const complaintsWithDays = complaints.map(complaint => {
            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedTo: complaint.assignedTo,
                submittedBy: complaint.submittedBy,
                publicSupport: complaint.publicSupport,
                createdAt: complaint.createdAt,
                updatedAt: complaint.updatedAt,
                daysOpen
            };
        });

        return NextResponse.json({
            complaints: complaintsWithDays
        });

    } catch (error) {
        console.error('Error fetching officer complaints:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
