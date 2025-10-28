import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/scripts/seedDatabase';

export async function POST(req: NextRequest) {
    try {
        // In production, you might want to add authentication/authorization
        const { force } = await req.json();

        if (!force) {
            return NextResponse.json(
                { error: 'This operation will replace all administrative data. Set force: true to proceed.' },
                { status: 400 }
            );
        }

        await seedDatabase();

        return NextResponse.json({
            message: 'Database seeded successfully',
        });

    } catch (error) {
        console.error('Seed database error:', error);
        return NextResponse.json(
            { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
