import dbConnect from '@/lib/mongodb';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { getAllStatesAndUTs, commonDepartments } from '@/data/indian-administrative-data';
import { AdminLevel } from '@/models/interfaces';

export async function seedDatabase() {
    try {
        await dbConnect();

        console.log('Starting database seeding...');

        // Clear existing data
        await AdministrativeDivision.deleteMany({});

        const statesAndUTs = getAllStatesAndUTs();

        for (const stateData of statesAndUTs) {
            console.log(`Seeding ${stateData.name}...`);

            // Create state/UT record
            const state = new AdministrativeDivision({
                name: stateData.name,
                code: stateData.code,
                level: AdminLevel.STATE,
                state: stateData.name,
                departments: commonDepartments.map(dept => dept.name),
                isActive: true
            });

            await state.save();

            // Create districts for this state
            if (stateData.districts && stateData.districts.length > 0) {
                const districtPromises = stateData.districts.map(async (districtName, index) => {
                    const district = new AdministrativeDivision({
                        name: districtName,
                        code: `${stateData.code}_${districtName.substring(0, 3).toUpperCase()}${index.toString().padStart(2, '0')}`,
                        level: AdminLevel.DISTRICT,
                        parentId: state._id,
                        state: stateData.name,
                        district: districtName,
                        departments: commonDepartments.map(dept => dept.name),
                        isActive: true
                    });

                    await district.save();

                    // Add district to state's children
                    state.children = state.children || [];
                    state.children.push(district._id);

                    // Create sample blocks for major districts (first 3 districts of each state)
                    if (index < 3) {
                        const blockPromises = Array.from({ length: 3 }, async (_, blockIndex) => {
                            const blockName = `${districtName} Block ${blockIndex + 1}`;
                            const block = new AdministrativeDivision({
                                name: blockName,
                                code: `${district.code}_BLK${(blockIndex + 1).toString().padStart(2, '0')}`,
                                level: AdminLevel.BLOCK,
                                parentId: district._id,
                                state: stateData.name,
                                district: districtName,
                                departments: commonDepartments.slice(0, 5).map(dept => dept.name), // Fewer departments at block level
                                isActive: true
                            });

                            await block.save();

                            // Add block to district's children
                            district.children = district.children || [];
                            district.children.push(block._id);

                            // Create sample panchayats/wards for each block
                            const panchayatPromises = Array.from({ length: 2 }, async (_, panchayatIndex) => {
                                const panchayatName = `${blockName} Panchayat ${panchayatIndex + 1}`;
                                const panchayat = new AdministrativeDivision({
                                    name: panchayatName,
                                    code: `${block.code}_PAN${(panchayatIndex + 1).toString().padStart(2, '0')}`,
                                    level: AdminLevel.PANCHAYAT,
                                    parentId: block._id,
                                    state: stateData.name,
                                    district: districtName,
                                    departments: ['Public Works Department (PWD)', 'Health Department', 'Education Department'],
                                    isActive: true
                                });

                                await panchayat.save();

                                // Add panchayat to block's children
                                block.children = block.children || [];
                                block.children.push(panchayat._id);

                                return panchayat;
                            });

                            await Promise.all(panchayatPromises);
                            await block.save();

                            return block;
                        });

                        await Promise.all(blockPromises);
                    }

                    await district.save();
                    return district;
                });

                await Promise.all(districtPromises);
                await state.save();
            }
        }

        console.log('Database seeding completed successfully!');

        // Print summary
        const totalStates = await AdministrativeDivision.countDocuments({ level: AdminLevel.STATE });
        const totalDistricts = await AdministrativeDivision.countDocuments({ level: AdminLevel.DISTRICT });
        const totalBlocks = await AdministrativeDivision.countDocuments({ level: AdminLevel.BLOCK });
        const totalPanchayats = await AdministrativeDivision.countDocuments({ level: AdminLevel.PANCHAYAT });

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
if (require.main === module) {
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
