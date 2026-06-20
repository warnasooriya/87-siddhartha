create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER');
  end if;

  if not exists (select 1 from pg_type where typname = 'gender') then
    create type public.gender as enum ('MALE', 'FEMALE', 'OTHER');
  end if;

  if not exists (select 1 from pg_type where typname = 'relationship_type') then
    create type public.relationship_type as enum ('SPOUSE', 'MOTHER', 'FATHER', 'SPOUSE_MOTHER', 'SPOUSE_FATHER', 'CHILD');
  end if;

  if not exists (select 1 from pg_type where typname = 'finance_entry_type') then
    create type public.finance_entry_type as enum ('OTHER_INCOME', 'EXPENSE');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  member_id uuid unique,
  full_name text not null,
  email text unique not null,
  role public.user_role not null default 'MEMBER',
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  password_hash text,
  password_updated_at timestamptz
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_number text unique not null,
  full_name text not null,
  nic text unique not null,
  date_of_birth date not null,
  gender public.gender not null,
  address text not null,
  phone_number text not null,
  email text not null,
  area text not null,
  system_role public.user_role not null default 'MEMBER',
  photo_url text,
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  relationship_type public.relationship_type not null,
  full_name text not null,
  nic text,
  date_of_birth date,
  address text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  file_url text not null,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz not null default now(),
  version integer not null default 1
);

create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  setting_value text not null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.samithi_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  description text not null default '',
  file_name text not null,
  file_url text not null,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.monthly_fee_configs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12,2) not null,
  due_day integer not null,
  effective_month text not null,
  notes text not null default '',
  is_active boolean not null default true
);

create table if not exists public.monthly_fee_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  config_id uuid not null references public.monthly_fee_configs(id) on delete cascade,
  fee_month text not null,
  amount numeric(12,2) not null,
  paid_date timestamptz not null default now(),
  status text not null,
  collected_by text not null,
  note text
);

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type public.finance_entry_type not null,
  title text not null,
  amount numeric(12,2) not null,
  entry_date date not null,
  category text not null,
  note text,
  received_by text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_profile_update_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  requested_by_user_id uuid not null references public.users(id) on delete cascade,
  requested_by_name text not null,
  full_name text not null,
  date_of_birth date not null,
  phone_number text not null,
  email text not null,
  address text not null,
  area text not null,
  photo_url text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by_user_id uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_member_id_fkey'
  ) then
    alter table public.users
      add constraint users_member_id_fkey
      foreign key (member_id) references public.members(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_members_name on public.members(full_name);
create index if not exists idx_members_nic on public.members(nic);
create index if not exists idx_members_member_number on public.members(member_number);
create index if not exists idx_members_dob on public.members(date_of_birth);
create index if not exists idx_family_members_member_id on public.family_members(member_id);
create index if not exists idx_documents_member_id on public.documents(member_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_samithi_reports_meeting_date on public.samithi_reports(meeting_date desc);
create index if not exists idx_monthly_fee_payments_member_month on public.monthly_fee_payments(member_id, fee_month);
create index if not exists idx_finance_entries_entry_date on public.finance_entries(entry_date desc);
create index if not exists idx_profile_update_requests_member_id on public.member_profile_update_requests(member_id);
create index if not exists idx_profile_update_requests_status on public.member_profile_update_requests(status);

alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.family_members enable row level security;
alter table public.documents enable row level security;
alter table public.email_recipients enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.samithi_reports enable row level security;
alter table public.monthly_fee_configs enable row level security;
alter table public.monthly_fee_payments enable row level security;
alter table public.finance_entries enable row level security;
alter table public.member_profile_update_requests enable row level security;

drop policy if exists "public_access_users" on public.users;
create policy "public_access_users" on public.users
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_members" on public.members;
create policy "public_access_members" on public.members
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_family_members" on public.family_members;
create policy "public_access_family_members" on public.family_members
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_documents" on public.documents;
create policy "public_access_documents" on public.documents
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_email_recipients" on public.email_recipients;
create policy "public_access_email_recipients" on public.email_recipients
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_system_settings" on public.system_settings;
create policy "public_access_system_settings" on public.system_settings
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_audit_logs" on public.audit_logs;
create policy "public_access_audit_logs" on public.audit_logs
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_samithi_reports" on public.samithi_reports;
create policy "public_access_samithi_reports" on public.samithi_reports
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_monthly_fee_configs" on public.monthly_fee_configs;
create policy "public_access_monthly_fee_configs" on public.monthly_fee_configs
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_monthly_fee_payments" on public.monthly_fee_payments;
create policy "public_access_monthly_fee_payments" on public.monthly_fee_payments
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_finance_entries" on public.finance_entries;
create policy "public_access_finance_entries" on public.finance_entries
  for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_access_member_profile_update_requests" on public.member_profile_update_requests;
create policy "public_access_member_profile_update_requests" on public.member_profile_update_requests
  for all to anon, authenticated
  using (true)
  with check (true);

create or replace function public.set_user_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_password, ''))) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  update public.users
  set
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    password_updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;
end
$$;

create or replace function public.verify_user_login(p_email text, p_password text)
returns table (
  id uuid,
  member_id uuid,
  full_name text,
  email text,
  role public.user_role,
  active_status boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.member_id,
    u.full_name,
    u.email,
    u.role,
    u.active_status,
    u.created_at
  from public.users u
  where lower(u.email) = lower(p_email)
    and u.active_status = true
    and u.password_hash is not null
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;
$$;

grant execute on function public.set_user_password(uuid, text) to anon, authenticated;
grant execute on function public.verify_user_login(text, text) to anon, authenticated;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
before update on public.members
for each row execute function public.handle_updated_at();

drop trigger if exists family_members_updated_at on public.family_members;
create trigger family_members_updated_at
before update on public.family_members
for each row execute function public.handle_updated_at();
