import { getSupabase } from './supabase.js';

/**
 * Data-access helpers for the Supabase tables.
 *
 * Rows are mapped to the same document shape the API returned under MongoDB
 * (`_id`, nested `submittedBy` / `assignedTo`, camelCase fields), so route
 * handlers and the frontend can keep working with plain objects:
 * load with `getComplaintById`, mutate, then persist with `saveComplaint`.
 */

export { getSupabase };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** Returns `data` from a Supabase response, throwing its error if there is one. */
export function unwrap({ data, error }) {
    if (error) throw error;
    return data;
}

/**
 * Runs a select in 1000-row pages (Supabase's default response cap) and
 * returns every row. `buildQuery` must return a fresh, ordered query each call.
 */
export async function fetchAll(buildQuery, pageSize = 1000) {
    const rows = [];
    for (let from = 0; ; from += pageSize) {
        const page = unwrap(await buildQuery().range(from, from + pageSize - 1));
        rows.push(...page);
        if (page.length < pageSize) return rows;
    }
}

/**
 * Builds a PostgREST `or` filter matching `term` case-insensitively as a
 * substring of any of `columns`. LIKE wildcards in the term are escaped and the
 * value is quoted so commas or parentheses in user input can't alter the filter.
 */
export function ilikeAny(columns, term) {
    const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
    const quoted = `"${pattern.replace(/["\\]/g, '\\$&')}"`;
    return columns.map((column) => `${column}.ilike.${quoted}`).join(',');
}

/** Accepts either an id or a populated object and returns the id. */
const idOf = (value) => (value && typeof value === 'object' ? value._id : value) ?? null;

const omitUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ---------------------------------------------------------------------------
// Administrative divisions
// ---------------------------------------------------------------------------

