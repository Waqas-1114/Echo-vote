import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { User } from '@/models/User';
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

        // Get officer details
        const officer = await User.findById(user.userId).populate('governmentDetails.jurisdiction');
        if (!officer) {
            return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
        }

        // Find all complaints in the same jurisdiction
        const complaints = await Complaint.find({
            'assignedTo.division': officer.governmentDetails.jurisdiction._id
        })
            .populate('assignedTo.division', 'name level')
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation governmentDetails.employeeId')
            .sort({ createdAt: -1 });

        // Map complaints with assigned officer info
        const areaComplaints = complaints.map(complaint => {
            const assignedOfficer = complaint.assignedTo.officers && complaint.assignedTo.officers.length > 0
                ? complaint.assignedTo.officers[0]
                : null;

            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                department: complaint.assignedTo.department,
                assignedOfficer: assignedOfficer ? assignedOfficer.profile.name : 'Unassigned',
                designation: assignedOfficer ? assignedOfficer.governmentDetails.designation : 'N/A',
                daysOpen
            };
        });

        return NextResponse.json({
            complaints: areaComplaints
        });

    } catch (error) {
        console.error('Error fetching area complaints:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
