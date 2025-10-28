import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserType } from '@/models/interfaces';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

export interface JWTPayload {
    userId: string;
    email: string;
    userType: UserType;
    isAnonymous?: boolean;
}

export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JWTPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        return null;
    }
};

export const generateAnonymousId = (): string => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `anon_${timestamp}_${random}`;
};

export const generateTicketNumber = (state: string, district: string): string => {
    const timestamp = Date.now();
    const stateCode = state.substring(0, 2).toUpperCase();
    const districtCode = district.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `EV${stateCode}${districtCode}${timestamp}${random}`;
};
