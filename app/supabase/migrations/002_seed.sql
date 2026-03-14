begin;

do $$
declare
  target_org_id constant uuid := '11111111-1111-4111-8111-111111111111';
begin
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

commit;
