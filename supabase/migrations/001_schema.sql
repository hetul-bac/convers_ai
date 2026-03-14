begin;

create extension if not exists pgcrypto;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_id', '')::uuid
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null,
  created_at timestamptz not null default now(),
  constraint organizations_plan_check
    check (plan in ('free', 'starter', 'pro', 'enterprise'))
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  phone text,
  email text,
  name text,
  tags text[] not null default '{}'::text[],
  constraint contacts_org_id_id_key
    unique (org_id, id),
  constraint contacts_contact_method_check
    check (phone is not null or email is not null)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid,
  channel text not null,
  last_message_at timestamptz,
  status text not null,
  constraint conversations_contact_fk
    foreign key (org_id, contact_id)
    references public.contacts (org_id, id)
    on delete cascade,
  constraint conversations_channel_check
    check (channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')),
  constraint conversations_status_check
    check (status in ('open', 'pending', 'closed', 'archived'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  body text not null,
  channel text not null,
  status text not null,
  sentiment_score double precision,
  sentiment_label text,
  cost numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  constraint messages_channel_check
    check (channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')),
  constraint messages_status_check
    check (status in ('queued', 'sent', 'delivered', 'failed', 'read')),
  constraint messages_sentiment_score_check
    check (sentiment_score is null or sentiment_score between -1 and 1),
  constraint messages_sentiment_label_check
    check (sentiment_label is null or sentiment_label in ('positive', 'neutral', 'negative')),
  constraint messages_cost_check
    check (cost >= 0)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  message_body text not null,
  channels text[] not null,
  status text not null,
  sent_count int not null default 0,
  delivered_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint campaigns_channels_not_empty_check
    check (cardinality(channels) > 0),
  constraint campaigns_channels_allowed_check
    check (channels <@ array['sms', 'whatsapp', 'rcs', 'telegram', 'viber']::text[]),
  constraint campaigns_status_check
    check (status in ('draft', 'scheduled', 'running', 'completed', 'paused')),
  constraint campaigns_counts_check
    check (sent_count >= 0 and delivered_count >= 0 and delivered_count <= sent_count)
);

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  channel text not null,
  sent int not null,
  delivered int not null,
  failed int not null,
  cost numeric(12, 4) not null,
  engagement_rate double precision not null,
  constraint analytics_channel_check
    check (channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')),
  constraint analytics_counts_check
    check (
      sent >= 0
      and delivered >= 0
      and failed >= 0
      and delivered + failed <= sent
    ),
  constraint analytics_cost_check
    check (cost >= 0),
  constraint analytics_engagement_rate_check
    check (engagement_rate between 0 and 1),
  constraint analytics_org_date_channel_key
    unique (org_id, date, channel)
);

create index if not exists idx_contacts_org_id
  on public.contacts (org_id);

create index if not exists idx_contacts_org_email
  on public.contacts (org_id, email);

create index if not exists idx_contacts_org_phone
  on public.contacts (org_id, phone);

create index if not exists idx_conversations_org_id
  on public.conversations (org_id);

create index if not exists idx_conversations_org_last_message_at
  on public.conversations (org_id, last_message_at desc nulls last);

create index if not exists idx_conversations_org_status
  on public.conversations (org_id, status);

create index if not exists idx_messages_org_id
  on public.messages (org_id);

create index if not exists idx_messages_org_created_at
  on public.messages (org_id, created_at desc);

create index if not exists idx_messages_org_channel_status
  on public.messages (org_id, channel, status);

create index if not exists idx_campaigns_org_id
  on public.campaigns (org_id);

create index if not exists idx_campaigns_org_created_at
  on public.campaigns (org_id, created_at desc);

create index if not exists idx_campaigns_org_status
  on public.campaigns (org_id, status);

create index if not exists idx_analytics_org_date
  on public.analytics (org_id, date desc);

create index if not exists idx_analytics_org_channel_date
  on public.analytics (org_id, channel, date desc);

alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.analytics enable row level security;

alter table public.organizations force row level security;
alter table public.contacts force row level security;
alter table public.conversations force row level security;
alter table public.messages force row level security;
alter table public.campaigns force row level security;
alter table public.analytics force row level security;

drop policy if exists organizations_tenant_isolation on public.organizations;
create policy organizations_tenant_isolation
  on public.organizations
  for all
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

drop policy if exists contacts_tenant_isolation on public.contacts;
create policy contacts_tenant_isolation
  on public.contacts
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists conversations_tenant_isolation on public.conversations;
create policy conversations_tenant_isolation
  on public.conversations
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists messages_tenant_isolation on public.messages;
create policy messages_tenant_isolation
  on public.messages
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists campaigns_tenant_isolation on public.campaigns;
create policy campaigns_tenant_isolation
  on public.campaigns
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists analytics_tenant_isolation on public.analytics;
create policy analytics_tenant_isolation
  on public.analytics
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

commit;
