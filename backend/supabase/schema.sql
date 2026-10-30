-- Institution Intelligence Platform — Supabase schema
-- Run in Supabase Dashboard → SQL Editor (safe to re-run).
--
-- Evidence values are stored as jsonb: { "v": <value>, "src": "...", "date": "YYYY-MM-DD", "st": "verified|govt|self|unverified|internal" }
-- Every table has RLS enabled: only signed-in users (role "authenticated") can read.
-- The Flask backend uses the service-role key, which bypasses RLS.

create table if not exists institutions (
  id              text primary key,
  name            text not null,
  short_name      text,
  aishe_code      text unique,
  city            text,
  state           text,
  established     int,
  ownership       text,
  category        text,
  university      text,
  campus_status   text,
  website         text,
  courses_source  jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists regulatory_records (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  body            text not null,
  item            text,
  value           jsonb not null,
  valid_until     date,
  state           text not null check (state in ('ok', 'issue', 'expired', 'na')),
  is_affiliation  boolean not null default false,
  is_naac         boolean not null default false,
  sort_order      int not null default 0
);

create table if not exists admissions (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  academic_year   text not null,
  approved_intake jsonb not null,
  claimed         jsonb,
  verified        jsonb,
  unique (institution_id, academic_year)
);

create table if not exists courses (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  name            text not null,
  level           text,
  duration_years  int,
  intake          int not null default 0,
  admitted        int not null default 0,
  status          text not null check (status in ('active', 'new', 'discontinued')),
  since           text,
  sort_order      int not null default 0
);

create table if not exists placements (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  batch_year      int not null,
  eligible        jsonb not null,
  placed          jsonb,
  claimed_pct     jsonb,
  highest         jsonb,
  average         jsonb,
  median          jsonb,
  unique (institution_id, batch_year)
);

create table if not exists recruiter_profiles (
  institution_id       text primary key references institutions(id) on delete cascade,
  total                jsonb,
  repeat_count         jsonb,
  new_count            jsonb,
  international        jsonb,
  top_recruiters       text[] not null default '{}',
  internship_companies text[] not null default '{}',
  sector_split         jsonb not null default '[]',   -- [{label, pct}] (array keeps display order)
  location_split       jsonb not null default '[]'    -- [{label, pct}]
);

create table if not exists nirf_rankings (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  category        text not null,
  year            int not null,
  rank            jsonb not null,   -- rank.v is a number, a band string ("151-200") or null (not ranked)
  sort_order      int not null default 0,
  unique (institution_id, category, year)
);

create table if not exists promoter_profiles (
  institution_id        text primary key references institutions(id) on delete cascade,
  trust_name            text not null,
  entity_type           text,
  trust_established     int,
  registration          jsonb,
  insolvency            jsonb,
  promoters             jsonb not null default '[]',   -- [{name, role}]
  board_members         text[] not null default '{}',
  key_management        jsonb not null default '[]',   -- [{name, role}]
  other_institutions    text[] not null default '{}',
  other_businesses      text[] not null default '{}',
  previous_institutions text[] not null default '{}'
);

-- Legal stage is explicit — a complaint is never the same as a conviction.
create table if not exists legal_records (
  id              bigint generated always as identity primary key,
  institution_id  text not null references institutions(id) on delete cascade,
  record_type     text not null check (record_type in
                    ('complaint', 'civil_dispute', 'fir', 'charge', 'prosecution', 'conviction', 'acquittal', 'regulatory_action')),
  party           text,
  title           text not null,
  forum           text,
  year            int,
  status          text,
  is_material     boolean not null default false,
  source          text not null,
  source_date     date
);

create table if not exists campus_metrics (
  institution_id    text primary key references institutions(id) on delete cascade,
  students          jsonb, faculty          jsonb, faculty_attrition jsonb,
  attendance        jsonb, pass_pct         jsonb, backlogs          jsonb,
  dropouts          jsonb, graduation_rate  jsonb, higher_studies    jsonb,
  land_acres        jsonb, built_up_sqft    jsonb, classrooms        jsonb,
  labs              jsonb, library_volumes  jsonb, hostel_capacity   jsonb,
  hostel_occupancy  jsonb, buses            jsonb, sports            text
);

create table if not exists commercial_metrics (
  institution_id        text primary key references institutions(id) on delete cascade,
  capacity              jsonb,
  avg_fee_lakh          jsonb,
  collection_efficiency jsonb,
  outstanding_cr        jsonb,
  scholarship_pct       jsonb,
  discount_pct          jsonb,
  refunds_cr            jsonb,
  course_fees           jsonb not null default '[]'   -- [{course, fee}] fee in ₹ lakh
);

create table if not exists internal_notes (
  institution_id      text primary key references institutions(id) on delete cascade,
  visit_date          date,
  visited_by          text,
  notes               text,
  partnership_history text
);

-- Search index: one lower-cased text column per searchable field.
create or replace view institution_search with (security_invoker = true) as
select
  i.id,
  lower(i.name || ' ' || coalesce(i.short_name, ''))  as name_text,
  lower(coalesce(i.university, ''))                    as university_text,
  lower(coalesce(i.aishe_code, ''))                    as aishe_text,
  lower(coalesce(i.city, '') || ' ' || coalesce(i.state, '')) as city_text,
  lower(coalesce(p.trust_name, '') || ' ' || coalesce(
    (select string_agg(x ->> 'name', ' ') from jsonb_array_elements(p.promoters) x), '')) as promoter_text
from institutions i
left join promoter_profiles p on p.institution_id = i.id;

-- Row Level Security: signed-in users can read; nobody can write except the service role.
do $$
declare t text;
begin
  foreach t in array array['institutions', 'regulatory_records', 'admissions', 'courses', 'placements',
    'recruiter_profiles', 'nirf_rankings', 'promoter_profiles', 'legal_records', 'campus_metrics',
    'commercial_metrics', 'internal_notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "authenticated read" on %I', t);
    execute format('create policy "authenticated read" on %I for select to authenticated using (true)', t);
  end loop;
end $$;
