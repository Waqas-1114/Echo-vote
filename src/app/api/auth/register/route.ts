import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { hashPassword, generateToken, generateAnonymousId } from '@/lib/auth';
import { UserType } from '@/models/interfaces';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const { email, password, userType, profile, governmentDetails } = await req.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists with this email' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Prepare user data
        const userData: any = {
            email: email.toLowerCase(),
            password: hashedPassword,
            userType: userType || UserType.CITIZEN,
            profile: {
                name: profile?.name,
                phone: profile?.phone,
                address: profile?.address,
            },
            isActive: true,
        };

        // Handle government officer registration
        if (userType === UserType.GOVERNMENT_OFFICER && governmentDetails) {
            userData.governmentDetails = {
                employeeId: governmentDetails.employeeId,
                department: governmentDetails.department,
                designation: governmentDetails.designation,
                adminLevel: governmentDetails.adminLevel,
                jurisdiction: governmentDetails.jurisdiction,
                isVerified: false, // Requires admin verification
                verificationDocuments: governmentDetails.verificationDocuments || [],
            };
        }

        // Handle anonymous users
        if (profile?.isAnonymous) {
            userData.isAnonymous = true;
            userData.anonymousId = generateAnonymousId();
        }

        // Create user
        const user = new User(userData);
        await user.save();

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
                ...user.governmentDetails,
                isVerified: user.governmentDetails.isVerified,
            } : undefined,
        };

        return NextResponse.json({
            message: userType === UserType.GOVERNMENT_OFFICER
                ? 'Registration successful. Your account will be verified by admin.'
                : 'Registration successful',
            user: userResponse,
            token,
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
