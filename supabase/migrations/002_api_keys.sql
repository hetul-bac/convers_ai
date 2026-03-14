begin;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_api_keys_org_id
  on public.api_keys (org_id);

create index if not exists idx_api_keys_key_hash
  on public.api_keys (key_hash);

alter table public.api_keys enable row level security;
alter table public.api_keys force row level security;

drop policy if exists api_keys_tenant_isolation on public.api_keys;
create policy api_keys_tenant_isolation
  on public.api_keys
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

commit;
