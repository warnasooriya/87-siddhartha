create table if not exists public.samithi_constitutions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version_label text not null,
  effective_date date not null,
  description text not null default '',
  file_name text not null,
  file_url text not null,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);
