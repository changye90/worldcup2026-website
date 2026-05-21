-- OKcopa ticket wall (run once in Supabase SQL Editor)
-- Posts store form fields in `payload` (jsonb). New fields like seatDetails need no ALTER TABLE.

create table if not exists public.ticket_wall_posts (
  id text primary key,
  kind text not null check (kind in ('buy', 'sell')),
  flag text not null,
  username text not null,
  summary text not null,
  detail text not null,
  created_at_ms bigint not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_wall_posts_created_at_ms_idx
  on public.ticket_wall_posts (created_at_ms desc);

alter table public.ticket_wall_posts enable row level security;

drop policy if exists "ticket_wall_read_all" on public.ticket_wall_posts;
drop policy if exists "ticket_wall_insert_all" on public.ticket_wall_posts;
drop policy if exists "ticket_wall_update_all" on public.ticket_wall_posts;

create policy "ticket_wall_read_all"
  on public.ticket_wall_posts for select to anon, authenticated using (true);

create policy "ticket_wall_insert_all"
  on public.ticket_wall_posts for insert to anon, authenticated with check (true);

create policy "ticket_wall_update_all"
  on public.ticket_wall_posts for update to anon, authenticated
  using (true) with check (true);

-- Example payload after adding seat details (sell):
-- {"matches":["Match 1 · A vs B"],"quantity":2,"category":"Cat 2","seatDetails":"Sec 102 Row 12","whatsapp":"1234567890",...}
