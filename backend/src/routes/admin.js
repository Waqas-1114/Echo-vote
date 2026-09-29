import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { fromUser, getSupabase, getUserById, resolveJurisdiction, toUser, unwrap, USER_WITH_JURISDICTION } from '../lib/db.js';
import { AdminLevel, UserType } from '../lib/constants.js';
import { seedDatabase } from '../scripts/seedDatabase.js';
import { seedOfficersAndComplaints } from '../scripts/seedOfficers.js';

const router = Router();

// POST /api/admin/seed
router.post('/seed', requireAdmin, async (req, res) => {
    try {
        const { force } = req.body;

        if (!force) {
            return res.status(400).json({ error: 'This operation will replace all administrative data. Set force: true to proceed.' });
        }

        await seedDatabase();

        return res.json({
            message: 'Database seeded successfully',
        });
    } catch (error) {
        console.error('Seed database error:', error);
        return res
            .status(500)
            .json({ error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// POST /api/admin/seed-officers
router.post('/seed-officers', requireAdmin, async (req, res) => {
    try {
        const result = await seedOfficersAndComplaints();

        return res.status(200).json({
            message: 'Seed data created successfully',
            ...result,
        });
    } catch (error) {
        console.error('Seeding error:', error);
        return res.status(500).json({ error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

const OFFICER_LEVELS = [AdminLevel.STATE, AdminLevel.DISTRICT, AdminLevel.BLOCK];

/** The fields the admin screen needs; never the password hash. */
function toOfficerSummary(user) {
    const details = user.governmentDetails || {};
    return {
        id: user._id,
        name: user.profile.name,
        email: user.email,
        phone: user.profile.phone,
        address: user.profile.address,
        employeeId: details.employeeId,
        department: details.department,
        designation: details.designation,
        adminLevel: details.adminLevel,
        isVerified: !!details.isVerified,
        isActive: user.isActive,
        jurisdiction: details.jurisdiction?.name ? { name: details.jurisdiction.name, level: details.jurisdiction.level } : null,
        createdAt: user.createdAt,
    };
}

// GET /api/admin/officers?status=pending|verified|all
router.get('/officers', requireAdmin, async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        let query = getSupabase()
            .from('users')
            .select(USER_WITH_JURISDICTION)
            .eq('user_type', UserType.GOVERNMENT_OFFICER)
            .order('created_at', { ascending: false });
        if (status === 'pending') query = query.eq('is_active', true).eq('government_details->>isVerified', 'false');
        if (status === 'verified') query = query.eq('government_details->>isVerified', 'true');

        const officers = unwrap(await query).map(toUser).map(toOfficerSummary);
        return res.json({ officers });
    } catch (error) {
        console.error('Error listing officers:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/officers/:id/verify  { adminLevel? }
// Confirms the officer's level and assigns the jurisdiction matching their address.
router.post('/officers/:id/verify', requireAdmin, async (req, res) => {
    try {
        const officer = await getUserById(req.params.id);
        if (!officer || officer.userType !== UserType.GOVERNMENT_OFFICER) {
            return res.status(404).json({ error: 'Officer not found' });
        }

        const adminLevel = req.body.adminLevel || officer.governmentDetails?.adminLevel;
        if (!OFFICER_LEVELS.includes(adminLevel)) {
            return res.status(400).json({ error: 'Choose a valid administrative level (state, district or block)' });
        }

        const jurisdiction = await resolveJurisdiction(officer.profile.address, adminLevel);
        if (!jurisdiction) {
            return res.status(400).json({
                error: `No ${adminLevel} division matches this officer's address. Check their state/district${adminLevel === AdminLevel.BLOCK ? '/block' : ''}.`,
            });
        }

        officer.governmentDetails = { ...officer.governmentDetails, adminLevel, isVerified: true, jurisdiction: jurisdiction._id };
        officer.isActive = true;
        const { government_details, jurisdiction_id, is_active } = fromUser(officer);
        const row = unwrap(
            await getSupabase()
                .from('users')
                .update({ government_details, jurisdiction_id, is_active })
                .eq('id', officer._id)
                .select(USER_WITH_JURISDICTION)
                .single()
        );

        return res.json({ message: 'Officer verified', officer: toOfficerSummary(toUser(row)) });
    } catch (error) {
        console.error('Error verifying officer:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/officers/:id/reject
// Deactivates the account so it can no longer log in.
router.post('/officers/:id/reject', requireAdmin, async (req, res) => {
    try {
        const officer = await getUserById(req.params.id);
        if (!officer || officer.userType !== UserType.GOVERNMENT_OFFICER) {
            return res.status(404).json({ error: 'Officer not found' });
        }
        unwrap(await getSupabase().from('users').update({ is_active: false }).eq('id', officer._id));
        return res.json({ message: 'Officer registration rejected' });
    } catch (error) {
        console.error('Error rejecting officer:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
