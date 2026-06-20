alter table public.member_profile_update_requests
  add column if not exists requested_family_members jsonb not null default '[]'::jsonb;
