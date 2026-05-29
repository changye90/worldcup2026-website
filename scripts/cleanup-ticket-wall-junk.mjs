#!/usr/bin/env node
/**
 * Remove archived-duplicate rows from Supabase ticket_wall_posts.
 *
 * Usage:
 *   node scripts/cleanup-ticket-wall-junk.mjs           # dry-run (count only)
 *   node scripts/cleanup-ticket-wall-junk.mjs --apply   # DELETE via REST
 *
 * Requires `.env.local` with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
 * If DELETE returns 0 rows, run docs/supabase-cleanup-archived.sql in Supabase SQL Editor
 * (service role / dashboard — anon may lack delete policy).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(ROOT, '.env.local')),
  ...process.env,
};
const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
const apply = process.argv.includes('--apply');

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function fetchJunkIds() {
  const ids = [];
  let offset = 0;
  const pageSize = 500;
  while (true) {
    const q = new URL(`${url}/rest/v1/ticket_wall_posts`);
    q.searchParams.set('select', 'id,kind,summary');
    q.searchParams.set('summary', 'ilike.*archived*duplicate*');
    q.searchParams.set('order', 'created_at_ms.desc');
    q.searchParams.set('limit', String(pageSize));
    q.searchParams.set('offset', String(offset));
    const res = await fetch(q, { headers });
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    ids.push(...rows.map(r => r.id));
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return ids;
}

async function deleteIds(batch) {
  const q = `${url}/rest/v1/ticket_wall_posts?id=in.(${batch.map(encodeURIComponent).join(',')})`;
  const res = await fetch(q, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=representation' },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`delete failed: ${res.status} ${JSON.stringify(body)}`);
  return Array.isArray(body) ? body.length : 0;
}

async function main() {
  const ids = await fetchJunkIds();
  console.log(`Found ${ids.length} archived-duplicate row(s).`);
  if (!apply) {
    console.log('Dry run — pass --apply to delete. Or run docs/supabase-cleanup-archived.sql in Supabase.');
    return;
  }
  let removed = 0;
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    const n = await deleteIds(batch);
    removed += n;
    process.stdout.write(`\rDeleted ${removed}/${ids.length}…`);
  }
  console.log(`\nDone. Deleted ${removed} row(s).`);
  if (removed === 0 && ids.length > 0) {
    console.log(
      '\nNo rows deleted — add delete policy in Supabase (see docs/supabase-cleanup-archived.sql) and re-run.',
    );
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
