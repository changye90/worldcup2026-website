#!/usr/bin/env node
/**
 * Import hotel rows from data/hotel-supply.xlsx → src/data/hotelsSupply.ts
 *
 *   node scripts/import-hotel-supply.mjs ./data/hotel-supply.xlsx
 *   npm run import:hotels -- ./data/hotel-supply.xlsx
 *
 * Last-column `whatsapp`: while empty the app grays out WhatsApp/Call; after you fill numbers,
 * run `npm run import:hotels` again. Unlabeled column after `whatsapp` is read as `__EMPTY` in xlsx — we merge digits from there too.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/data/hotelsSupply.ts');

const HOTEL_ID_START = Number(process.env.HOTEL_ID_START || 4001);

const FIELD_ALIASES = {
  id: ['id', 'ID', '编号', '序号', '帖子id'],
  city: ['city', '城市', 'City'],
  title: ['title', '商户名称', '酒店名称', '名称', '商铺名称', 'name'],
  imageUrl: ['imageUrl', '图片', '图片链接', '封面', 'Image', 'image'],
  pricePerNight: ['pricePerNight', '价格', 'Price', 'price'],
  rating: ['rating', '评分', 'stars', 'MW4etd'],
  host: ['host', '商户名称', '酒店名称', 'Host'],
  whatsapp: [
    'whatsapp',
    'WhatsApp',
    'Whatsapp',
    '手机',
    '电话',
    'Phone',
    'phone',
    '联系电话',
    '手机号',
    'WhatsApp号',
    'WA',
  ],
  blurb: ['简介', 'description', 'desc'],
  country: ['国家', 'country', 'Country'],
};

const AMENITY_KEYS = ['属性1', '属性2', '属性3', '属性4'];

function pickField(fields, aliases) {
  const keys = Object.keys(fields || {});
  for (const a of aliases) {
    const exact = keys.find((k) => k === a);
    if (exact !== undefined) return fields[exact];
    const trim = keys.find((k) => k.trim() === a);
    if (trim !== undefined) return fields[trim];
  }
  for (const a of aliases) {
    const loose = keys.find((k) => k.replace(/\s/g, '') === a.replace(/\s/g, ''));
    if (loose !== undefined) return fields[loose];
  }
  return undefined;
}

function normalizeScalar(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) {
    return v.map((item) => (item == null ? '' : String(item))).join('');
  }
  if (typeof v === 'object') {
    if ('text' in v && v.text != null) return String(v.text);
    if ('result' in v && v.result != null) return String(v.result);
  }
  return String(v);
}

function parseIntSafe(v, fallback = 0) {
  const n = parseInt(String(normalizeScalar(v)).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatSafe(v, fallback = 0) {
  const n = parseFloat(String(normalizeScalar(v)).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Match schedule / host-city strip (`Kansas City`) when the sheet says `Kansas`. */
function normalizeHostCity(city) {
  const c = String(city ?? '').trim();
  if (c === 'Kansas') return 'Kansas City';
  return c;
}

function normalizeHeaderRow(raw) {
  const fields = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).replace(/^\uFEFF/, '').trim();
    if (key) fields[key] = v;
  }
  return fields;
}

function isEffectivelyEmpty(fields) {
  const title = String(normalizeScalar(pickField(fields, FIELD_ALIASES.title))).trim();
  const city = String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim();
  return !title && !city;
}

function assignId(fields, index) {
  const raw = pickField(fields, FIELD_ALIASES.id);
  const s = raw === undefined || raw === null ? '' : String(normalizeScalar(raw)).trim();
  if (!s) return HOTEL_ID_START + index;
  const n = parseIntSafe(raw, 0);
  if (n <= 0) return HOTEL_ID_START + index;
  return n;
}

function amenitiesFromRow(fields) {
  const out = [];
  for (const k of AMENITY_KEYS) {
    const t = String(normalizeScalar(fields[k])).trim();
    if (t) out.push(t);
  }
  return out.length ? out : undefined;
}

const MIN_WHATSAPP_DIGITS = 8;

function digitsFromCell(v) {
  return String(normalizeScalar(v)).replace(/\D/g, '');
}

