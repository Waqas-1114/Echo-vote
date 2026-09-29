import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service-role (secret) key.
 * Row Level Security locks every table to this key, so it must never be
 * imported from client components.
 *
 * Created lazily so `next build` works without credentials, and cached on
 * globalThis so hot reloads in development reuse one client.
 */
export function getSupabase() {
    if (!globalThis.__supabase) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error('Please define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY inside .env.local');
        }

        globalThis.__supabase = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }

    return globalThis.__supabase;
}
