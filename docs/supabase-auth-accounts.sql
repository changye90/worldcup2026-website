-- OKcopa accounts: Supabase Auth (email + password) + verified seller linkage
-- Prerequisite: enable Email provider in Dashboard → Authentication → Providers
-- Set "Confirm email" ON so verified listings require email_confirmed_at.

-- Link verified sellers to auth.users (one profile per account)
alter table public.okcopa_verified_sellers
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.okcopa_verified_sellers
  add column if not exists email text;

create unique index if not exists okcopa_verified_sellers_user_id_uidx
  on public.okcopa_verified_sellers (user_id)
  where user_id is not null;

-- Tighten write policies: only the signed-in owner may register / update their seller row
drop policy if exists "verified_sellers_insert_all" on public.okcopa_verified_sellers;
drop policy if exists "verified_sellers_update_all" on public.okcopa_verified_sellers;

create policy "verified_sellers_insert_own"
  on public.okcopa_verified_sellers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "verified_sellers_update_own"
  on public.okcopa_verified_sellers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage: after this file, run docs/supabase-storage-ticket-proofs.sql
-- (creates INSERT for anon + authenticated on bucket ticket-proofs; fixes upload after login)
