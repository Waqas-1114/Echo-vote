import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.userType !== 'government_officer') {
      return NextResponse.json(
        { error: 'Unauthorized. Only officers can access this endpoint.' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Fetch officer details to get jurisdiction
    const officer = await User.findById(decoded.userId).lean();
    
    if (!officer || !officer.profile?.address) {
      return NextResponse.json(
        { error: 'Officer profile not complete' },
        { status: 400 }
      );
    }

    // Fetch complaints in officer's jurisdiction that are not fully assigned
    const complaints = await Complaint.find({
      'location.state': officer.profile.address.state,
      'location.district': officer.profile.address.district,
      status: { $in: ['submitted', 'acknowledged', 'in_progress'] },
      'assignedTo.officers': { $nin: [decoded.userId] } // Not assigned to this officer yet
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ 
      success: true, 
      complaints
    });
  } catch (error) {
    console.error('Error fetching jurisdiction complaints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}
