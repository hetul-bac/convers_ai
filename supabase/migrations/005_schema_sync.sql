begin;

create extension if not exists pgcrypto;

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

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table if not exists public.channel_connectors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null,
  name text not null,
  provider text not null,
  transport_mode text not null default 'simulated',
  status text not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  error_message text,
  last_tested_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_connectors_channel_check
    check (channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')),
  constraint channel_connectors_provider_check
    check (
      provider in (
        'conversai_sandbox',
        'sinch_sms',
        'whatsapp_cloud',
        'google_rcs',
        'telegram_bot',
        'viber_bot'
      )
    ),
  constraint channel_connectors_transport_mode_check
    check (transport_mode in ('sandbox', 'simulated')),
  constraint channel_connectors_status_check
    check (status in ('draft', 'configured', 'connected', 'error')),
  constraint channel_connectors_org_id_channel_key
    unique (org_id, channel)
);

create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft',
  default_channel text,
  welcome_message text not null,
  fallback_message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chatbots_status_check
    check (status in ('draft', 'published')),
  constraint chatbots_default_channel_check
    check (
      default_channel is null
      or default_channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')
    )
);

create table if not exists public.chatbot_intents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bot_id uuid not null references public.chatbots(id) on delete cascade,
  name text not null,
  description text,
  sample_utterances text[] not null default '{}'::text[],
  response_template text not null,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chatbot_intents_name_not_empty_check
    check (char_length(trim(name)) > 0),
  constraint chatbot_intents_response_template_not_empty_check
    check (char_length(trim(response_template)) > 0),
  constraint chatbot_intents_org_id_bot_id_name_key
    unique (org_id, bot_id, name)
);

create table if not exists public.chatbot_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bot_id uuid not null references public.chatbots(id) on delete cascade,
  intent_id uuid references public.chatbot_intents(id) on delete set null,
  node_key text not null,
  title text not null,
  node_type text not null,
  content text not null,
  next_node_key text,
  step_order integer not null default 0,
  position_x integer not null default 0,
  position_y integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chatbot_nodes_node_type_check
    check (node_type in ('message', 'question', 'choice', 'handoff', 'end')),
  constraint chatbot_nodes_node_key_not_empty_check
    check (char_length(trim(node_key)) > 0),
  constraint chatbot_nodes_title_not_empty_check
    check (char_length(trim(title)) > 0),
  constraint chatbot_nodes_content_not_empty_check
    check (char_length(trim(content)) > 0),
  constraint chatbot_nodes_org_id_bot_id_node_key_key
    unique (org_id, bot_id, node_key)
);

create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  country_code text,
  carrier text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint phone_numbers_org_id_number_key
    unique (org_id, number)
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  to_number text not null,
  code text not null,
  channel text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint verifications_channel_check
    check (channel in ('sms', 'whatsapp', 'voice')),
  constraint verifications_status_check
    check (status in ('pending', 'verified', 'expired'))
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  body text not null,
  channel text not null,
  variables text[] not null default '{}'::text[],
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint templates_channel_check
    check (channel in ('sms', 'whatsapp', 'rcs', 'telegram', 'viber')),
  constraint templates_org_id_name_channel_key
    unique (org_id, name, channel)
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  endpoint text not null,
  method text not null,
  status_code int,
  response_time_ms int,
  created_at timestamptz not null default now(),
  constraint usage_logs_method_check
    check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD')),
  constraint usage_logs_status_code_check
    check (status_code is null or status_code between 100 and 599),
  constraint usage_logs_response_time_ms_check
    check (response_time_ms is null or response_time_ms >= 0)
);

create table if not exists public.billing (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_messages int not null default 0,
  total_cost numeric(12, 4) not null default 0,
  plan text not null default 'free',
  status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  constraint billing_total_messages_check
    check (total_messages >= 0),
  constraint billing_total_cost_check
    check (total_cost >= 0),
  constraint billing_plan_check
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  constraint billing_status_check
    check (status in ('paid', 'unpaid', 'processing', 'overdue')),
  constraint billing_period_check
    check (period_end >= period_start),
  constraint billing_org_id_period_start_key
    unique (org_id, period_start)
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

create index if not exists idx_api_keys_org_id
  on public.api_keys (org_id);

create index if not exists idx_api_keys_key_hash
  on public.api_keys (key_hash);

create index if not exists idx_organization_members_org_id
  on public.organization_members (org_id);

create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);

create index if not exists idx_webhooks_org_id
  on public.webhooks (org_id);

create index if not exists idx_webhooks_org_id_active
  on public.webhooks (org_id, active);

