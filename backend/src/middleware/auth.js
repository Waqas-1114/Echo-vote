import { verifyToken } from '../lib/auth.js';
import { UserType } from '../lib/constants.js';

/** Returns the verified JWT payload from `Authorization: Bearer <token>`, or null. */
function readUser(req) {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    return verifyToken(header.substring(7));
}

/** Sets req.user when a valid token is sent; guests continue with req.user = null. */
export function optionalAuth(req, res, next) {
    req.user = readUser(req);
    next();
}

/** Rejects the request with 401 unless it carries a valid token. */
export function requireAuth(req, res, next) {
    const user = readUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    req.user = user;
    next();
}

/** Requires a valid token whose userType is one of `roles` (403 otherwise). */
export function requireRole(...roles) {
    return (req, res, next) =>
        requireAuth(req, res, () => {
            if (!roles.includes(req.user.userType)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            next();
        });
}

export const requireOfficer = requireRole(UserType.GOVERNMENT_OFFICER);
export const requireAdmin = requireRole(UserType.ADMIN);
