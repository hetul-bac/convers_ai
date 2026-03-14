begin;

do $$
declare
  target_org_id constant uuid := '11111111-1111-4111-8111-111111111111';
begin
  delete from public.chatbot_nodes where org_id = target_org_id;
  delete from public.chatbot_intents where org_id = target_org_id;
  delete from public.chatbots where org_id = target_org_id;
  delete from public.channel_connectors where org_id = target_org_id;
  delete from public.webhooks where org_id = target_org_id;
  delete from public.organization_members where org_id = target_org_id;
  delete from public.api_keys where org_id = target_org_id;
  delete from public.usage_logs where org_id = target_org_id;
  delete from public.billing where org_id = target_org_id;
  delete from public.templates where org_id = target_org_id;
  delete from public.verifications where org_id = target_org_id;
  delete from public.phone_numbers where org_id = target_org_id;
  delete from public.analytics where org_id = target_org_id;
  delete from public.messages where org_id = target_org_id;
  delete from public.campaigns where org_id = target_org_id;
  delete from public.conversations where org_id = target_org_id;
  delete from public.contacts where org_id = target_org_id;

  insert into public.organizations (id, name, plan, created_at)
  values (target_org_id, 'ConversAI Test Org', 'pro', '2026-03-14 09:00:00+00')
  on conflict (id) do update
    set name = excluded.name,
        plan = excluded.plan,
        created_at = excluded.created_at;
end $$;

