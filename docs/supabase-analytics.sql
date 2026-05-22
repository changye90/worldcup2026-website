-- OKcopa site analytics (PV / UV / click events)
-- Run in Supabase SQL Editor after ticket_wall_posts is set up.

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  visitor_id text not null,
  session_id text,
  path text,
  referrer text,
  props jsonb,
  created_at_ms bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists site_analytics_events_event_created_idx
  on public.site_analytics_events (event, created_at_ms desc);

create index if not exists site_analytics_events_visitor_idx
  on public.site_analytics_events (visitor_id, created_at_ms desc);

alter table public.site_analytics_events enable row level security;

-- Anonymous visitors can only insert events (no read — query in dashboard with service role or SQL editor)
create policy "analytics_insert_anon"
  on public.site_analytics_events
  for insert
  to anon, authenticated
  with check (true);

-- Example queries (SQL Editor):
-- PV today:  select count(*) from site_analytics_events where event = 'page_view' and created_at_ms > extract(epoch from now() - interval '1 day') * 1000;
-- UV today:  select count(distinct visitor_id) from site_analytics_events where event = 'page_view' and created_at_ms > extract(epoch from now() - interval '1 day') * 1000;
-- Ticket WA: select count(*) from site_analytics_events where event = 'ticket_whatsapp_click' and created_at_ms > ...;
