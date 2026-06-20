do $$
begin
  begin
    alter type public.user_role rename value 'DATA_ENTRY' to 'SECRETARY';
  exception
    when invalid_parameter_value then null;
    when undefined_object then null;
  end;

  begin
    alter type public.user_role rename value 'VIEWER' to 'MEMBER';
  exception
    when invalid_parameter_value then null;
    when undefined_object then null;
  end;
end
$$;

alter type public.user_role add value if not exists 'PRESIDENT';
alter type public.user_role add value if not exists 'TREASURER';

alter table public.users
  alter column role set default 'MEMBER';

update public.users
set
  full_name = 'ලේකම්',
  email = 'secretary@samithiya.lk'
where role = 'SECRETARY' and email = 'data@samithiya.lk';

update public.users
set
  full_name = 'සාමාජික',
  email = 'member@samithiya.lk'
where role = 'MEMBER' and email = 'viewer@samithiya.lk';
