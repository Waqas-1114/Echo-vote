import { Router } from 'express';
import { fetchAll, findDivision, getSupabase, toDivision, unwrap } from '../lib/db.js';
import { AdminLevel } from '../lib/constants.js';

const router = Router();

const divisions = () => getSupabase().from('administrative_divisions');

// Get hierarchy for a specific location

// GET /api/administrative-divisions
router.get('/', async (req, res) => {
    try {
        const { searchParams } = new URL(req.originalUrl, 'http://localhost');
        const level = searchParams.get('level');
        const state = searchParams.get('state');
        const district = searchParams.get('district');
        const parentId = searchParams.get('parentId');

        const rows = await fetchAll(() => {
            let query = divisions().select('id, name, code, level, state, district, departments, parent_id').eq('is_active', true);

            if (level) {
                query = query.eq('level', level);
            }

            if (state) {
                query = query.eq('state', state);
            }

            if (district) {
                query = query.eq('district', district);
            }

            if (parentId) {
                query = query.eq('parent_id', parentId);
            }

            return query.order('name').order('id');
        });

        return res.json({
            divisions: rows.map(toDivision),
        });
    } catch (error) {
        console.error('Get administrative divisions error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/administrative-divisions
router.post('/', async (req, res) => {
    try {
        const { state, district } = req.body;

        if (!state) {
            return res.status(400).json({ error: 'State is required' });
        }

        // Get state
        const stateDiv = await findDivision({
            state,
            level: AdminLevel.STATE,
            is_active: true,
        });

        if (!stateDiv) {
            return res.status(404).json({ error: 'State not found' });
        }

        const hierarchy = {
            state: stateDiv,
            districts: [],
        };

        // Get districts
        const districts = unwrap(
            await divisions().select('*').eq('state', state).eq('level', AdminLevel.DISTRICT).eq('is_active', true).order('name')
        ).map(toDivision);

        hierarchy.districts = districts;

        // If specific district requested, get its subdivisions
        if (district) {
            const districtDiv = districts.find((d) => d.district === district);
            if (districtDiv) {
                const blocks = unwrap(
                    await divisions()
                        .select('*')
                        .eq('parent_id', districtDiv._id)
                        .eq('level', AdminLevel.BLOCK)
                        .eq('is_active', true)
                        .order('name')
                ).map(toDivision);

                hierarchy.blocks = blocks;

                // Get panchayats for the blocks
                if (blocks.length > 0) {
                    const panchayats = unwrap(
                        await divisions()
                            .select('*')
                            .in(
                                'parent_id',
                                blocks.map((b) => b._id)
                            )
                            .eq('level', AdminLevel.PANCHAYAT)
                            .eq('is_active', true)
                            .order('name')
                    ).map(toDivision);

                    hierarchy.panchayats = panchayats;
                }
            }
        }

        return res.json({
            hierarchy,
        });
    } catch (error) {
        console.error('Get administrative hierarchy error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
