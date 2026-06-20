alter table public.members
  add column if not exists system_role public.user_role not null default 'MEMBER';

alter table public.users
  add column if not exists member_id uuid unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_member_id_fkey'
  ) then
    alter table public.users
      add constraint users_member_id_fkey
      foreign key (member_id) references public.members(id) on delete set null;
  end if;
end
$$;

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

create index if not exists idx_profile_update_requests_member_id on public.member_profile_update_requests(member_id);
create index if not exists idx_profile_update_requests_status on public.member_profile_update_requests(status);

alter table public.member_profile_update_requests enable row level security;

drop policy if exists "public_access_member_profile_update_requests" on public.member_profile_update_requests;
create policy "public_access_member_profile_update_requests" on public.member_profile_update_requests
  for all to anon, authenticated
  using (true)
  with check (true);

update public.members
set system_role = 'MEMBER'
where system_role is null;

update public.users u
set member_id = m.id
from public.members m
where u.member_id is null
  and lower(u.email) = lower(m.email);

insert into public.users (member_id, full_name, email, role, active_status, created_at)
select m.id, m.full_name, m.email, m.system_role, m.active_status, m.created_at
from public.members m
where not exists (
  select 1
  from public.users u
  where u.member_id = m.id
     or lower(u.email) = lower(m.email)
);
