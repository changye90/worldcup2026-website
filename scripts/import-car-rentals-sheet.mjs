#!/usr/bin/env node
/**
 * Import car rentals from a local Excel (.xlsx) or CSV file into src/data/carRentals.ts
 *
 * Usage:
 *   node scripts/import-car-rentals-sheet.mjs ./data/car-rentals.xlsx
 *   npm run import:cars -- ./data/car-rentals.csv
 *
 * First row = column headers. Column names follow the same rules as Feishu sync
 * (see FIELD_ALIASES below — 中英均可).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/data/carRentals.ts');

/** First listing id when sheet has no id column. Override: CAR_ID_START=2000 */
const CAR_ID_START = Number(process.env.CAR_ID_START || 1001);

/** Empty image cell → `/media/car-rentals/{id}.jpg`. Optional: CAR_IMAGE_FALLBACK=/media/car-rentals/placeholder.svg */
const CAR_IMAGE_FALLBACK =
  (process.env.CAR_IMAGE_FALLBACK && String(process.env.CAR_IMAGE_FALLBACK).trim()) || '';

const FIELD_ALIASES = {
  id: ['id', 'ID', '编号', '序号', '帖子id'],
  city: ['city', '城市', 'City'],
  vehicleType: ['vehicleType', '车型', '车辆类型', '车辆', 'Vehicle', '类型'],
  seats: ['seats', '座位', '座位数', 'Seats'],
  pickupLocation: ['pickupLocation', '取车地点', '提车地点', '取还车', 'Pickup', '地址'],
  dailyRate: ['dailyRate', '日租金', '租金', 'Daily', '价格'],
  imageUrl: ['imageUrl', '图片', '图片链接', '封面', 'Image', 'image'],
  provider: ['provider', '供应商', '车行', '公司', 'Provider', '商铺名称'],
  ac: ['ac', '空调', 'AC', '冷气'],
  whatsapp: [
    'whatsapp',
    'WhatsApp',
    'Whatsapp',
    '手机',
    '电话',
    'Phone',
    'phone',
    '联系方式',
    'Whats',
  ],
};

const WHATSAPP_LINK_KEYS = ['WhatsApp 链接', 'whatsapp链接', 'WhatsApp链接'];

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

function parseBool(v) {
  const s = String(normalizeScalar(v)).trim().toLowerCase();
  if (s === '' || s === '0' || s === 'false' || s === '否' || s === 'no' || s === 'n') return false;
  return true;
}

function parseIntSafe(v, fallback = 0) {
  const n = parseInt(String(normalizeScalar(v)).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatSafe(v, fallback = 0) {
  const n = parseFloat(String(normalizeScalar(v)).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
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
  const provider = String(normalizeScalar(pickField(fields, FIELD_ALIASES.provider))).trim();
  const city = String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim();
  return !provider && !city;
}

function parseWhatsapp(fields) {
  for (const key of WHATSAPP_LINK_KEYS) {
    if (fields[key] === undefined || fields[key] === '') continue;
    const link = String(normalizeScalar(fields[key])).trim();
    const wa = link.match(/wa\.me\/(\d+)/i);
    if (wa) return wa[1];
    const api = link.match(/phone=(\d+)/i);
    if (api) return api[1];
  }
  const raw = normalizeScalar(pickField(fields, FIELD_ALIASES.whatsapp));
  const digits = String(raw).replace(/\D/g, '');
  return digits || '';
}

function assignCarId(fields, index) {
  const raw = pickField(fields, FIELD_ALIASES.id);
  const s = raw === undefined || raw === null ? '' : String(normalizeScalar(raw)).trim();
  if (!s) return CAR_ID_START + index;
  const n = parseIntSafe(raw, 0);
  if (n <= 0) return CAR_ID_START + index;
  if (n > 0 && n < CAR_ID_START) return CAR_ID_START + (n - 1);
  return n;
}

function rowFromFields(fields, index) {
  const id = assignCarId(fields, index);
  const city = String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim() || 'Mexico City';
  const vehicleType =
    String(normalizeScalar(pickField(fields, FIELD_ALIASES.vehicleType))).trim() || 'Vehicle';
  const seats = parseIntSafe(pickField(fields, FIELD_ALIASES.seats), 5);
  const pickupLocation =
    String(normalizeScalar(pickField(fields, FIELD_ALIASES.pickupLocation))).trim() || 'TBD';
  const dailyRate = parseFloatSafe(pickField(fields, FIELD_ALIASES.dailyRate), 0);
  let imageUrl = String(normalizeScalar(pickField(fields, FIELD_ALIASES.imageUrl))).trim();
  if (!imageUrl) imageUrl = CAR_IMAGE_FALLBACK || `/media/car-rentals/${id}.jpg`;
  const provider = String(normalizeScalar(pickField(fields, FIELD_ALIASES.provider))).trim() || 'Partner';
  const acRaw = pickField(fields, FIELD_ALIASES.ac);
  const ac = acRaw === undefined || acRaw === null || String(acRaw).trim() === '' ? true : parseBool(acRaw);
  const whatsapp = parseWhatsapp(fields);
  return { id, city, vehicleType, seats, pickupLocation, dailyRate, imageUrl, provider, ac, whatsapp };
}

function emitTs(rows, sourceLabel) {
  const j = (s) => JSON.stringify(s);
  const lines = rows.map(
    (r) => `  {
    id: ${r.id},
    city: ${j(r.city)},
    vehicleType: ${j(r.vehicleType)},
    seats: ${r.seats},
    pickupLocation: ${j(r.pickupLocation)},
    dailyRate: ${r.dailyRate},
    imageUrl: ${j(r.imageUrl)},
    provider: ${j(r.provider)},
    ac: ${r.ac},
    whatsapp: ${j(r.whatsapp)},
  }`,
  );
  return `/** Auto-generated from ${sourceLabel} by scripts/import-car-rentals-sheet.mjs — do not edit by hand.
 * Images: column 图片 / imageUrl, else public/media/car-rentals/{id}.jpg (or CAR_IMAGE_FALLBACK).
 */

export interface CarRental {
  id: number;
  city: string;
  vehicleType: string;
  seats: number;
  pickupLocation: string;
  dailyRate: number;
  imageUrl: string;
  provider: string;
  ac: boolean;
  whatsapp: string;
}

export const carRentals: CarRental[] = [
${lines.join(',\n')},
];
`;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`Usage: node scripts/import-car-rentals-sheet.mjs <path/to/file.xlsx|csv>

Example:
  npm run import:cars -- ./data/car-rentals.xlsx`);
    process.exit(1);
  }

  const input = path.resolve(arg);
  if (!fs.existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const ext = path.extname(input).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    console.error('Supported extensions: .xlsx, .xls, .csv');
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
    console.error('No data rows found (after skipping empty lines). Check header row and column names.');
    process.exit(1);
  }

  const label = path.basename(input);
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, emitTs(rows, label), 'utf8');
  fs.renameSync(tmp, OUT);
  console.log(`Sheet "${sheetName}": ${rows.length} rows → ${OUT}`);
}

main();
