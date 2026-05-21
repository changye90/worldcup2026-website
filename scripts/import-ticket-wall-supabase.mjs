#!/usr/bin/env node
/**
 * Import ticket wall rows from Excel/CSV into Supabase `ticket_wall_posts`.
 *
 * Usage:
 *   node scripts/import-ticket-wall-supabase.mjs ./data/tickets.xlsx
 *   node scripts/import-ticket-wall-supabase.mjs ./data/tickets.csv --dry-run
 *
 * Requires `.env.local`:
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)
 *
 * Sheet columns (中文/英文均可，首行为表头):
 *   交易类 / kind          → sell | buy
 *   国家 / country         → optional, for flag
 *   比赛 / match           → e.g. Germany vs Curaçao
 *   门票张数 / quantity
 *   门票等级 / category    → e.g. Cat 1
 *   价格 / price           → 面议 / Negotiable / $350
 *   描述 / description     → notes + optional Block/Section parsed as seatDetails
 *   卖家联系方式 / whatsapp → phone digits OR full https://wa.me/... link
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MATCHES_JSON = path.join(ROOT, 'functions/data/matches-og.json');

const FIELD_ALIASES = {
  kind: ['交易类', '交易类型', 'kind', 'type', 'Type'],
  country: ['国家', 'country', 'Country'],
  match: ['比赛', '对阵', 'match', 'Match', '赛事'],
  quantity: ['门票张数', '张数', '数量', 'quantity', 'Quantity', 'qty'],
  category: ['门票等级', '等级', 'category', 'Category', 'cat'],
  price: ['价格', 'price', 'Price'],
  description: ['描述', '说明', 'notes', 'description', 'Description', '备注'],
  whatsapp: [
    '卖家联系方式',
    '联系方式',
    'whatsapp',
    'WhatsApp',
    '联系',
    '卖家联系',
    'phone',
  ],
};

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

function pickField(fields, aliases) {
  const keys = Object.keys(fields || {});
  for (const a of aliases) {
    const exact = keys.find(k => k === a || k.trim() === a);
    if (exact !== undefined) return fields[exact];
  }
  for (const a of aliases) {
    const loose = keys.find(k => k.replace(/\s/g, '') === a.replace(/\s/g, ''));
    if (loose !== undefined) return fields[loose];
  }
  return undefined;
}

function normalizeScalar(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return String(v);
}

function normalizeHeaderRow(raw) {
  const fields = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).replace(/^\uFEFF/, '').trim();
    if (key) fields[key] = v;
  }
  return fields;
}

function normalizeKind(raw) {
  const s = String(normalizeScalar(raw)).trim().toLowerCase();
  if (s === 'buy' || s === '买' || s === '求' || s === '求票') return 'buy';
  return 'sell';
}

function parseQuantity(raw) {
  const n = parseInt(String(normalizeScalar(raw)).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 1;
}

function parsePrice(raw) {
  const s = String(normalizeScalar(raw)).trim();
  if (!s) return { priceType: 'negotiable', priceAmount: undefined };
  if (/面议|议价|negotiable|tbd|待定/i.test(s)) {
    return { priceType: 'negotiable', priceAmount: undefined };
  }
  const num = parseFloat(s.replace(/[^\d.]/g, ''));
  if (Number.isFinite(num) && num > 0) return { priceType: 'fixed', priceAmount: num };
  return { priceType: 'negotiable', priceAmount: undefined };
}

function parseWhatsapp(raw) {
  const s = String(normalizeScalar(raw)).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || /wa\.me\//i.test(s)) {
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  }
  return s.replace(/\s/g, '');
}

function countryToFlag(country) {
  const c = String(country).trim().toLowerCase();
  if (c.includes('mex') || c.includes('墨西哥')) return '🇲🇽';
  if (c.includes('usa') || c.includes('美国') || c.includes('美')) return '🇺🇸';
  if (c.includes('can') || c.includes('加拿大')) return '🇨🇦';
  return '🏳️';
}

function normalizeTeam(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/cura[cç]ao/gi, 'curaçao');
}

function parseMatchLine(text) {
  const t = String(text)
    .trim()
    .replace(/\s*x\s*/gi, ' vs ')
    .replace(/\s+-\s+/g, ' vs ');
  const m = t.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (!m) return null;
  return { home: m[1].trim(), away: m[2].trim() };
}

