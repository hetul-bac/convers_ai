begin;

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

alter table public.channel_connectors enable row level security;
alter table public.chatbots enable row level security;
alter table public.chatbot_intents enable row level security;
alter table public.chatbot_nodes enable row level security;

alter table public.channel_connectors force row level security;
alter table public.chatbots force row level security;
alter table public.chatbot_intents force row level security;
alter table public.chatbot_nodes force row level security;

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

commit;
