import mongoose from 'mongoose';
// Extend the global namespace to include mongoose connection caching
declare global {
    var mongoose: {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose> | null;
    } | undefined;
}

export { };
