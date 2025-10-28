import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Complaint } from "@/models/Complaint";
import { verifyToken } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Unauthorized. Only government officers can assign complaints.' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = await params;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    // Add officer to assigned officers list if not already assigned
    if (!complaint.assignedTo.officers) {
      complaint.assignedTo.officers = [];
    }
    
    if (!complaint.assignedTo.officers.includes(decoded.userId)) {
      complaint.assignedTo.officers.push(decoded.userId);
    }
    
    complaint.status = 'in_progress';
    await complaint.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Complaint assigned successfully',
      complaint 
    });
  } catch (error) {
    console.error('Error assigning complaint:', error);
    return NextResponse.json(
      { error: 'Failed to assign complaint' },
      { status: 500 }
    );
  }
}
