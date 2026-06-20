alter table public.member_profile_update_requests
  add column if not exists nic text not null default '';
