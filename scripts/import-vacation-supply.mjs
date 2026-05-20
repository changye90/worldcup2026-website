#!/usr/bin/env node
/**
 * Import vacation rental rows from data/vacation-supply.xlsx → src/data/vacationRentalsSupply.ts
 *
 *   node scripts/import-vacation-supply.mjs ./data/vacation-supply.xlsx
 *   npm run import:vacations
 *
 * Missing price → 0 (UI shows “price pending”). Missing WhatsApp → "" (UI uses unified OKcopa contact).
 * Image column: use direct https image URLs. Google Maps thumbnails (`googleusercontent.com/gps-proxy` / `gps-cs-s`) often return 403 when embedded on your site — OKcopa falls back to a stock photo in the UI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/data/vacationRentalsSupply.ts');

const VACATION_ID_START = Number(process.env.VACATION_ID_START || 6001);

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1918291/pexels-photo-1918291.jpeg?auto=compress&cs=tinysrgb&w=800';

const FIELD_ALIASES = {
  id: ['id', 'ID', '编号', '序号', '帖子id'],
  city: ['city', '城市', 'City'],
  title: ['title', '商户名称', '名称', '商铺名称', 'name'],
  imageUrl: ['imageUrl', '图片', '图片链接', '封面', 'Image', 'image'],
  pricePerNight: ['pricePerNight', '价格', 'Price', 'price'],
  host: ['host', '商户名称', 'Host'],
  whatsapp: ['whatsapp', 'WhatsApp', 'Whatsapp', '手机', '电话'],
  blurb: ['简介', 'description', 'desc'],
  country: ['国家', 'country', 'Country'],
  listingType: ['listingType', '类型', 'type', 'Type'],
};

const AMENITY_EXTRA_KEYS = ['属性2', '属性3', '属性4'];

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
  if (!s) return VACATION_ID_START + index;
  const n = parseIntSafe(raw, 0);
  if (n <= 0) return VACATION_ID_START + index;
  return n;
}

function parseBedrooms(blurb) {
  const s = String(normalizeScalar(blurb));
  const m = s.match(/(\d+)\s*(bedroom|bedrooms)\b/i);
  if (m) return Math.min(20, Math.max(1, parseInt(m[1], 10)));
  const m2 = s.match(/(\d+)\s*bed\b/i);
  if (m2) return Math.min(20, Math.max(1, parseInt(m2[1], 10)));
  return 1;
}

function amenitiesFromRow(fields) {
  const a1 = String(normalizeScalar(fields['属性1'])).trim();
  const extras = AMENITY_EXTRA_KEYS.map((k) => String(normalizeScalar(fields[k])).trim()).filter(Boolean);
  if (a1 || extras.length) {
    return [a1, ...extras].filter(Boolean).slice(0, 4);
  }
  const kind = String(normalizeScalar(pickField(fields, FIELD_ALIASES.listingType))).trim();
  const blurb = String(normalizeScalar(pickField(fields, FIELD_ALIASES.blurb))).trim();
  const pills = [];
  if (kind) pills.push(kind);
  if (blurb) pills.push(blurb.length > 90 ? `${blurb.slice(0, 87)}…` : blurb);
  return pills.length ? pills.slice(0, 4) : undefined;
}

function rowFromFields(fields, index) {
  const id = assignId(fields, index);
  const city =
    normalizeHostCity(String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim()) || 'Unknown';
  const title = String(normalizeScalar(pickField(fields, FIELD_ALIASES.title))).trim() || 'Stay';
  let imageUrl = String(normalizeScalar(pickField(fields, FIELD_ALIASES.imageUrl))).trim();
  if (!imageUrl) imageUrl = FALLBACK_IMAGE;
  const priceRaw = String(normalizeScalar(pickField(fields, FIELD_ALIASES.pricePerNight))).replace(/[^\d.]/g, '');
  const pricePerNight = Math.max(0, Math.round(parseFloatSafe(priceRaw, 0)));
  const blurb = String(normalizeScalar(pickField(fields, FIELD_ALIASES.blurb))).trim();
  const bedrooms = parseBedrooms(blurb);
  const country = String(normalizeScalar(pickField(fields, FIELD_ALIASES.country))).trim();
  const listingType = String(normalizeScalar(pickField(fields, FIELD_ALIASES.listingType))).trim();
  let locationDetail;
  if (country && listingType) locationDetail = `${country} · ${listingType}`;
  else if (country) locationDetail = country;
  else if (listingType) locationDetail = listingType;
  const host = String(normalizeScalar(pickField(fields, FIELD_ALIASES.host))).trim() || title;
  const whatsapp = String(normalizeScalar(pickField(fields, FIELD_ALIASES.whatsapp))).replace(/\D/g, '') || '';
  const amenities = amenitiesFromRow(fields);

  return {
    id,
    city,
    title,
    distanceKm: 0,
    pricePerNight,
    imageUrl,
    bedrooms,
    rating: 4.6,
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
  return `/** Auto-generated from ${sourceLabel} by scripts/import-vacation-supply.mjs — do not edit by hand.
 * Price 0 = missing in sheet (UI shows pending). Empty whatsapp → unified OKcopa contact in app.
 */

export const vacationRentalsSupply = [
${lines.join(',\n')},
];
`;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`Usage: node scripts/import-vacation-supply.mjs <path/to/vacation-supply.xlsx>

Example:
  npm run import:vacations -- ./data/vacation-supply.xlsx`);
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
