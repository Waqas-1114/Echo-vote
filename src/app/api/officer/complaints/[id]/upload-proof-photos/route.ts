import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);
        if (!user || user.userType !== 'government_officer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { id } = await params;
        const formData = await req.formData();

        const files = formData.getAll('photos') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        if (files.length > 10) {
            return NextResponse.json({ error: 'Maximum 10 photos allowed' }, { status: 400 });
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proof-of-work', id);
        await mkdir(uploadDir, { recursive: true });

        const uploadedUrls: string[] = [];

        for (const file of files) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                continue; // Skip non-image files
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Generate unique filename
            const timestamp = Date.now();
            const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = `${timestamp}-${originalName}`;
            const filepath = path.join(uploadDir, filename);

            // Save file
            await writeFile(filepath, buffer);

            // Store public URL
            const publicUrl = `/uploads/proof-of-work/${id}/${filename}`;
            uploadedUrls.push(publicUrl);
        }

        return NextResponse.json({
            message: 'Photos uploaded successfully',
            urls: uploadedUrls
        });

    } catch (error) {
        console.error('Error uploading photos:', error);
        return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
    }
}
