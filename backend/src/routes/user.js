import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserById, withoutPassword } from '../lib/db.js';

const router = Router();

// GET /api/user/profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const decoded = req.user;

        const user = withoutPassword(await getUserById(decoded.userId, { withJurisdiction: true }));

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
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
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;
