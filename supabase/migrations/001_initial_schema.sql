-- =============================================================================
-- Packet Day — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users — one row per user, created automatically on signup.

create table public.profiles (
  id                        uuid primary key references auth.users on delete cascade,
  email                     text not null,
  full_name                 text,
  avatar_url                text,
  stripe_customer_id        text,
  subscription_status       text not null default 'free'
                              check (subscription_status in ('free', 'pro', 'cancelled')),
  subscription_period_end   timestamptz,
  packets_used_this_month   integer not null default 0,
  packets_reset_date        date not null default date_trunc('month', now())::date,
  onboarding_completed      boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. Extends auth.users.';

-- ─── children ─────────────────────────────────────────────────────────────────

create table public.children (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles on delete cascade,
  name              text not null,
  grade_level       text not null
                      check (grade_level in ('K','1','2','3','4','5','6','7','8')),
  learning_style    text not null
                      check (learning_style in ('visual','hands-on','reader','mixed')),
  favorite_subjects text[] not null default '{}',
  special_notes     text,
  avatar_emoji      text not null default '🌟',
  display_order     integer not null default 0,
  created_at        timestamptz not null default now()
);

comment on table public.children is 'Child profiles belonging to a user.';

-- ─── packets ──────────────────────────────────────────────────────────────────

create table public.packets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles on delete cascade,
  child_id          uuid references public.children on delete set null,
  child_name        text not null,       -- denormalized; survives child deletion
  grade_level       text not null,
  theme             text not null,
  packet_length     text not null
                      check (packet_length in ('half','full')),
  special_notes     text,
  generated_content jsonb,               -- full AI-generated packet data
  pdf_url           text,                -- set after PDF generation
  share_token       text unique not null default replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'),
  view_count        integer not null default 0,
  created_at        timestamptz not null default now()
);

comment on table public.packets is 'Generated learning packets. share_token enables public share links.';

-- ─── email_leads ──────────────────────────────────────────────────────────────

create table public.email_leads (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  source              text not null
                        check (source in ('landing_page_footer','sample_packet','referral')),
  converted_to_user   boolean not null default false,
  created_at          timestamptz not null default now()
);

comment on table public.email_leads is 'Email addresses captured before account creation.';

-- ─── referrals ────────────────────────────────────────────────────────────────

create table public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references public.profiles on delete cascade,
  referred_email    text not null,
  referred_user_id  uuid references public.profiles on delete set null,
  status            text not null default 'pending'
                      check (status in ('pending','signed_up','converted')),
  reward_granted    boolean not null default false,
  created_at        timestamptz not null default now()
);

comment on table public.referrals is 'Referral tracking between users.';

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_children_user_id       on public.children  (user_id);
create index idx_packets_user_id        on public.packets   (user_id);
create index idx_packets_share_token    on public.packets   (share_token);
create index idx_email_leads_email      on public.email_leads (email);
create index idx_packets_child_id       on public.packets   (child_id);
create index idx_referrals_referrer_id  on public.referrals (referrer_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- ─── Auto-create profile on signup ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Auto-update updated_at on profiles ───────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── Reset packets_used_this_month on 1st of month ───────────────────────────
-- This function is called from a pg_cron job or Supabase scheduled function.
-- It resets packet usage for any user whose reset_date is in the past.

create or replace function public.reset_monthly_packet_counts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    packets_used_this_month = 0,
    packets_reset_date = date_trunc('month', now())::date
  where
    packets_reset_date < date_trunc('month', now())::date;
end;
$$;

comment on function public.reset_monthly_packet_counts() is
  'Resets packets_used_this_month for users whose reset_date is past the start of the current month. Schedule via pg_cron or Supabase edge function on the 1st of each month.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- ─── profiles ─────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Users can read and update only their own profile
create policy "profiles: owner can select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts are handled by the trigger (service role) — no user insert policy needed

-- ─── children ─────────────────────────────────────────────────────────────────

alter table public.children enable row level security;

create policy "children: owner can select"
  on public.children for select
  using (auth.uid() = user_id);

create policy "children: owner can insert"
  on public.children for insert
  with check (auth.uid() = user_id);

create policy "children: owner can update"
  on public.children for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "children: owner can delete"
  on public.children for delete
  using (auth.uid() = user_id);

-- ─── packets ──────────────────────────────────────────────────────────────────

alter table public.packets enable row level security;

create policy "packets: owner can select"
  on public.packets for select
  using (auth.uid() = user_id);

create policy "packets: owner can insert"
  on public.packets for insert
  with check (auth.uid() = user_id);

create policy "packets: owner can update"
  on public.packets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "packets: owner can delete"
  on public.packets for delete
  using (auth.uid() = user_id);

-- Public share links: anyone can read a packet by its share_token (no auth required)
create policy "packets: public share read"
  on public.packets for select
  using (share_token is not null);

-- ─── email_leads ──────────────────────────────────────────────────────────────

alter table public.email_leads enable row level security;

-- Anyone can insert (unauthenticated landing page sign-ups)
create policy "email_leads: anyone can insert"
  on public.email_leads for insert
  with check (true);

-- Only service role can select/update (admin use only)

-- ─── referrals ────────────────────────────────────────────────────────────────

alter table public.referrals enable row level security;

create policy "referrals: referrer can select"
  on public.referrals for select
  using (auth.uid() = referrer_id);

create policy "referrals: authenticated can insert"
  on public.referrals for insert
  with check (auth.uid() = referrer_id);
