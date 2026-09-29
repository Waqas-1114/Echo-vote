-- EchoVote schema for Supabase (Postgres).
--
-- Queried fields are real columns (with foreign keys and indexes). Nested,
-- append-only data such as status history and proof of work lives in jsonb,
-- keeping the same shape the API returned under MongoDB.
--
-- Every table has Row Level Security enabled with no policies, so it is only
-- reachable with the service-role key from the Next.js API routes. The anon
-- key cannot read or write anything (password hashes included).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrative divisions (state > district > block > panchayat > ward)
-- ---------------------------------------------------------------------------
create table public.administrative_divisions (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    code         text not null unique,
    level        text not null check (level in ('state', 'district', 'sub_division', 'block', 'panchayat', 'ward')),
    parent_id    uuid references public.administrative_divisions (id) on delete cascade,
    state        text not null,
    district     text,
    coordinates  jsonb,
    population   integer,
    area         numeric,
    contact_info jsonb,
    departments  text[] not null default '{}',
    is_active    boolean not null default true,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index administrative_divisions_level_state_idx on public.administrative_divisions (level, state);
create index administrative_divisions_parent_idx on public.administrative_divisions (parent_id);
create index administrative_divisions_state_district_idx on public.administrative_divisions (state, district);

create trigger administrative_divisions_updated_at
    before update on public.administrative_divisions
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Users (citizens, government officers, admins)
-- ---------------------------------------------------------------------------
create table public.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text not null unique check (email = lower(email)),
    password           text not null,
    user_type          text not null default 'citizen' check (user_type in ('citizen', 'government_officer', 'admin')),
    -- { name, phone, address: { state, district, subDivision, block, panchayat, ward, pincode } }
    profile            jsonb not null default '{}',
    -- { employeeId, department, designation, adminLevel, isVerified, verificationDocuments }
    government_details jsonb,
    jurisdiction_id    uuid references public.administrative_divisions (id) on delete set null,
    is_active          boolean not null default true,
    is_anonymous       boolean not null default false,
    anonymous_id       text unique,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index users_user_type_idx on public.users (user_type);
create index users_jurisdiction_idx on public.users (jurisdiction_id);
create index users_employee_id_idx on public.users ((government_details ->> 'employeeId'));
create index users_officer_lookup_idx on public.users (
    (government_details ->> 'adminLevel'),
    (government_details ->> 'department'),
    (profile -> 'address' ->> 'state')
) where user_type = 'government_officer';

create trigger users_updated_at
    before update on public.users
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Complaints
-- ---------------------------------------------------------------------------
create table public.complaints (
    id                   uuid primary key default gen_random_uuid(),
    ticket_number        text not null unique,
    title                text not null,
    description          text not null,
    category             text not null,
    subcategory          text,
    priority             text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    status               text not null default 'submitted'
                         check (status in ('submitted', 'acknowledged', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected')),
    -- { state, district, subDivision, block, panchayat, ward, address, coordinates }
    location             jsonb not null,

    -- Submitter: a registered user, or an anonymous id
    submitted_by_user_id uuid references public.users (id) on delete set null,
    anonymous_id         text,
    submitter_contact    jsonb,

    -- Assignment
    division_id          uuid not null references public.administrative_divisions (id),
    department           text not null,
    officer_ids          uuid[] not null default '{}',

    -- Append-only histories and nested details
    escalation_history   jsonb not null default '[]',
    status_history       jsonb not null default '[]',
    attachments          jsonb not null default '[]',
    public_support       jsonb not null default '{"upvotes": 0, "comments": []}',
    proof_of_work        jsonb not null default '[]',
    resolution           jsonb,
    feedback             jsonb,

    resolved_at          timestamptz,
    is_public            boolean not null default true,
    tags                 text[] not null default '{}',
    due_date             timestamptz,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),

    constraint complaints_location_required check (location ? 'state' and location ? 'district')
);

create index complaints_status_idx on public.complaints (status);
create index complaints_location_idx on public.complaints ((location ->> 'state'), (location ->> 'district'));
create index complaints_division_idx on public.complaints (division_id);
create index complaints_department_idx on public.complaints (department);
create index complaints_submitted_by_idx on public.complaints (submitted_by_user_id);
create index complaints_anonymous_idx on public.complaints (anonymous_id);
create index complaints_officer_ids_idx on public.complaints using gin (officer_ids);
create index complaints_category_idx on public.complaints (category);
create index complaints_created_at_idx on public.complaints (created_at desc);

create trigger complaints_updated_at
    before update on public.complaints
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Complaint listing stats: counts per status plus distinct states, over the
-- complaints visible to the caller (called from GET /api/complaints).
-- ---------------------------------------------------------------------------
create or replace function public.complaint_stats(
    p_user_id      uuid    default null,
    p_anonymous_id text    default null,
    p_public_only  boolean default false
)
returns jsonb
language sql
stable
set search_path = public
as $$
    with visible as (
        select status, location ->> 'state' as state
        from public.complaints
        where (p_user_id is null or submitted_by_user_id = p_user_id)
          and (p_anonymous_id is null or anonymous_id = p_anonymous_id)
          and (not p_public_only or is_public)
    )
    select jsonb_build_object(
        'byStatus', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from visible group by status) s), '{}'::jsonb),
        'states', (select count(distinct state) from visible)
    );
$$;

revoke execute on function public.complaint_stats(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.complaint_stats(uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security: lock everything down to the service role
-- ---------------------------------------------------------------------------
alter table public.administrative_divisions enable row level security;
alter table public.users enable row level security;
alter table public.complaints enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for proof-of-work photos (public read, server-side upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-of-work', 'proof-of-work', true, 5242880, array['image/*'])
on conflict (id) do nothing;