export function toDivision(row) {
    if (!row) return null;
    return {
        _id: row.id,
        id: row.id,
        name: row.name,
        code: row.code,
        level: row.level,
        parentId: row.parent_id,
        state: row.state,
        district: row.district,
        coordinates: row.coordinates,
        population: row.population,
        area: row.area,
        contactInfo: row.contact_info,
        departments: row.departments,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function fromDivision(division) {
    return omitUndefined({
        name: division.name?.trim(),
        code: division.code?.toUpperCase(),
        level: division.level,
        parent_id: division.parentId === undefined ? undefined : idOf(division.parentId),
        state: division.state,
        district: division.district,
        coordinates: division.coordinates,
        population: division.population,
        area: division.area,
        contact_info: division.contactInfo,
        departments: division.departments,
        is_active: division.isActive,
    });
}

export async function findDivision(filters) {
    let query = getSupabase().from('administrative_divisions').select('*');
    for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
    }
    const row = unwrap(await query.limit(1).maybeSingle());
    return toDivision(row);
}

/**
 * Finds the division an officer at `adminLevel` is responsible for, from their
 * address. A state or district must already exist (they are seeded); a block
 * is matched by name within its district and created under that district when
 * missing, since only sample blocks are seeded.
 */
export async function resolveJurisdiction(address = {}, adminLevel) {
    const { state, district, block } = address;
    if (!state) return null;

    if (adminLevel === 'state') {
        return findDivision({ state, level: 'state', is_active: true });
    }

    const districtDivision = district ? await findDivision({ state, district, level: 'district', is_active: true }) : null;
    if (adminLevel === 'district' || !districtDivision) {
        return adminLevel === 'district' ? districtDivision : null;
    }

    if (adminLevel !== 'block' || !block?.trim()) return null;
    const existing = await findDivision({ state, district, level: 'block', name: block.trim() });
    if (existing) return existing;

    const slug = block
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
    const row = unwrap(
        await getSupabase()
            .from('administrative_divisions')
            .upsert(
                {
                    name: block.trim(),
                    code: `${districtDivision.code}_${slug}`,
                    level: 'block',
                    parent_id: districtDivision._id,
                    state,
                    district,
                    departments: districtDivision.departments,
                    is_active: true,
                },
                { onConflict: 'code' }
            )
            .select()
            .single()
    );
    return toDivision(row);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Select string that also embeds the officer's jurisdiction division. */
export const USER_WITH_JURISDICTION = '*, jurisdiction:administrative_divisions(*)';

export function toUser(row) {
    if (!row) return null;
    const jurisdiction = row.jurisdiction !== undefined ? toDivision(row.jurisdiction) : row.jurisdiction_id;
    return {
        _id: row.id,
        id: row.id,
        email: row.email,
        password: row.password,
        userType: row.user_type,
        profile: row.profile ?? {},
        governmentDetails: row.government_details ? { ...row.government_details, jurisdiction } : undefined,
        isActive: row.is_active,
        isAnonymous: row.is_anonymous,
        anonymousId: row.anonymous_id ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function fromUser(user) {
    let governmentDetails;
    if (user.governmentDetails) {
        const { jurisdiction, ...details } = user.governmentDetails;
        governmentDetails = { isVerified: false, ...details };
    }
    return omitUndefined({
        email: user.email?.trim().toLowerCase(),
        password: user.password,
        user_type: user.userType,
        profile: user.profile,
        government_details: governmentDetails,
        jurisdiction_id: user.governmentDetails ? idOf(user.governmentDetails.jurisdiction) : undefined,
        is_active: user.isActive,
        is_anonymous: user.isAnonymous,
        anonymous_id: user.anonymousId,
    });
}

/** Strips the password hash before a user is sent to the client. */
export function withoutPassword(user) {
    if (!user) return user;
    const { password, ...rest } = user;
    return rest;
}

export async function getUserById(id, { withJurisdiction = false } = {}) {
    if (!isUuid(id)) return null;
    const row = unwrap(
        await getSupabase()
            .from('users')
            .select(withJurisdiction ? USER_WITH_JURISDICTION : '*')
            .eq('id', id)
            .maybeSingle()
    );
    return toUser(row);
}

export async function getUserByEmail(email, { withJurisdiction = false } = {}) {
    const row = unwrap(
        await getSupabase()
            .from('users')
            .select(withJurisdiction ? USER_WITH_JURISDICTION : '*')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle()
    );
    return toUser(row);
}

export async function insertUser(user) {
    const row = unwrap(await getSupabase().from('users').insert(fromUser(user)).select().single());
    return toUser(row);
}

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------

/**
 * Upvoter ids are stored so each user can upvote once, but they are private:
 * attaching them as a non-enumerable property keeps them out of every JSON
 * response while `fromComplaint` still writes them back.
 */
function toPublicSupport(raw) {
    const { upvoters = [], ...visible } = raw ?? {};
    const support = { upvotes: 0, comments: [], ...visible };
    Object.defineProperty(support, 'upvoters', { value: upvoters, enumerable: false, writable: true });
    return support;
}

export function toComplaint(row) {
    if (!row) return null;
    return {
        _id: row.id,
        id: row.id,
        ticketNumber: row.ticket_number,
        title: row.title,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory ?? undefined,
        priority: row.priority,
        status: row.status,
        location: row.location,
        submittedBy: omitUndefined({
            userId: row.submitted_by_user_id ?? undefined,
            anonymousId: row.anonymous_id ?? undefined,
            contactInfo: row.submitter_contact ?? undefined,
        }),
        assignedTo: {
            division: row.division_id,
            department: row.department,
            officers: row.officer_ids ?? [],
        },
        escalationHistory: row.escalation_history ?? [],
        statusHistory: row.status_history ?? [],
        attachments: row.attachments ?? [],
        publicSupport: toPublicSupport(row.public_support),
        proofOfWork: row.proof_of_work ?? [],
        resolution: row.resolution ?? undefined,
        feedback: row.feedback ?? undefined,
        resolvedAt: row.resolved_at ?? undefined,
        isPublic: row.is_public,
        tags: row.tags ?? [],
        dueDate: row.due_date ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function fromComplaint(complaint) {
    const { submittedBy = {}, assignedTo = {}, resolution } = complaint;
    return omitUndefined({
        ticket_number: complaint.ticketNumber,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        subcategory: complaint.subcategory ?? null,
        priority: complaint.priority,
        status: complaint.status,
        location: complaint.location,
        submitted_by_user_id: idOf(submittedBy.userId),
        anonymous_id: submittedBy.anonymousId ?? null,
        submitter_contact: submittedBy.contactInfo ?? null,
        division_id: idOf(assignedTo.division),
        department: assignedTo.department,
        officer_ids: assignedTo.officers?.map(idOf),
        escalation_history: complaint.escalationHistory?.map((entry) => ({
            ...entry,
            fromDivision: idOf(entry.fromDivision),
            toDivision: idOf(entry.toDivision),
            escalatedBy: idOf(entry.escalatedBy),
        })),
        status_history: complaint.statusHistory?.map((entry) => ({ ...entry, updatedBy: idOf(entry.updatedBy) })),
        attachments: complaint.attachments,
        public_support: complaint.publicSupport && {
            ...complaint.publicSupport,
            upvoters: complaint.publicSupport.upvoters ?? [],
        },
        proof_of_work: complaint.proofOfWork?.map((entry) => ({ ...entry, submittedBy: idOf(entry.submittedBy) })),
        resolution: resolution
            ? { ...resolution, resolvedBy: idOf(resolution.resolvedBy), verifiedBy: idOf(resolution.verifiedBy) }
            : null,
        feedback: complaint.feedback ?? null,
        resolved_at: complaint.resolvedAt ?? null,
        is_public: complaint.isPublic,
        tags: complaint.tags,
        due_date: complaint.dueDate ?? null,
        created_at: complaint.createdAt,
    });
}

export async function getComplaintById(id) {
    if (!isUuid(id)) return null;
    const row = unwrap(await getSupabase().from('complaints').select('*').eq('id', id).maybeSingle());
    return toComplaint(row);
}

export async function insertComplaint(complaint) {
    const row = unwrap(await getSupabase().from('complaints').insert(fromComplaint(complaint)).select().single());
    return toComplaint(row);
}

/** Raised when a complaint changed between being loaded and saved (HTTP 409). */
export class ConflictError extends Error {
    status = 409;
}

/**
 * Persists every mutable field of a complaint loaded with `getComplaintById`.
 * Optimistic locking: the write only applies if `updated_at` is unchanged since
 * the load, so concurrent edits can't silently overwrite each other's history.
 */
export async function saveComplaint(complaint) {
    const rows = unwrap(
        await getSupabase()
            .from('complaints')
            .update(fromComplaint(complaint))
            .eq('id', complaint._id)
            .eq('updated_at', complaint.updatedAt)
            .select()
    );
    if (rows.length === 0) {
        throw new ConflictError('This complaint was just updated by someone else. Please reload and try again.');
    }
    return toComplaint(rows[0]);
}

/**
 * Loads a complaint, applies `mutate` and saves it, retrying on conflicts.
 * For small independent changes (e.g. an upvote) where retrying is safe.
 * `mutate` may return false to skip the write. Returns the (saved) complaint,
 * or null if it doesn't exist.
 */
export async function updateComplaint(id, mutate, attempts = 3) {
    for (let attempt = 1; ; attempt++) {
        const complaint = await getComplaintById(id);
        if (!complaint) return null;
        if (mutate(complaint) === false) return complaint;
        try {
            return await saveComplaint(complaint);
        } catch (error) {
            if (!(error instanceof ConflictError) || attempt >= attempts) throw error;
        }
    }
}

export async function listComplaints(query) {
    return unwrap(await query).map(toComplaint);
}

// ---------------------------------------------------------------------------
// Populate (replaces Mongoose .populate)
// ---------------------------------------------------------------------------

/** The public subset of a user that populated references expose. */
function toUserRef(row) {
    const details = row.government_details;
    return {
        _id: row.id,
        profile: {
            name: row.profile?.name,
            phone: row.profile?.phone,
            address: row.profile?.address ? { district: row.profile.address.district } : undefined,
        },
        governmentDetails: details
            ? { designation: details.designation, employeeId: details.employeeId, department: details.department }
            : undefined,
    };
}

async function fetchByIds(table, columns, ids, map) {
    const unique = [...new Set(ids.filter(isUuid))];
    if (unique.length === 0) return new Map();
    const rows = unwrap(await getSupabase().from(table).select(columns).in('id', unique));
    return new Map(rows.map((row) => [row.id, map(row)]));
}

/**
 * Replaces id references on complaints with the referenced records, in place.
 *
 * paths: 'division' | 'officers' | 'statusHistory' | 'proofOfWork' | 'resolution'
 */
export async function populateComplaints(complaints, paths) {
    const want = new Set(paths);
    const divisionIds = [];
    const userIds = [];

    for (const c of complaints) {
        if (want.has('division')) divisionIds.push(c.assignedTo.division);
        if (want.has('officers')) userIds.push(...c.assignedTo.officers);
        if (want.has('statusHistory')) userIds.push(...c.statusHistory.map((h) => h.updatedBy).filter((id) => id !== c.submittedBy.anonymousId));
        if (want.has('proofOfWork')) userIds.push(...c.proofOfWork.map((p) => p.submittedBy));
        if (want.has('resolution') && c.resolution) userIds.push(c.resolution.resolvedBy, c.resolution.verifiedBy);
    }

    const [divisions, users] = await Promise.all([
        fetchByIds('administrative_divisions', 'id, name, level', divisionIds, (row) => ({ _id: row.id, name: row.name, level: row.level })),
        fetchByIds('users', 'id, profile, government_details', userIds, toUserRef),
    ]);
    const user = (id) => users.get(id) ?? null;

    for (const c of complaints) {
        if (want.has('division')) c.assignedTo.division = divisions.get(c.assignedTo.division) ?? null;
        if (want.has('officers')) c.assignedTo.officers = c.assignedTo.officers.map(user).filter(Boolean);
        // Anonymous submitters and unknown authors stay plain strings, which the UI renders without a name.
        if (want.has('statusHistory')) {
            const anonymousId = c.submittedBy.anonymousId;
            c.statusHistory = c.statusHistory.map((h) => ({
                ...h,
                updatedBy: anonymousId && h.updatedBy === anonymousId ? 'anonymous' : (user(h.updatedBy) ?? h.updatedBy),
            }));
        }
        if (want.has('proofOfWork')) c.proofOfWork = c.proofOfWork.map((p) => ({ ...p, submittedBy: user(p.submittedBy) }));
        if (want.has('resolution') && c.resolution) {
            c.resolution = {
                ...c.resolution,
                resolvedBy: user(c.resolution.resolvedBy),
                verifiedBy: c.resolution.verifiedBy ? user(c.resolution.verifiedBy) : undefined,
            };
        }
    }

    return complaints;
}
