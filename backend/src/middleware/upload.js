import multer from 'multer';

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Parses multipart `photos` fields into memory (req.files) so the route can
 * forward them to Supabase Storage. Limit violations become 400 responses.
 */
const parsePhotos = multer({
    storage: multer.memoryStorage(),
    limits: { files: MAX_PHOTOS, fileSize: MAX_PHOTO_BYTES },
}).array('photos');

const LIMIT_MESSAGES = {
    LIMIT_FILE_COUNT: `Maximum ${MAX_PHOTOS} photos allowed`,
    LIMIT_UNEXPECTED_FILE: `Maximum ${MAX_PHOTOS} photos allowed`,
    LIMIT_FILE_SIZE: 'File size must be less than 5MB',
};

export function uploadPhotos(req, res, next) {
    parsePhotos(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: LIMIT_MESSAGES[error.code] || error.message });
        }
        next(error);
    });
}
