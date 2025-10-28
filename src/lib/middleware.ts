import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/auth';
import { UserType } from '@/models/interfaces';
// Authenticated Request Interface
export interface AuthenticatedRequest extends NextRequest {
    user?: JWTPayload;
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return async (req: AuthenticatedRequest): Promise<NextResponse> => {
        try {
            const authHeader = req.headers.get('authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'No valid authorization token provided' }, { status: 401 });
            }

            const token = authHeader.substring(7);
            const user = verifyToken(token);

            if (!user) {
                return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
            }

            req.user = user;
            return await handler(req);
        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
    };
}

export function withRole(allowedRoles: UserType[]) {
    return function (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
        return withAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
            if (!req.user || !allowedRoles.includes(req.user.userType)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }

            return await handler(req);
        });
    };
}

export function withGovernmentRole(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withRole([UserType.GOVERNMENT_OFFICER, UserType.ADMIN])(handler);
}

export function withAdminRole(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return withRole([UserType.ADMIN])(handler);
}
