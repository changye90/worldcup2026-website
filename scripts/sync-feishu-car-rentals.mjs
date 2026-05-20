#!/usr/bin/env node
/**
 * Pull car rental rows from Feishu Bitable and overwrite src/data/carRentals.ts
 *
 * Prereqs (飞书开放平台 — 企业自建应用):
 *   - Create an app, enable "多维表格" / bitable scope: bitable:app, bitable:app:readonly as needed
 *   - Grant the app access to the base (多维表格 → … → 添加文档应用 / 权限)
 *
 * Env:
 *   FEISHU_APP_ID       — cli_xxxxxxxx
 *   FEISHU_APP_SECRET   — from app credentials
 *   FEISHU_BITABLE_APP_TOKEN — from the **base** URL: https://xxx.feishu.cn/base/bascnXXXXXXXX
 *   FEISHU_BITABLE_TABLE_ID  — default from your wiki link: tbl8vjiUvpG2GKWD
 *
 * Wiki URLs do not expose app_token; open the same table in 多维表格 and copy the base URL.
 *
 * Usage (Node 20+ for --env-file):
 *   FEISHU_APP_ID=... FEISHU_APP_SECRET=... FEISHU_BITABLE_APP_TOKEN=bascn... \
 *     node scripts/sync-feishu-car-rentals.mjs
 *
 * Or: put vars in .env.local at project root (gitignored); this script loads it automatically.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../src/data/carRentals.ts');

/** Load `.env.local` if present (does not override existing env). */
function loadEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local');
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  for (let line of raw.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvLocal();

/** First matching column name in the table wins (中英列名可自行增删). */
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
  whatsapp: ['whatsapp', 'WhatsApp', 'Whatsapp', '手机', '电话', '联系方式', 'Whats'],
};

const DEFAULT_TABLE_ID = 'tbl8vjiUvpG2GKWD';

const CAR_IMAGE_FALLBACK =
  (process.env.CAR_IMAGE_FALLBACK && String(process.env.CAR_IMAGE_FALLBACK).trim()) || '';

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
    const parts = v.map((item) => {
      if (item == null) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && 'text' in item) return String(item.text);
      return '';
    });
    return parts.join('');
  }
  if (typeof v === 'object') {
    if ('text' in v && v.text != null) return String(v.text);
    if ('link' in v && v.link != null) return String(v.link);
    if ('name' in v && v.name != null) return String(v.name);
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
  return String(raw).replace(/\D/g, '') || '0';
}

async function getTenantToken(appId, appSecret) {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`tenant_access_token: ${json.msg || JSON.stringify(json)}`);
  return json.tenant_access_token;
}

async function searchAllRecords(token, appToken, tableId) {
  const out = [];
  let pageToken = undefined;
  do {
    const body = { page_size: 500 };
    if (pageToken) body.page_token = pageToken;
    const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
      },
    );
    const json = await res.json();
    if (json.code !== 0) throw new Error(`bitable search: ${json.msg || JSON.stringify(json)}`);
    const data = json.data || {};
    out.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken);
  return out;
}

function rowFromRecord(record, index) {
  const fields = record.fields || {};
  const id = parseIntSafe(pickField(fields, FIELD_ALIASES.id), index + 1);
  const city = String(normalizeScalar(pickField(fields, FIELD_ALIASES.city))).trim() || 'Mexico City';
  const vehicleType =
    String(normalizeScalar(pickField(fields, FIELD_ALIASES.vehicleType))).trim() || 'Vehicle';
  const seats = parseIntSafe(pickField(fields, FIELD_ALIASES.seats), 5);
  const pickupLocation =
    String(normalizeScalar(pickField(fields, FIELD_ALIASES.pickupLocation))).trim() || 'TBD';
  const dailyRate = parseFloatSafe(pickField(fields, FIELD_ALIASES.dailyRate), 0);
  const imageUrlRaw = String(normalizeScalar(pickField(fields, FIELD_ALIASES.imageUrl))).trim();
  const imageUrl = imageUrlRaw || CAR_IMAGE_FALLBACK || `/media/car-rentals/${id}.jpg`;
  const provider = String(normalizeScalar(pickField(fields, FIELD_ALIASES.provider))).trim() || 'Partner';
  const acRaw = pickField(fields, FIELD_ALIASES.ac);
  const ac = acRaw === undefined || acRaw === null ? true : parseBool(acRaw);
  const whatsapp = parseWhatsapp(fields);
  return { id, city, vehicleType, seats, pickupLocation, dailyRate, imageUrl, provider, ac, whatsapp };
}

function emitTs(rows) {
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
  return `/** Auto-generated by scripts/sync-feishu-car-rentals.mjs — do not edit by hand. */

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

async function main() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
  const tableId = process.env.FEISHU_BITABLE_TABLE_ID || DEFAULT_TABLE_ID;

  if (!appId || !appSecret || !appToken) {
    console.error(`
Missing env. Need:
  FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BITABLE_APP_TOKEN
Optional:
  FEISHU_BITABLE_TABLE_ID (default ${DEFAULT_TABLE_ID})

Your wiki link only shows table_id. Copy **多维表格** base URL to get app_token (bascn...).
Alternatively export the table to CSV, place it in the repo, and ask to map columns — no API keys needed.
`);
    process.exit(1);
  }

  const tenant = await getTenantToken(appId, appSecret);
  const items = await searchAllRecords(tenant, appToken, tableId);
  const rows = items.map((rec, i) => rowFromRecord(rec, i));

  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, emitTs(rows), 'utf8');
  fs.renameSync(tmp, OUT);
  console.log(`Wrote ${rows.length} rows → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
