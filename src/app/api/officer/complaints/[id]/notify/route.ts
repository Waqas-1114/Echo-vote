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

        const { message } = await req.json();
        const { id } = await params;

        if (!message) {
            return NextResponse.json({ error: 'Notification message is required' }, { status: 400 });
        }

        // Get officer details
        const officer = await User.findById(user.userId);
        if (!officer) {
            return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
        }

        // Get complaint
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
        }

        // Check authorization based on officer level
        const isAssigned = complaint.assignedTo.officers.some(
            (officerId: any) => officerId.toString() === user.userId
        );

        const isStateOfficer = officer.governmentDetails.adminLevel === AdminLevel.STATE;
        const isDistrictOfficer = officer.governmentDetails.adminLevel === AdminLevel.DISTRICT;

        // District officers can only notify during work progress (not after resolved)
        if (isDistrictOfficer && !isAssigned) {
            return NextResponse.json({
                error: 'This complaint is not assigned to you'
            }, { status: 403 });
        }

        if (isDistrictOfficer && complaint.status === ComplaintStatus.RESOLVED) {
            return NextResponse.json({
                error: 'District officers cannot send notifications after complaint is resolved. Wait for state officer verification.'
            }, { status: 403 });
        }

        // District officers can send final notification after state officer closes the complaint
        // This allows them to send courtesy messages after official closure

        // State officers can notify at any stage, but primarily after verification
        if (isStateOfficer && complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
            return NextResponse.json({
                error: 'State officers should notify citizens after verifying and closing complaints'
            }, { status: 403 });
        }

        // Add notification to status history
        complaint.statusHistory.push({
            status: complaint.status,
            updatedBy: officer._id,
            comments: `📢 Citizen Notification from ${officer.profile.name} (${officer.governmentDetails.designation}): ${message}`,
            updatedAt: new Date()
        });

        await complaint.save();

        return NextResponse.json({
            message: 'Notification sent to citizen successfully',
            notification: {
                from: officer.profile.name,
                role: officer.governmentDetails.designation,
                message,
                sentAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
