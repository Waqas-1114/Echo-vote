import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Complaint } from '@/models/Complaint';
import { User } from '@/models/User';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { verifyToken } from '@/lib/auth';
import { AdminLevel } from '@/models/interfaces';

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
        const officer = await User.findById(user.userId);
        if (!officer) {
            return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
        }

        // Find subordinates (officers with lower admin level in the same jurisdiction and department)
        const subordinateLevels: Record<string, string[]> = {
            [AdminLevel.STATE]: [AdminLevel.DISTRICT, AdminLevel.BLOCK, AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.DISTRICT]: [AdminLevel.BLOCK, AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.BLOCK]: [AdminLevel.PANCHAYAT, AdminLevel.WARD],
            [AdminLevel.PANCHAYAT]: [AdminLevel.WARD],
            [AdminLevel.WARD]: []
        };

        const allowedLevels = subordinateLevels[officer.governmentDetails.adminLevel] || [];

        const subordinates = await User.find({
            'governmentDetails.department': officer.governmentDetails.department,
            'governmentDetails.adminLevel': { $in: allowedLevels },
            'governmentDetails.jurisdiction': officer.governmentDetails.jurisdiction,
            userType: 'government_officer'
        });

        const subordinateIds = subordinates.map(s => s._id);

        // Find complaints assigned to subordinates
        const complaints = await Complaint.find({
            'assignedTo.officers': { $in: subordinateIds }
        })
            .populate('assignedTo.division', 'name level')
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation governmentDetails.employeeId')
            .sort({ updatedAt: -1 });

        // Map to subordinate tasks
        const tasks = complaints.map(complaint => {
            const assignedSubordinate = complaint.assignedTo.officers.find((o: any) =>
                subordinateIds.some(id => id.toString() === o._id.toString())
            );

            if (!assignedSubordinate) return null;

            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            const lastStatusUpdate = complaint.statusHistory && complaint.statusHistory.length > 0
                ? complaint.statusHistory[complaint.statusHistory.length - 1]
                : null;

            return {
                complaint: {
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
                },
                subordinate: {
                    name: assignedSubordinate.profile.name,
                    designation: assignedSubordinate.governmentDetails.designation,
                    employeeId: assignedSubordinate.governmentDetails.employeeId
                },
                assignedDate: complaint.createdAt,
                lastUpdate: complaint.updatedAt,
                progress: lastStatusUpdate ? lastStatusUpdate.comments : 'No updates yet'
            };
        }).filter(task => task !== null);

        return NextResponse.json({
            tasks
        });

    } catch (error) {
        console.error('Error fetching subordinate tasks:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