insert into public.contacts (id, org_id, phone, email, name, tags)
select
  ('20000000-0000-4000-8000-' || lpad(contact_no::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '+1555' || lpad((1000000 + contact_no)::text, 7, '0'),
  'contact' || contact_no || '@conversai.test',
  'Contact ' || contact_no,
  case
    when contact_no % 4 = 0 then array['vip', 'engaged']::text[]
    when contact_no % 4 = 1 then array['new', 'trial']::text[]
    when contact_no % 4 = 2 then array['support', 'follow-up']::text[]
    else array['newsletter']::text[]
  end
from generate_series(1, 100) as contact_no;

insert into public.phone_numbers (
  id,
  org_id,
  number,
  country_code,
  carrier,
  is_verified,
  is_active,
  created_at
)
values
  (
    '80000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '+14155550101',
    'US',
    'Verizon',
    true,
    true,
    '2026-02-12 09:15:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '+14155550102',
    'US',
    'AT&T',
    true,
    true,
    '2026-02-13 10:05:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '+919876543210',
    'IN',
    'Jio',
    true,
    true,
    '2026-02-14 11:40:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    '+918888777666',
    'IN',
    'Airtel',
    true,
    true,
    '2026-02-16 08:30:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    '+447700900101',
    'GB',
    'EE',
    true,
    true,
    '2026-02-17 13:10:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    '+447700900102',
    'GB',
    'Vodafone UK',
    false,
    true,
    '2026-02-19 15:45:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000007',
    '11111111-1111-4111-8111-111111111111',
    '+5511998765432',
    'BR',
    'Vivo',
    true,
    true,
    '2026-02-22 07:20:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000008',
    '11111111-1111-4111-8111-111111111111',
    '+5511987654321',
    'BR',
    'Claro',
    false,
    false,
    '2026-02-23 18:05:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000009',
    '11111111-1111-4111-8111-111111111111',
    '+6591234567',
    'SG',
    'Singtel',
    true,
    true,
    '2026-02-25 12:55:00+00'
  ),
  (
    '80000000-0000-4000-8000-000000000010',
    '11111111-1111-4111-8111-111111111111',
    '+6587654321',
    'SG',
    'StarHub',
    true,
    true,
    '2026-02-27 09:50:00+00'
  );

insert into public.verifications (
  id,
  org_id,
  to_number,
  code,
  channel,
  status,
  expires_at,
  created_at
)
values
  (
    '82000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '+14155550101',
    '481204',
    'sms',
    'verified',
    now() - interval '1 day' + interval '10 minutes',
    now() - interval '1 day'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '+14155550102',
    '913552',
    'whatsapp',
    'expired',
    now() - interval '4 hours',
    now() - interval '4 hours' - interval '10 minutes'
  ),
  (
    '82000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '+919876543210',
    '204118',
    'voice',
    'pending',
    now() + interval '10 minutes',
    now()
  ),
  (
    '82000000-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    '+918888777666',
    '771420',
    'sms',
    'pending',
    now() + interval '8 minutes',
    now() - interval '2 minutes'
  ),
  (
    '82000000-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    '+447700900101',
    '665190',
    'whatsapp',
    'verified',
    now() - interval '3 days' + interval '10 minutes',
    now() - interval '3 days'
  ),
  (
    '82000000-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    '+5511998765432',
    '152440',
    'voice',
    'expired',
    now() - interval '2 days' + interval '10 minutes',
    now() - interval '2 days'
  );

insert into public.messages (
  id,
  org_id,
  body,
  channel,
  status,
  sentiment_score,
  sentiment_label,
  cost,
  created_at
)
select
  ('30000000-0000-4000-8000-' || lpad((((channel_idx - 1) * 100) + seq_no)::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  initcap(channel_name) || ' message #' || seq_no || ' for campaign flow ' || ((seq_no - 1) % 10 + 1),
  channel_name,
  case seq_no % 5
    when 0 then 'queued'
    when 1 then 'sent'
    when 2 then 'delivered'
    when 3 then 'failed'
    else 'read'
  end,
  case seq_no % 3
    when 0 then 0.72
    when 1 then -0.41
    else 0.08
  end,
  case seq_no % 3
    when 0 then 'positive'
    when 1 then 'negative'
    else 'neutral'
  end,
  case channel_name
    when 'sms' then 0.014
    when 'whatsapp' then 0.022
    when 'rcs' then 0.031
    when 'telegram' then 0.010
    else 0.019
  end,
  '2026-02-13 00:00:00+00'::timestamptz
    + (((channel_idx - 1) * 100) + seq_no) * interval '47 minutes'
from (
  select *
  from unnest(array['sms', 'whatsapp', 'rcs', 'telegram', 'viber']::text[])
       with ordinality as channels(channel_name, channel_idx)
) as channel_data
cross join generate_series(1, 100) as seq_no;

insert into public.campaigns (
  id,
  org_id,
  name,
  message_body,
  channels,
  status,
  sent_count,
  delivered_count,
  created_at
)
select
  ('40000000-0000-4000-8000-' || lpad((((channel_idx - 1) * 10) + seq_no)::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  initcap(channel_name) || ' Campaign ' || seq_no,
  'Launch update for ' || channel_name || ' audience segment ' || seq_no,
  array[channel_name]::text[],
  case seq_no % 5
    when 0 then 'draft'
    when 1 then 'scheduled'
    when 2 then 'running'
    when 3 then 'completed'
    else 'paused'
  end,
  100 + (seq_no * 7),
  80 + (seq_no * 6),
  '2026-01-24 08:00:00+00'::timestamptz
    + (((channel_idx - 1) * 10) + seq_no) * interval '12 hours'
from (
  select *
  from unnest(array['sms', 'whatsapp', 'rcs', 'telegram', 'viber']::text[])
       with ordinality as channels(channel_name, channel_idx)
) as channel_data
cross join generate_series(1, 10) as seq_no;

insert into public.analytics (
  id,
  org_id,
  date,
  channel,
  sent,
  delivered,
  failed,
  cost,
  engagement_rate
)
select
  ('50000000-0000-4000-8000-' || lpad((((channel_idx - 1) * 30) + day_no)::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  ('2026-02-13'::date + (day_no - 1)),
  channel_name,
  140 + (channel_idx * 8) + day_no,
  125 + (channel_idx * 7) + day_no,
  5 + ((day_no + channel_idx) % 9),
  round(((140 + (channel_idx * 8) + day_no) * channel_cost)::numeric, 4),
  least(0.95, 0.28 + (day_no * 0.01) + (channel_idx * 0.02))
from (
  select *
  from unnest(
    array['sms', 'whatsapp', 'rcs', 'telegram', 'viber']::text[],
    array[0.014, 0.022, 0.031, 0.010, 0.019]::numeric[]
  ) with ordinality as channels(channel_name, channel_cost, channel_idx)
) as channel_data
cross join generate_series(1, 30) as day_no;

insert into public.templates (
  id,
  org_id,
  name,
  body,
  channel,
  variables,
  is_approved,
  created_at
)
select
  ('83000000-0000-4000-8000-' || lpad((((channel_idx - 1) * 5) + template_idx)::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  initcap(channel_name) || ' ' || template_name,
  template_body,
  channel_name,
  variables,
  template_idx in (1, 3, 5),
  '2026-02-18 06:00:00+00'::timestamptz
    + ((((channel_idx - 1) * 5) + template_idx) * interval '5 hours')
from (
  select *
  from unnest(array['sms', 'whatsapp', 'rcs', 'telegram', 'viber']::text[])
       with ordinality as channels(channel_name, channel_idx)
) as channel_data
cross join lateral (
  values
    (
      1,
      'Welcome Flow',
      'Hi {first_name}, welcome to ConversAI. Your workspace is ready to launch.',
      array['first_name']::text[]
    ),
    (
      2,
      'Order Update',
      'Hi {first_name}, order {order_id} is now {status}. Reply for support.',
      array['first_name', 'order_id', 'status']::text[]
    ),
    (
      3,
      'Password Reset',
      'Use code {otp_code} to confirm your sign in. It expires in 10 minutes.',
      array['otp_code']::text[]
    ),
    (
      4,
      'Appointment Reminder',
      'Reminder: {appointment_date} at {appointment_time} with {agent_name}.',
      array['appointment_date', 'appointment_time', 'agent_name']::text[]
    ),
    (
      5,
      'Feedback Request',
      'Hi {first_name}, rate your recent experience on ticket {ticket_id}.',
      array['first_name', 'ticket_id']::text[]
    )
) as template_data(template_idx, template_name, template_body, variables);

insert into public.billing (
  id,
  org_id,
  period_start,
  period_end,
  total_messages,
  total_cost,
  plan,
  status,
  created_at
)
select
  ('84000000-0000-4000-8000-' || lpad(day_no::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  current_date - (30 - day_no),
  current_date - (30 - day_no),
  210 + (day_no * 11),
  round(((210 + (day_no * 11)) * 0.0215)::numeric, 4),
  'pro',
  case
    when day_no <= 26 then 'paid'
    when day_no <= 29 then 'processing'
    else 'unpaid'
  end,
  ((current_date - (30 - day_no))::timestamptz + interval '20 hours')
from generate_series(1, 30) as day_no;

insert into public.usage_logs (
  id,
  org_id,
  endpoint,
  method,
  status_code,
  response_time_ms,
  created_at
)
select
  ('85000000-0000-4000-8000-' || lpad(log_no::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  (array[
    '/api/messages',
    '/api/campaigns',
    '/api/lookup',
    '/api/numbers',
    '/api/templates',
    '/api/verify/send',
    '/api/verify/check',
    '/api/analytics',
    '/api/usage',
    '/api/health'
  ]::text[])[((log_no - 1) % 10) + 1],
  (array[
    'POST',
    'POST',
    'GET',
    'GET',
    'GET',
    'POST',
    'POST',
    'GET',
    'GET',
    'GET'
  ]::text[])[((log_no - 1) % 10) + 1],
  case
    when log_no % 17 = 0 then 500
    when log_no % 11 = 0 then 429
    when log_no % 7 = 0 then 202
    else 200
  end,
  72 + ((log_no * 37) % 410),
  now() - interval '29 days' + (log_no * interval '7 hours')
from generate_series(1, 100) as log_no;

insert into public.api_keys (id, org_id, name, key_hash, is_active, created_at)
values
  (
    gen_random_uuid(),
    '11111111-1111-4111-8111-111111111111',
    'Production Key',
    encode(digest('ca_live_demo_key_production_12345678901234567890123456', 'sha256'), 'hex'),
    true,
    now()
  ),
  (
    gen_random_uuid(),
    '11111111-1111-4111-8111-111111111111',
    'Test Key',
    encode(digest('ca_live_demo_key_testing_12345678901234567890123456', 'sha256'), 'hex'),
    true,
    now()
  );

insert into public.channel_connectors (
  id,
  org_id,
  channel,
  name,
  provider,
  transport_mode,
  status,
  config,
  error_message,
  last_tested_at,
  active,
  created_at,
  updated_at
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'sms',
    'SMS Sandbox Connector',
    'conversai_sandbox',
    'sandbox',
    'connected',
    jsonb_build_object(
      'workspace_id', 'demo-conversai-workspace',
      'app_key', 'demo-conversai-key',
      'app_secret', 'demo-conversai-secret'
    ),
    null,
    '2026-03-14 10:00:00+00',
    true,
    '2026-03-14 10:00:00+00',
    '2026-03-14 10:00:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'whatsapp',
    'WhatsApp Sandbox Connector',
    'conversai_sandbox',
    'sandbox',
    'connected',
    jsonb_build_object(
      'workspace_id', 'demo-conversai-workspace',
      'app_key', 'demo-conversai-key',
      'app_secret', 'demo-conversai-secret'
    ),
    null,
    '2026-03-14 10:02:00+00',
    true,
    '2026-03-14 10:02:00+00',
    '2026-03-14 10:02:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'rcs',
    'RCS Sandbox Connector',
    'conversai_sandbox',
    'sandbox',
    'connected',
    jsonb_build_object(
      'workspace_id', 'demo-conversai-workspace',
      'app_key', 'demo-conversai-key',
      'app_secret', 'demo-conversai-secret'
    ),
    null,
    '2026-03-14 10:04:00+00',
    true,
    '2026-03-14 10:04:00+00',
    '2026-03-14 10:04:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'telegram',
    'Telegram Sandbox Connector',
    'conversai_sandbox',
    'sandbox',
    'connected',
    jsonb_build_object(
      'workspace_id', 'demo-conversai-workspace',
      'app_key', 'demo-conversai-key',
      'app_secret', 'demo-conversai-secret'
    ),
    null,
    '2026-03-14 10:06:00+00',
    true,
    '2026-03-14 10:06:00+00',
    '2026-03-14 10:06:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'viber',
    'Viber Sandbox Connector',
    'conversai_sandbox',
    'sandbox',
    'connected',
    jsonb_build_object(
      'workspace_id', 'demo-conversai-workspace',
      'app_key', 'demo-conversai-key',
      'app_secret', 'demo-conversai-secret'
    ),
    null,
    '2026-03-14 10:08:00+00',
    true,
    '2026-03-14 10:08:00+00',
    '2026-03-14 10:08:00+00'
  );

insert into public.chatbots (
  id,
  org_id,
  name,
  description,
  status,
  default_channel,
  welcome_message,
  fallback_message,
  created_at,
  updated_at
)
values (
  '70000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'Support Triage Assistant',
  'Classifies pricing, delivery, and agent escalation questions across the messaging hub.',
  'published',
  'whatsapp',
  'Hi, I am the ConversAI support assistant. Ask about pricing, order delivery, or connecting to a live agent.',
  'I did not catch that. Try pricing, order status, or live agent.',
  '2026-03-14 10:10:00+00',
  '2026-03-14 10:10:00+00'
);

insert into public.chatbot_intents (
  id,
  org_id,
  bot_id,
  name,
  description,
  sample_utterances,
  response_template,
  priority,
  created_at,
  updated_at
)
values
  (
    '71000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    'pricing_request',
    'Handles questions about pricing, bundles, and message packs.',
    array['How much does it cost?', 'Show me SMS pricing', 'What plan should I buy?']::text[],
    'Our bundles start with low-volume developer testing, then scale into multi-channel plans. I can share pricing or connect you with sales.',
    90,
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    'delivery_status',
    'Handles order status, delivery, and tracking style questions.',
    array['Where is my order?', 'Track my delivery', 'Did my message get delivered?']::text[],
    'I can help verify the latest delivery event, failed sends, and webhook updates. Share the campaign or message context and I will guide the next step.',
    95,
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    'agent_handoff',
    'Escalates to a live support or sales representative.',
    array['Talk to a human', 'Connect me to support', 'I need an agent']::text[],
    'I can route this conversation to a live teammate. Please share your name, channel, and the issue you want escalated.',
    100,
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  );

insert into public.chatbot_nodes (
  id,
  org_id,
  bot_id,
  intent_id,
  node_key,
  title,
  node_type,
  content,
  next_node_key,
  step_order,
  position_x,
  position_y,
  metadata,
  created_at,
  updated_at
)
values
  (
    '72000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    null,
    'welcome',
    'Welcome',
    'message',
    'Welcome to ConversAI. I can help with pricing, delivery status, or connect you to a live agent.',
    'routing_hint',
    1,
    0,
    0,
    '{}'::jsonb,
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    null,
    'routing_hint',
    'Routing Prompt',
    'question',
    'Tell me whether you need pricing, delivery support, or a live agent.',
    'pricing_response',
    2,
    250,
    0,
    jsonb_build_object('branching', true),
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    'pricing_response',
    'Pricing Response',
    'message',
    'Our messaging plans scale from sandbox testing to multi-channel production usage. I can share recommended pricing and channel mix next.',
    'end',
    3,
    520,
    -120,
    jsonb_build_object('tone', 'sales'),
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    'delivery_response',
    'Delivery Response',
    'message',
    'I can check whether a message was delivered, failed, or queued and point you to the next recovery step.',
    'end',
    4,
    520,
    0,
    jsonb_build_object('tone', 'support'),
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000003',
    'handoff_response',
    'Agent Handoff',
    'handoff',
    'I am routing this to a live teammate. Please share the channel, priority, and any account details you want attached.',
    'end',
    5,
    520,
    120,
    jsonb_build_object('handoff_team', 'support'),
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  ),
  (
    '72000000-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    '70000000-0000-4000-8000-000000000001',
    null,
    'end',
    'Conversation End',
    'end',
    'Thanks for contacting ConversAI. You can ask another question at any time.',
    null,
    6,
    780,
    0,
    '{}'::jsonb,
    '2026-03-14 10:10:00+00',
    '2026-03-14 10:10:00+00'
  );

commit;
