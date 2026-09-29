import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import officerRoutes from './routes/officer.js';
import userRoutes from './routes/user.js';
import administrativeDivisionRoutes from './routes/administrativeDivisions.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
    const app = express();

    // The frontend proxies /api to this server, so CORS is only needed when
    // other origins call the API directly (comma-separated list in CORS_ORIGIN).
    if (process.env.CORS_ORIGIN) {
        app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
    }

    app.use(express.json({ limit: '1mb' }));
    // Handlers destructure req.body, so default it for requests without a JSON body
    app.use((req, res, next) => {
        req.body ??= {};
        next();
    });

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    app.use('/api/auth', authRoutes);
    app.use('/api/complaints', complaintRoutes);
    app.use('/api/officer', officerRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/administrative-divisions', administrativeDivisionRoutes);
    app.use('/api/admin', adminRoutes);

    app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

    // Malformed JSON bodies and any error a route didn't handle itself
    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
        console.error('Unhandled error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}
