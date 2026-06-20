insert into public.users (full_name, email, role, active_status)
select 'සභාපති', 'president@samithiya.lk', 'PRESIDENT', true
where not exists (
  select 1 from public.users where email = 'president@samithiya.lk'
);

insert into public.users (full_name, email, role, active_status)
select 'භාණ්ඩාගාරික', 'treasurer@samithiya.lk', 'TREASURER', true
where not exists (
  select 1 from public.users where email = 'treasurer@samithiya.lk'
);
