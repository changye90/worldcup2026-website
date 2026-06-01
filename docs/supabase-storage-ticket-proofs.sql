-- OKcopa ticket proof images (Storage bucket: ticket-proofs)
-- Dashboard → Storage → New bucket → name: ticket-proofs → Public bucket: ON
-- Then run this entire file in SQL Editor.

drop policy if exists "ticket_proofs_public_read" on storage.objects;
drop policy if exists "ticket_proofs_insert_anon" on storage.objects;
drop policy if exists "ticket_proofs_insert_authenticated" on storage.objects;
drop policy if exists "ticket_proofs_update_authenticated" on storage.objects;

-- Anyone can view proof images (public listings / OG)
create policy "ticket_proofs_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'ticket-proofs');

-- Guest-era uploads (legacy) + logged-in verified seller uploads
create policy "ticket_proofs_insert_anon"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'ticket-proofs');

create policy "ticket_proofs_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'ticket-proofs');

create policy "ticket_proofs_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'ticket-proofs')
  with check (bucket_id = 'ticket-proofs');
