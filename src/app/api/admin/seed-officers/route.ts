import { NextRequest, NextResponse } from 'next/server';
import { seedOfficersAndComplaints } from '@/scripts/seedOfficers';

export async function POST(req: NextRequest) {
    try {
        const result = await seedOfficersAndComplaints();

        return NextResponse.json({
            message: 'Seed data created successfully',
            ...result
        }, { status: 200 });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json(
            { error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