function loadMatches() {
  if (!fs.existsSync(MATCHES_JSON)) {
    console.error(`Missing ${MATCHES_JSON}. Run: npm run export:og-matches`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MATCHES_JSON, 'utf8'));
}

function findMatch(matches, line) {
  const parsed = parseMatchLine(line);
  if (!parsed) return null;
  const home = normalizeTeam(parsed.home);
  const away = normalizeTeam(parsed.away);
  return (
    matches.find(
      m =>
        normalizeTeam(m.homeTeam) === home && normalizeTeam(m.awayTeam) === away,
    ) ?? null
  );
}

function formatMatchOption(m) {
  return `Match ${m.matchNumber} · ${m.homeTeam} vs ${m.awayTeam}`;
}

function extractSeatDetails(description, category) {
  const d = String(description || '');
  const block = d.match(/\bBlock\s*(\d+[A-Za-z]?)/i);
  if (block) return `Block ${block[1]}`;
  const sec = d.match(/\bSec(?:tion)?\s*(\d+[A-Za-z]?)/i);
  if (sec) return `Section ${sec[1]}`;
  const catBlock = d.match(new RegExp(`${category}\\s*[-–]\\s*Block\\s*(\\d+)`, 'i'));
  if (catBlock) return `Block ${catBlock[1]}`;
  return undefined;
}

function buildSellSummary(payload) {
  const parts = [payload.matches.join(' / '), `${payload.quantity} ticket${payload.quantity !== 1 ? 's' : ''}`];
  if (payload.category) parts.push(payload.category);
  if (payload.seatDetails) parts.push(payload.seatDetails);
  if (payload.priceType === 'negotiable') parts.push('Negotiable');
  else if (payload.priceAmount != null) parts.push(`$${payload.priceAmount} USD`);
  return parts.join(' · ');
}

function buildSellDetail(payload) {
  const lines = [
    `Match(es): ${payload.matches.join('; ')}`,
    `Quantity: ${payload.quantity}`,
  ];
  if (payload.category) lines.push(`Category: ${payload.category}`);
  if (payload.seatDetails) lines.push(`Seat details: ${payload.seatDetails}`);
  if (payload.priceType === 'negotiable') lines.push('Price: Negotiable');
  else if (payload.priceAmount != null) lines.push(`Price: $${payload.priceAmount} USD`);
  if (payload.notes) lines.push(`Notes: ${payload.notes}`);
  lines.push(`WhatsApp: ${payload.whatsapp}`);
  return lines.join('\n');
}

function buildBuySummary(payload) {
  const parts = [
    payload.targetMatch,
    `${payload.quantity} ticket${payload.quantity !== 1 ? 's' : ''}`,
  ];
  if (payload.category) parts.push(payload.category);
  if (payload.seatDetails) parts.push(payload.seatDetails);
  if (payload.budget) parts.push(payload.budget);
  return parts.join(' · ');
}

function buildBuyDetail(payload) {
  const lines = [
    `Target match: ${payload.targetMatch}`,
    `Quantity: ${payload.quantity}`,
  ];
  if (payload.category) lines.push(`Category: ${payload.category}`);
  if (payload.seatDetails) lines.push(`Seat details: ${payload.seatDetails}`);
  if (payload.budget) lines.push(`Budget: ${payload.budget}`);
  lines.push(`WhatsApp: ${payload.whatsapp}`);
  return lines.join('\n');
}

