/**
 * Writes functions/data/matches-og.json for OG image Workers.
 * Run: node scripts/export-matches-og.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scheduleSrc = readFileSync(join(root, 'src/wc2026Schedule.ts'), 'utf8');

const cityCountry = {
  'Mexico City': 'Mexico',
  Guadalajara: 'Mexico',
  Monterrey: 'Mexico',
  Toronto: 'Canada',
  Vancouver: 'Canada',
  'New York': 'USA',
  'Los Angeles': 'USA',
  Dallas: 'USA',
  Atlanta: 'USA',
  Houston: 'USA',
  Philadelphia: 'USA',
  'Kansas City': 'USA',
  Seattle: 'USA',
  'San Francisco': 'USA',
  Miami: 'USA',
  Boston: 'USA',
};

const marker = 'export const wc2026Matches: Match[] = ';
const start = scheduleSrc.indexOf(marker);
if (start < 0) throw new Error('wc2026Matches export not found');
const arrStart = scheduleSrc.indexOf('[', start + marker.length);
const arrEnd = scheduleSrc.indexOf('\n];', arrStart);
if (arrStart < 0 || arrEnd < 0) throw new Error('match array bounds not found');
const arrJson = scheduleSrc.slice(arrStart, arrEnd + 2);
const matches = JSON.parse(arrJson);

const slim = matches.map(m => ({
  matchNumber: m.matchNumber,
  homeTeam: m.homeTeam,
  awayTeam: m.awayTeam,
  flag1: m.flag1,
  flag2: m.flag2,
  city: m.city,
  stadium: m.stadium,
  date: m.date,
  kickoffTime: m.kickoffTime,
  country: cityCountry[m.city] ?? '',
}));

mkdirSync(join(root, 'functions/data'), { recursive: true });
writeFileSync(join(root, 'functions/data/matches-og.json'), JSON.stringify(slim));
console.log(`[export-matches-og] wrote ${slim.length} matches`);
