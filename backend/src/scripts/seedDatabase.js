import { pathToFileURL } from 'node:url';
import { getSupabase, unwrap } from '../lib/db.js';
import { getAllStatesAndUTs } from '../data/indian-administrative-data.js';
import { AdminLevel, DEPARTMENTS } from '../lib/constants.js';

const allDepartments = [...DEPARTMENTS];

/**
 * Upserts divisions by their unique code, in chunks, and returns a
 * code -> id map. Upserting keeps ids stable across re-seeds, so users and
 * complaints that reference a division stay valid.
 */
async function upsertDivisions(rows) {
    const ids = new Map();
    for (let i = 0; i < rows.length; i += 500) {
        const saved = unwrap(
            await getSupabase()
                .from('administrative_divisions')
                .upsert(rows.slice(i, i + 500), { onConflict: 'code' })
                .select('id, code')
        );
        for (const row of saved) ids.set(row.code, row.id);
    }
    return ids;
}

async function countLevel(level) {
    const { count, error } = await getSupabase()
        .from('administrative_divisions')
        .select('id', { count: 'exact', head: true })
        .eq('level', level);
    if (error) throw error;
    return count;
}

export async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

        const statesAndUTs = getAllStatesAndUTs();

        // States / UTs
        console.log(`Seeding ${statesAndUTs.length} states and union territories...`);
        const stateIds = await upsertDivisions(
            statesAndUTs.map((stateData) => ({
                name: stateData.name,
                code: stateData.code,
                level: AdminLevel.STATE,
                state: stateData.name,
                departments: allDepartments,
                is_active: true,
            }))
        );

        // Districts, plus sample blocks for the first 3 districts of each state
        const districtRows = [];
        const blockSeeds = [];
        for (const stateData of statesAndUTs) {
            (stateData.districts || []).forEach((districtName, index) => {
                const code = `${stateData.code}_${districtName.substring(0, 3).toUpperCase()}${index.toString().padStart(2, '0')}`;
                districtRows.push({
                    name: districtName,
                    code,
                    level: AdminLevel.DISTRICT,
                    parent_id: stateIds.get(stateData.code),
                    state: stateData.name,
                    district: districtName,
                    departments: allDepartments,
                    is_active: true,
                });

                if (index < 3) {
                    for (let blockIndex = 0; blockIndex < 3; blockIndex++) {
                        blockSeeds.push({ stateData, districtName, districtCode: code, blockIndex });
                    }
                }
            });
        }

        console.log(`Seeding ${districtRows.length} districts...`);
        const districtIds = await upsertDivisions(districtRows);

        // Blocks
        const blockRows = blockSeeds.map(({ stateData, districtName, districtCode, blockIndex }) => ({
            name: `${districtName} Block ${blockIndex + 1}`,
            code: `${districtCode}_BLK${(blockIndex + 1).toString().padStart(2, '0')}`,
            level: AdminLevel.BLOCK,
            parent_id: districtIds.get(districtCode),
            state: stateData.name,
            district: districtName,
            departments: ['Public Works Department', 'Water Supply Department', 'Electricity Department', 'Health Department', 'Education Department'], // Fewer departments at block level
            is_active: true,
        }));

        console.log(`Seeding ${blockRows.length} blocks...`);
        const blockIds = await upsertDivisions(blockRows);

        // Sample panchayats for each block
        const panchayatRows = blockRows.flatMap((block) =>
            Array.from({ length: 2 }, (_, panchayatIndex) => ({
                name: `${block.name} Panchayat ${panchayatIndex + 1}`,
                code: `${block.code}_PAN${(panchayatIndex + 1).toString().padStart(2, '0')}`,
                level: AdminLevel.PANCHAYAT,
                parent_id: blockIds.get(block.code),
                state: block.state,
                district: block.district,
                departments: ['Public Works Department', 'Health Department', 'Education Department'],
                is_active: true,
            }))
        );

        console.log(`Seeding ${panchayatRows.length} panchayats...`);
        await upsertDivisions(panchayatRows);

        console.log('Database seeding completed successfully!');

        // Print summary
        const [totalStates, totalDistricts, totalBlocks, totalPanchayats] = await Promise.all(
            [AdminLevel.STATE, AdminLevel.DISTRICT, AdminLevel.BLOCK, AdminLevel.PANCHAYAT].map(countLevel)
        );

        console.log(`
    Seeding Summary:
    - States/UTs: ${totalStates}
    - Districts: ${totalDistricts}
    - Blocks: ${totalBlocks}
    - Panchayats: ${totalPanchayats}
    `);
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
}

// Run seeding if this file is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    seedDatabase()
        .then(() => {
            console.log('Seeding process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding process failed:', error);
            process.exit(1);
        });
}