create index if not exists idx_channel_connectors_org_id
  on public.channel_connectors (org_id);

create index if not exists idx_channel_connectors_org_id_active
  on public.channel_connectors (org_id, active);

create index if not exists idx_channel_connectors_org_id_channel
  on public.channel_connectors (org_id, channel);

create index if not exists idx_chatbots_org_id
  on public.chatbots (org_id);

create index if not exists idx_chatbots_org_id_updated_at
  on public.chatbots (org_id, updated_at desc);

create index if not exists idx_chatbot_intents_org_id
  on public.chatbot_intents (org_id);

create index if not exists idx_chatbot_intents_bot_id
  on public.chatbot_intents (bot_id);

create index if not exists idx_chatbot_nodes_org_id
  on public.chatbot_nodes (org_id);

create index if not exists idx_chatbot_nodes_bot_id_step_order
  on public.chatbot_nodes (bot_id, step_order);

create index if not exists idx_phone_numbers_org_id
  on public.phone_numbers (org_id);

create index if not exists idx_phone_numbers_org_country_code
  on public.phone_numbers (org_id, country_code);

create index if not exists idx_verifications_org_id
  on public.verifications (org_id);

create index if not exists idx_verifications_org_created_at
  on public.verifications (org_id, created_at desc);

create index if not exists idx_templates_org_id
  on public.templates (org_id);

create index if not exists idx_templates_org_channel
  on public.templates (org_id, channel);

create index if not exists idx_usage_logs_org_id
  on public.usage_logs (org_id);

create index if not exists idx_usage_logs_org_endpoint_created_at
  on public.usage_logs (org_id, endpoint, created_at desc);

create index if not exists idx_billing_org_id
  on public.billing (org_id);

create index if not exists idx_billing_org_period_start
  on public.billing (org_id, period_start desc);

alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.analytics enable row level security;
alter table public.api_keys enable row level security;
alter table public.organization_members enable row level security;
alter table public.webhooks enable row level security;
alter table public.channel_connectors enable row level security;
alter table public.chatbots enable row level security;
alter table public.chatbot_intents enable row level security;
alter table public.chatbot_nodes enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.verifications enable row level security;
alter table public.templates enable row level security;
alter table public.usage_logs enable row level security;
alter table public.billing enable row level security;

alter table public.organizations force row level security;
alter table public.contacts force row level security;
alter table public.conversations force row level security;
alter table public.messages force row level security;
alter table public.campaigns force row level security;
alter table public.analytics force row level security;
alter table public.api_keys force row level security;
alter table public.organization_members force row level security;
alter table public.webhooks force row level security;
alter table public.channel_connectors force row level security;
alter table public.chatbots force row level security;
alter table public.chatbot_intents force row level security;
alter table public.chatbot_nodes force row level security;
alter table public.phone_numbers force row level security;
alter table public.verifications force row level security;
alter table public.templates force row level security;
alter table public.usage_logs force row level security;
alter table public.billing force row level security;

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

drop policy if exists organization_members_tenant_isolation on public.organization_members;
create policy organization_members_tenant_isolation
  on public.organization_members
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists api_keys_tenant_isolation on public.api_keys;
create policy api_keys_tenant_isolation
  on public.api_keys
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists webhooks_tenant_isolation on public.webhooks;
create policy webhooks_tenant_isolation
  on public.webhooks
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists channel_connectors_tenant_isolation on public.channel_connectors;
create policy channel_connectors_tenant_isolation
  on public.channel_connectors
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists chatbots_tenant_isolation on public.chatbots;
create policy chatbots_tenant_isolation
  on public.chatbots
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists chatbot_intents_tenant_isolation on public.chatbot_intents;
create policy chatbot_intents_tenant_isolation
  on public.chatbot_intents
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists chatbot_nodes_tenant_isolation on public.chatbot_nodes;
create policy chatbot_nodes_tenant_isolation
  on public.chatbot_nodes
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists phone_numbers_tenant_isolation on public.phone_numbers;
create policy phone_numbers_tenant_isolation
  on public.phone_numbers
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists verifications_tenant_isolation on public.verifications;
create policy verifications_tenant_isolation
  on public.verifications
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists templates_tenant_isolation on public.templates;
create policy templates_tenant_isolation
  on public.templates
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists usage_logs_tenant_isolation on public.usage_logs;
create policy usage_logs_tenant_isolation
  on public.usage_logs
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists billing_tenant_isolation on public.billing;
create policy billing_tenant_isolation
  on public.billing
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

commit;
