import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdministrativeDivision } from '@/models/AdministrativeDivision';
import { AdminLevel } from '@/models/interfaces';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const level = searchParams.get('level');
        const state = searchParams.get('state');
        const district = searchParams.get('district');
        const parentId = searchParams.get('parentId');

        let query: any = { isActive: true };

        if (level) {
            query.level = level;
        }

        if (state) {
            query.state = state;
        }

        if (district) {
            query.district = district;
        }

        if (parentId) {
            query.parentId = parentId;
        }

        const divisions = await AdministrativeDivision.find(query)
            .select('name code level state district departments parentId')
            .sort({ name: 1 });

        return NextResponse.json({
            divisions,
        });

    } catch (error) {
        console.error('Get administrative divisions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get hierarchy for a specific location
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const { state, district } = await req.json();

        if (!state) {
            return NextResponse.json(
                { error: 'State is required' },
                { status: 400 }
            );
        }

        // Get state
        const stateDiv = await AdministrativeDivision.findOne({
            state,
            level: AdminLevel.STATE,
            isActive: true,
        });

        if (!stateDiv) {
            return NextResponse.json(
                { error: 'State not found' },
                { status: 404 }
            );
        }

        const hierarchy: any = {
            state: stateDiv,
            districts: [],
        };

        // Get districts
        const districts = await AdministrativeDivision.find({
            state,
            level: AdminLevel.DISTRICT,
            isActive: true,
        }).sort({ name: 1 });

        hierarchy.districts = districts;

        // If specific district requested, get its subdivisions
        if (district) {
            const districtDiv = districts.find(d => d.district === district);
            if (districtDiv) {
                const blocks = await AdministrativeDivision.find({
                    parentId: districtDiv._id,
                    level: AdminLevel.BLOCK,
                    isActive: true,
                }).sort({ name: 1 });

                hierarchy.blocks = blocks;

                // Get panchayats for the blocks
                if (blocks.length > 0) {
                    const panchayats = await AdministrativeDivision.find({
                        parentId: { $in: blocks.map(b => b._id) },
                        level: AdminLevel.PANCHAYAT,
                        isActive: true,
                    }).sort({ name: 1 });

                    hierarchy.panchayats = panchayats;
                }
            }
        }

        return NextResponse.json({
            hierarchy,
        });

    } catch (error) {
        console.error('Get administrative hierarchy error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
