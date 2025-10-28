import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

        const officer = await User.findById(user.userId)
            .populate('governmentDetails.jurisdiction');

        if (!officer) {
            return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
        }

        return NextResponse.json({
            profile: {
                name: officer.profile.name,
                designation: officer.governmentDetails.designation,
                department: officer.governmentDetails.department,
                employeeId: officer.governmentDetails.employeeId,
                adminLevel: officer.governmentDetails.adminLevel,
                jurisdiction: {
                    name: officer.governmentDetails.jurisdiction.name,
                    level: officer.governmentDetails.jurisdiction.level
                }
            }
        });

    } catch (error) {
        console.error('Error fetching officer profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
