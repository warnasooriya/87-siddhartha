create extension if not exists "pgcrypto";

alter table public.users
  add column if not exists password_hash text,
  add column if not exists password_updated_at timestamptz;

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

update public.users
set
  password_hash = extensions.crypt('samithiya@123', extensions.gen_salt('bf')),
  password_updated_at = now()
where password_hash is null;
