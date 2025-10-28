import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() }).populate('governmentDetails.jurisdiction');

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { error: 'Account is deactivated. Please contact support.' },
                { status: 403 }
            );
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Check government officer verification status
        /*if (user.userType === 'government_officer' && user.governmentDetails && !user.governmentDetails.isVerified) {
            return NextResponse.json(
                { error: 'Your account is pending verification. Please wait for admin approval.' },
                { status: 403 }
            );
        }*/

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            userType: user.userType,
            isAnonymous: user.isAnonymous,
        });

        // Return success response (exclude password)
        const userResponse = {
            id: user._id,
            email: user.email,
            userType: user.userType,
            profile: user.profile,
            isAnonymous: user.isAnonymous,
            anonymousId: user.anonymousId,
            governmentDetails: user.governmentDetails ? {
                employeeId: user.governmentDetails.employeeId,
                department: user.governmentDetails.department,
                designation: user.governmentDetails.designation,
                adminLevel: user.governmentDetails.adminLevel,
                jurisdiction: user.governmentDetails.jurisdiction,
                isVerified: user.governmentDetails.isVerified,
            } : undefined,
        };

        return NextResponse.json({
            message: 'Login successful',
            user: userResponse,
            token,
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
