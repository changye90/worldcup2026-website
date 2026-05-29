-- One-time: remove soft-archived duplicate ticket rows (~380+ buy junk).
-- Run in Supabase SQL Editor (uses service role — not available from anon REST).

delete from public.ticket_wall_posts
where summary ilike '%archived duplicate%'
   or detail ilike '%archived duplicate%';

-- Optional: allow future cleanup via anon REST (scripts/cleanup-ticket-wall-junk.mjs --apply)
-- drop policy if exists "ticket_wall_delete_all" on public.ticket_wall_posts;
-- create policy "ticket_wall_delete_all"
--   on public.ticket_wall_posts for delete to anon, authenticated using (true);
