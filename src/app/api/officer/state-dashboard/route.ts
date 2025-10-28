import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { Complaint } from '@/models/Complaint';
import { verifyToken } from '@/lib/auth';
import { AdminLevel, ComplaintStatus } from '@/models/interfaces';

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

        // Get current officer
        const officer = await User.findById(user.userId).populate('governmentDetails.jurisdiction');
        if (!officer || officer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return NextResponse.json({ error: 'Only state level officers can access this' }, { status: 403 });
        }

        // 1. Get FREE district officers (same department, same state, not currently assigned)
        const districtOfficers = await User.find({
            'governmentDetails.adminLevel': AdminLevel.DISTRICT,
            'governmentDetails.department': officer.governmentDetails.department,
            'profile.address.state': officer.profile.address.state,
            'governmentDetails.isVerified': true,
            userType: 'government_officer',
            isActive: true
        });

        // Get all complaints assigned to district officers to calculate workload
        const allComplaints = await Complaint.find({
            'assignedTo.department': officer.governmentDetails.department,
            'location.state': officer.profile.address.state,
            status: { $nin: ['resolved', 'closed', 'rejected'] }
        });

        // Calculate workload for each district officer
        const officerWorkload = districtOfficers.map(districtOfficer => {
            const assignedComplaints = allComplaints.filter(complaint =>
                complaint.assignedTo.officers.some((id: any) => id.toString() === districtOfficer._id.toString())
            );

            return {
                id: districtOfficer._id.toString(),
                name: districtOfficer.profile.name,
                designation: districtOfficer.governmentDetails.designation,
                employeeId: districtOfficer.governmentDetails.employeeId,
                district: districtOfficer.profile.address.district,
                phone: districtOfficer.profile.phone,
                activeComplaints: assignedComplaints.length,
                isFree: assignedComplaints.length < 5, // Consider free if less than 5 active complaints
                lastAssigned: assignedComplaints.length > 0
                    ? assignedComplaints[assignedComplaints.length - 1].createdAt
                    : null
            };
        });

        // 2. Get UNASSIGNED complaints (complaints in the state that haven't been assigned to district officers)
        const unassignedComplaints = await Complaint.find({
            'assignedTo.department': officer.governmentDetails.department,
            'location.state': officer.profile.address.state,
            $or: [
                { 'assignedTo.officers': { $size: 0 } }, // No officers assigned
                { 'assignedTo.officers': officer._id, status: 'submitted' } // Assigned to state officer but not delegated
            ]
        }).sort({ priority: -1, createdAt: 1 });

        const unassignedList = unassignedComplaints.map(complaint => {
            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                priority: complaint.priority,
                status: complaint.status,
                location: complaint.location,
                publicSupport: complaint.publicSupport,
                submittedAt: complaint.createdAt,
                createdAt: complaint.createdAt,
                daysOpen
            };
        });

        // 3. Get ASSIGNED complaints (delegated to district officers)
        const assignedComplaints = await Complaint.find({
            'assignedTo.department': officer.governmentDetails.department,
            'location.state': officer.profile.address.state,
            'assignedTo.officers': { $in: districtOfficers.map(o => o._id) },
            status: { $nin: ['resolved', 'closed'] }
        })
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation governmentDetails.employeeId profile.address.district')
            .sort({ updatedAt: -1 });

        const assignedList = assignedComplaints.map(complaint => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    _id: assignedOfficer._id,
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId,
                    district: assignedOfficer.profile.address.district
                },
                lastUpdate: complaint.updatedAt,
                daysOpen,
                proofCount: complaint.proofOfWork?.length || 0
            };
        });

        // 4. Get RESOLVED complaints awaiting verification
        const resolvedComplaints = await Complaint.find({
            'assignedTo.department': officer.governmentDetails.department,
            'location.state': officer.profile.address.state,
            status: ComplaintStatus.RESOLVED
        })
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation governmentDetails.employeeId')
            .sort({ updatedAt: -1 });

        const resolvedList = resolvedComplaints.map(complaint => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId
                },
                submittedAt: complaint.createdAt,
                daysOpen,
                proofOfWork: complaint.proofOfWork || []
            };
        });

        // 5. Get CLOSED complaints (recently closed within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const closedComplaints = await Complaint.find({
            'assignedTo.department': officer.governmentDetails.department,
            'location.state': officer.profile.address.state,
            status: ComplaintStatus.CLOSED,
            'resolution.closedAt': { $gte: thirtyDaysAgo }
        })
            .populate('assignedTo.officers', 'profile.name governmentDetails.designation governmentDetails.employeeId')
            .sort({ 'resolution.closedAt': -1 })
            .limit(20); // Limit to 20 most recent

        const closedList = closedComplaints.map(complaint => {
            const assignedOfficer = complaint.assignedTo.officers[0];
            const daysOpen = Math.floor(
                (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                _id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                title: complaint.title,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                location: complaint.location,
                assignedOfficer: {
                    name: assignedOfficer.profile.name,
                    designation: assignedOfficer.governmentDetails.designation,
                    employeeId: assignedOfficer.governmentDetails.employeeId
                },
                submittedAt: complaint.createdAt,
                daysOpen,
                proofCount: complaint.proofOfWork?.length || 0
            };
        });

        return NextResponse.json({
            officer: {
                name: officer.profile.name,
                designation: officer.governmentDetails.designation,
                employeeId: officer.governmentDetails.employeeId,
                department: officer.governmentDetails.department
            },
            freeOfficers: officerWorkload.filter(o => o.isFree),
            busyOfficers: officerWorkload.filter(o => !o.isFree),
            unassignedComplaints: unassignedList,
            assignedComplaints: assignedList,
            resolvedComplaints: resolvedList,
            closedComplaints: closedList,
            statistics: {
                totalDistrictOfficers: districtOfficers.length,
                freeOfficers: officerWorkload.filter(o => o.isFree).length,
                unassignedComplaints: unassignedList.length,
                assignedComplaints: assignedList.length,
                resolvedComplaints: resolvedList.length,
                closedComplaints: closedList.length
            }
        });

    } catch (error) {
        console.error('Error fetching state dashboard:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