function rowToPost(fields, index, matches) {
  const kind = normalizeKind(pickField(fields, FIELD_ALIASES.kind));
  const country = String(normalizeScalar(pickField(fields, FIELD_ALIASES.country))).trim();
  const matchRaw = String(normalizeScalar(pickField(fields, FIELD_ALIASES.match))).trim();
  const quantity = parseQuantity(pickField(fields, FIELD_ALIASES.quantity));
  const category = String(normalizeScalar(pickField(fields, FIELD_ALIASES.category))).trim() || undefined;
  const { priceType, priceAmount } = parsePrice(pickField(fields, FIELD_ALIASES.price));
  const description = String(normalizeScalar(pickField(fields, FIELD_ALIASES.description))).trim();
  const whatsapp = parseWhatsapp(pickField(fields, FIELD_ALIASES.whatsapp));

  if (!matchRaw && !description) return null;
  if (!whatsapp) {
    console.warn(`[row ${index + 2}] skip: missing WhatsApp / 联系方式`);
    return null;
  }

  const flag = countryToFlag(country);
  const username = `Seller${1000 + index}`;
  const seatDetails = extractSeatDetails(description, category);
  const id = `import-${Date.now()}-${index}`;
  const createdAt = Date.now() - index * 60_000;

  if (kind === 'buy') {
    const targetMatch = matchRaw || description.slice(0, 140);
    const payload = {
      targetMatch,
      quantity,
      category,
      seatDetails,
      budget: priceType === 'fixed' && priceAmount != null ? `$${priceAmount}` : '面议',
      whatsapp,
    };
    return {
      id,
      kind: 'buy',
      flag,
      username,
      summary: buildBuySummary(payload),
      detail: buildBuyDetail(payload),
      created_at_ms: createdAt,
      payload,
    };
  }

  const m = matchRaw ? findMatch(matches, matchRaw) : null;
  const matchLabel = m ? formatMatchOption(m) : matchRaw || 'Custom match';
  const payload = {
    matches: [matchLabel],
    quantity,
    category,
    seatDetails,
    priceType,
    priceAmount,
    whatsapp,
    notes: description || undefined,
  };

  if (!m && matchRaw) {
    console.warn(`[row ${index + 2}] no schedule match for "${matchRaw}" — stored as custom text`);
  }

  return {
    id,
    kind: 'sell',
    flag,
    username,
    summary: buildSellSummary(payload),
    detail: buildSellDetail(payload),
    created_at_ms: createdAt,
    payload,
  };
}

function readRows(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(a => !a.startsWith('--'));
  if (!fileArg) {
    console.error('Usage: node scripts/import-ticket-wall-supabase.mjs <file.xlsx|csv> [--dry-run]');
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const env = {
    ...loadEnvFile(path.join(ROOT, '.env')),
    ...loadEnvFile(path.join(ROOT, '.env.local')),
  };
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL and SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const matches = loadMatches();
  const rawRows = readRows(filePath);
  const posts = [];

  rawRows.forEach((raw, i) => {
    const fields = normalizeHeaderRow(raw);
    const post = rowToPost(fields, i, matches);
    if (post) posts.push(post);
  });

  console.log(`Parsed ${posts.length} posts from ${path.basename(filePath)}`);
  if (posts.length === 0) {
    process.exit(1);
  }

  posts.slice(0, 3).forEach((p, i) => {
    console.log(`\n--- sample ${i + 1} (${p.kind}) ---`);
    console.log('summary:', p.summary);
    console.log('whatsapp:', p.payload?.whatsapp);
  });

  if (dryRun) {
    console.log('\n[dry-run] No rows written to Supabase.');
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('ticket_wall_posts').upsert(posts, { onConflict: 'id' });

  if (error) {
    console.error('Supabase upsert failed:', error.message);
    if (error.message.includes('policy') || error.code === '42501') {
      console.error('Check RLS: anon needs INSERT on ticket_wall_posts (see docs/supabase-ticket-wall.sql)');
    }
    process.exit(1);
  }

  console.log(`\nImported ${posts.length} rows into ticket_wall_posts.`);
  console.log('Refresh the site Tickets tab to see listings.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
