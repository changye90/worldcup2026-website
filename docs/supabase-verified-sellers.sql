-- OKcopa verified sellers + ticket proof storage (run in Supabase SQL Editor)

create table if not exists public.okcopa_verified_sellers (
  id text primary key,
  display_name text not null,
  whatsapp text not null,
  proof_urls jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  created_at_ms bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists okcopa_verified_sellers_whatsapp_idx
  on public.okcopa_verified_sellers (whatsapp);

alter table public.okcopa_verified_sellers enable row level security;

drop policy if exists "verified_sellers_read_all" on public.okcopa_verified_sellers;
drop policy if exists "verified_sellers_insert_all" on public.okcopa_verified_sellers;
drop policy if exists "verified_sellers_update_all" on public.okcopa_verified_sellers;

create policy "verified_sellers_read_all"
  on public.okcopa_verified_sellers for select to anon, authenticated using (true);

create policy "verified_sellers_insert_all"
  on public.okcopa_verified_sellers for insert to anon, authenticated with check (true);

create policy "verified_sellers_update_all"
  on public.okcopa_verified_sellers for update to anon, authenticated
  using (true) with check (true);

-- Storage bucket (Dashboard → Storage → New bucket): ticket-proofs, public read
-- Policies (Storage → ticket-proofs → Policies):
--   SELECT: public
--   INSERT: anon + authenticated
