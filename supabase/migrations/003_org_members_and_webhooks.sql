begin;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid,
    nullif(auth.jwt() -> 'user_metadata' ->> 'org_id', '')::uuid
  )
$$;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null unique,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint organization_members_role_check
    check (role in ('owner', 'admin', 'member')),
  constraint organization_members_org_id_user_id_key
    unique (org_id, user_id)
);

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  events text[] not null default '{}'::text[],
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint webhooks_events_not_empty_check
    check (cardinality(events) > 0),
  constraint webhooks_events_allowed_check
    check (
      events <@ array[
        'campaign.sent',
        'message.delivered',
        'message.failed',
        'sentiment.updated'
      ]::text[]
    )
);

create index if not exists idx_organization_members_org_id
  on public.organization_members (org_id);

create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);

create index if not exists idx_webhooks_org_id
  on public.webhooks (org_id);

create index if not exists idx_webhooks_org_id_active
  on public.webhooks (org_id, active);

alter table public.organization_members enable row level security;
alter table public.webhooks enable row level security;

alter table public.organization_members force row level security;
alter table public.webhooks force row level security;

drop policy if exists organization_members_tenant_isolation on public.organization_members;
create policy organization_members_tenant_isolation
  on public.organization_members
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists webhooks_tenant_isolation on public.webhooks;
create policy webhooks_tenant_isolation
  on public.webhooks
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

commit;