/** Primary `whatsapp` column, then xlsx trailing blank-header columns (`__EMPTY`, …). */
function pickWhatsappDigits(fields) {
  const primary = digitsFromCell(pickField(fields, FIELD_ALIASES.whatsapp));
  if (primary.length >= MIN_WHATSAPP_DIGITS) return primary;
  const keys = Object.keys(fields || {}).filter((k) => /^__EMPTY/.test(String(k)));
  keys.sort();
  for (const k of keys) {
    const alt = digitsFromCell(fields[k]);
    if (alt.length >= MIN_WHATSAPP_DIGITS) return alt;
  }
  return primary;
}

function rowFromFields(fields, index) {
  const id = assignId(fields, index);
  const city =
    normalizeHostCity(String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim()) || 'Unknown';
  const title = String(normalizeScalar(pickField(fields, FIELD_ALIASES.title))).trim() || 'Hotel';
  const imageUrl = String(normalizeScalar(pickField(fields, FIELD_ALIASES.imageUrl))).trim() || '';
  const priceRaw = String(normalizeScalar(pickField(fields, FIELD_ALIASES.pricePerNight))).replace(/[^\d.]/g, '');
  const pricePerNight = Math.max(0, Math.round(parseFloatSafe(priceRaw, 0)));
  const ratingRaw = pickField(fields, FIELD_ALIASES.rating);
  let rating = parseFloatSafe(ratingRaw, 4.5);
  if (rating > 5) rating = 5;
  if (rating < 0) rating = 0;
  const host = String(normalizeScalar(pickField(fields, FIELD_ALIASES.host))).trim() || title;
  const whatsapp = pickWhatsappDigits(fields);
  const blurb = String(normalizeScalar(pickField(fields, FIELD_ALIASES.blurb))).trim();
  const country = String(normalizeScalar(pickField(fields, FIELD_ALIASES.country))).trim();
  const amenities = amenitiesFromRow(fields);
  let locationDetail = blurb || undefined;
  if (country && blurb) locationDetail = `${country} · ${blurb}`;
  else if (country && !blurb) locationDetail = country;

  return {
    id,
    city,
    title,
    distanceKm: 0,
    pricePerNight,
    imageUrl: imageUrl || 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=800',
    bedrooms: 1,
    rating: Math.round(rating * 10) / 10,
    reviews: 0,
    host,
    whatsapp,
    locationDetail,
    amenities,
  };
}

function emitTs(rows, sourceLabel) {
  const j = (s) => JSON.stringify(s);
  const lines = rows.map(
    (r) => `  {
    id: ${r.id},
    city: ${j(r.city)},
    title: ${j(r.title)},
    distanceKm: ${r.distanceKm},
    pricePerNight: ${r.pricePerNight},
    imageUrl: ${j(r.imageUrl)},
    bedrooms: ${r.bedrooms},
    rating: ${r.rating},
    reviews: ${r.reviews},
    host: ${j(r.host)},
    whatsapp: ${j(r.whatsapp)}${
      r.locationDetail ? `,\n    locationDetail: ${j(r.locationDetail)}` : ''
    }${
      r.amenities?.length
        ? `,\n    amenities: [${r.amenities.map((a) => j(a)).join(', ')}]`
        : ''
    }
  }`,
  );
  return `/** Auto-generated from ${sourceLabel} by scripts/import-hotel-supply.mjs — do not edit by hand.
 * WhatsApp: last-column \`whatsapp\` (or trailing unlabeled column). Empty → WhatsApp/Call disabled on card until filled; then re-run \`npm run import:hotels\`.
 */

export const hotelsSupply = [
${lines.join(',\n')},
];
`;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`Usage: node scripts/import-hotel-supply.mjs <path/to/hotel-supply.xlsx>

Example:
  npm run import:hotels -- ./data/hotel-supply.xlsx`);
    process.exit(1);
  }

  const input = path.resolve(arg);
  if (!fs.existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(input);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  const rows = [];
  for (let i = 0; i < rawRows.length; i++) {
    const fields = normalizeHeaderRow(rawRows[i]);
    if (isEffectivelyEmpty(fields)) continue;
    rows.push(rowFromFields(fields, rows.length));
  }

  if (rows.length === 0) {
    console.error('No data rows found. Check header row and column names.');
    process.exit(1);
  }

  const label = path.basename(input);
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, emitTs(rows, label), 'utf8');
  fs.renameSync(tmp, OUT);
  console.log(`Sheet "${sheetName}": ${rows.length} rows → ${OUT}`);
}

main();
