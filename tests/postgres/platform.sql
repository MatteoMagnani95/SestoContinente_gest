-- Modello minimo di Auth e Storage per PostgreSQL usa e getta nella CI.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema storage;
create schema extensions;
create table auth.users (
  id uuid primary key, email text, email_confirmed_at timestamptz, deleted_at timestamptz,
  banned_until timestamptz, last_sign_in_at timestamptz, created_at timestamptz default now(), raw_user_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text)$$;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text,
  metadata jsonb, unique(bucket_id,name)
);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$
  select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]
$$;
create function storage.extension(text) returns text language sql immutable as $$
  select substring($1 from '[.]([^.]+)$')
$$;
grant usage on schema auth,storage,public to authenticated, anon;
grant select,insert,delete on storage.objects to authenticated;
alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
alter default privileges in schema public grant usage on sequences to authenticated;
