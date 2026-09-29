import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

export const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export const generateAnonymousId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `anon_${timestamp}_${random}`;
};

export const generateTicketNumber = (state, district) => {
    const timestamp = Date.now();
    const stateCode = state.substring(0, 2).toUpperCase();
    const districtCode = district.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `EV${stateCode}${districtCode}${timestamp}${random}`;
};
