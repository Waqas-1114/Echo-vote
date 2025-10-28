import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Complaint } from '@/models/Complaint';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { verifyToken } from '@/lib/auth';
import { AdminLevel, ComplaintStatus } from '@/models/interfaces';

export async function POST(req: NextRequest) {
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

        const body = await req.json();
        console.log('📥 Received assignment request body:', body);

        const { complaintId, officerId, deadline, instructions } = body;

        console.log('🔍 Extracted values:', {
            complaintId,
            officerId,
            hasComplaintId: !!complaintId,
            hasOfficerId: !!officerId,
            complaintIdType: typeof complaintId,
            officerIdType: typeof officerId
        });

        if (!complaintId || !officerId) {
            console.log('❌ Validation failed - missing IDs');
            return NextResponse.json({ error: 'Complaint ID and Officer ID are required' }, { status: 400 });
        }

        // Get state officer
        const stateOfficer = await User.findById(user.userId);
        if (!stateOfficer || stateOfficer.governmentDetails.adminLevel !== AdminLevel.STATE) {
            return NextResponse.json({ error: 'Only state officers can assign complaints' }, { status: 403 });
        }

        // Get complaint
        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Verify complaint is in the state officer's jurisdiction
        const isInJurisdiction =
            complaint.location.state === stateOfficer.profile.address.state &&
            complaint.assignedTo.department === stateOfficer.governmentDetails.department;

        if (!isInJurisdiction) {
            return NextResponse.json({ error: 'This complaint is not in your jurisdiction' }, { status: 403 });
        }

        // Get district officer
        const districtOfficer = await User.findById(officerId);
        if (!districtOfficer || districtOfficer.governmentDetails.adminLevel !== AdminLevel.DISTRICT) {
            return NextResponse.json({ error: 'Invalid district officer' }, { status: 400 });
        }

        // Find district jurisdiction
        const districtJurisdiction = await AdministrativeDivision.findOne({
            state: complaint.location.state,
            district: complaint.location.district,
            level: AdminLevel.DISTRICT,
            isActive: true
        });

        // Update complaint
        complaint.assignedTo.division = districtJurisdiction ? districtJurisdiction._id : complaint.assignedTo.division;
        complaint.assignedTo.officers = [districtOfficer._id]; // Replace state officer with district officer
        complaint.status = ComplaintStatus.ACKNOWLEDGED;

        if (deadline) {
            complaint.dueDate = new Date(deadline);
        }

        // Add to escalation history (tracking the assignment flow)
        complaint.escalationHistory.push({
            fromDivision: stateOfficer.governmentDetails.jurisdiction,
            toDivision: districtOfficer.governmentDetails.jurisdiction,
            reason: instructions || 'Assigned by state officer to district officer for resolution',
            escalatedBy: user.userId,
            escalatedAt: new Date()
        });

        // Add status update
        complaint.statusHistory.push({
            status: ComplaintStatus.ACKNOWLEDGED,
            updatedBy: user.userId,
            comments: `Assigned to ${districtOfficer.profile.name} (${districtOfficer.governmentDetails.designation}) - ${districtOfficer.governmentDetails.employeeId}. ${instructions || ''}`,
            updatedAt: new Date()
        });

        await complaint.save();

        return NextResponse.json({
            message: 'Complaint assigned successfully',
            complaint: {
                id: complaint._id,
                ticketNumber: complaint.ticketNumber,
                assignedTo: {
                    name: districtOfficer.profile.name,
                    designation: districtOfficer.governmentDetails.designation,
                    employeeId: districtOfficer.governmentDetails.employeeId
                },
                deadline: complaint.dueDate
            }
        });

    } catch (error) {
        console.error('Error assigning complaint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
