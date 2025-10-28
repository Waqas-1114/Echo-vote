import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Complaint } from "@/models/Complaint";
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

    // Fetch complaints assigned to this officer
    const complaints = await Complaint.find({
      'assignedTo.officers': decoded.userId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate statistics
    const allAssigned = await Complaint.find({ 'assignedTo.officers': decoded.userId }).lean();
    
    const stats = {
      assigned: allAssigned.length,
      pending: allAssigned.filter(c => c.status === 'submitted').length,
      inProgress: allAssigned.filter(c => c.status === 'in_progress').length,
      resolved: allAssigned.filter(c => c.status === 'resolved').length,
    };

    return NextResponse.json({ 
      success: true, 
      complaints,
      stats
    });
  } catch (error) {
    console.error('Error fetching assigned complaints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}
