import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { AdministrativeDivision } from "@/models/AdministrativeDivision";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Ensure AdministrativeDivision model is registered
    AdministrativeDivision;
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('governmentDetails.jurisdiction')
      .lean() as any;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: user._id,
      email: user.email,
      userType: user.userType,
      profile: user.profile,
      isAnonymous: user.isAnonymous,
      anonymousId: user.anonymousId,
      governmentDetails: user.governmentDetails,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
