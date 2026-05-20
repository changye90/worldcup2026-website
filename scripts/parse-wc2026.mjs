/**
 * Parses openfootball/worldcup 2026--usa cup.txt + cup_finals.txt
 * into TypeScript for src/wc2026Schedule.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cupPath = path.join(__dirname, 'openfootball', 'cup.txt');
const finalsPath = path.join(__dirname, 'openfootball', 'cup_finals.txt');

const VENUE_MAP = {
  'Mexico City': { city: 'Mexico City', stadium: 'Estadio Azteca' },
  'Guadalajara (Zapopan)': { city: 'Guadalajara', stadium: 'Estadio Akron' },
  'Monterrey (Guadalupe)': { city: 'Monterrey', stadium: 'Estadio BBVA' },
  Toronto: { city: 'Toronto', stadium: 'BMO Field' },
  Vancouver: { city: 'Vancouver', stadium: 'BC Place' },
  'Los Angeles (Inglewood)': { city: 'Los Angeles', stadium: 'SoFi Stadium' },
  'San Francisco Bay Area (Santa Clara)': { city: 'San Francisco', stadium: "Levi's Stadium" },
  'New York/New Jersey (East Rutherford)': { city: 'New York', stadium: 'MetLife Stadium' },
  'Boston (Foxborough)': { city: 'Boston', stadium: 'Gillette Stadium' },
  'Dallas (Arlington)': { city: 'Dallas', stadium: 'AT&T Stadium' },
  'Miami (Miami Gardens)': { city: 'Miami', stadium: 'Hard Rock Stadium' },
  Seattle: { city: 'Seattle', stadium: 'Lumen Field' },
  Philadelphia: { city: 'Philadelphia', stadium: 'Lincoln Financial Field' },
  Atlanta: { city: 'Atlanta', stadium: 'Mercedes-Benz Stadium' },
  Houston: { city: 'Houston', stadium: 'NRG Stadium' },
  'Kansas City': { city: 'Kansas City', stadium: 'Arrowhead Stadium' },
};

const FLAGS = {
  Mexico: '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czech Republic': '🇨🇿',
  Canada: '🇨🇦',
  'Bosnia & Herzegovina': '🇧🇦',
  Qatar: '🇶🇦',
  Switzerland: '🇨🇭',
  Brazil: '🇧🇷',
  Morocco: '🇲🇦',
  Haiti: '🇭🇹',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸',
  Paraguay: '🇵🇾',
  Australia: '🇦🇺',
  Turkey: '🇹🇷',
  Germany: '🇩🇪',
  Curaçao: '🇨🇼',
  'Ivory Coast': '🇨🇮',
  Ecuador: '🇪🇨',
  Netherlands: '🇳🇱',
  Japan: '🇯🇵',
  Sweden: '🇸🇪',
  Tunisia: '🇹🇳',
  Belgium: '🇧🇪',
  Egypt: '🇪🇬',
  Iran: '🇮🇷',
  'New Zealand': '🇳🇿',
  Spain: '🇪🇸',
  'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  Uruguay: '🇺🇾',
  France: '🇫🇷',
  Senegal: '🇸🇳',
  Iraq: '🇮🇶',
  Norway: '🇳🇴',
  Argentina: '🇦🇷',
  Algeria: '🇩🇿',
  Austria: '🇦🇹',
  Jordan: '🇯🇴',
  Portugal: '🇵🇹',
  'DR Congo': '🇨🇩',
  Uzbekistan: '🇺🇿',
  Colombia: '🇨🇴',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Croatia: '🇭🇷',
  Ghana: '🇬🇭',
  Panama: '🇵🇦',
};

function flagFor(name) {
  const t = name.trim();
  if (FLAGS[t]) return FLAGS[t];
  if (/^\d|^[123][A-L]\b|^W\d+|^L\d+|^3[A-L/.]/i.test(t)) return '⚽';
  return '🏳️';
}

function monthNum(m) {
  const map = { June: '06', July: '07', Jun: '06', Jul: '07' };
  return map[m];
}

function parseDateLine(line) {
  const m = line.trim().match(/^([A-Za-z]+)\s+(June|July|Jun|Jul)\s+(\d{1,2})\s*$/);
  if (!m) return null;
  const mo = monthNum(m[2]);
  if (!mo) return null;
  const dd = m[3].padStart(2, '0');
  return `2026-${mo}-${dd}`;
}

function parseMatchLine(line) {
  const re =
    /^\s*(?:\((\d+)\)\s*)?(\d{2}:\d{2})\s+UTC[^\s]+\s+(.+?)\s+v\s+(.+?)\s+@\s+(.+?)\s*$/i;
  const m = line.match(re);
  if (!m) return null;
  return {
    matchNum: m[1] ? parseInt(m[1], 10) : null,
    kickoff: m[2],
    home: m[3].replace(/\s+/g, ' ').trim(),
    away: m[4].replace(/\s+/g, ' ').trim(),
    venueRaw: m[5].trim(),
  };
}

function resolveVenue(raw) {
  const v = VENUE_MAP[raw];
  if (!v) throw new Error(`Unknown venue: "${raw}"`);
  return v;
}

function parseCupGroups(text) {
  const lines = text.split(/\r?\n/);
  let currentDate = null;
  const out = [];
  let seq = 0;
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const d = parseDateLine(line);
    if (d) {
      currentDate = d;
      continue;
    }
    const pm = parseMatchLine(line);
    if (!pm || !currentDate) continue;
    seq += 1;
    const { city, stadium } = resolveVenue(pm.venueRaw);
    const mn = pm.matchNum ?? seq;
    out.push({
      id: seq,
      date: currentDate,
      kickoffTime: pm.kickoff,
      city,
      homeTeam: pm.home,
      awayTeam: pm.away,
      stadium,
      flag1: flagFor(pm.home),
      flag2: flagFor(pm.away),
      matchNumber: mn,
      stage: 'group',
      phase: 'group',
    });
  }
  return out;
}

const PHASE_HEADER = {
  '▪ Round of 32': 'round_of_32',
  '▪ Round of 16': 'round_of_16',
  '▪ Quarter-final': 'quarter_final',
  '▪ Semi-final': 'semi_final',
  '▪ Match for third place': 'third_place',
  '▪ Final': 'final',
};

function parseFinals(text) {
  const lines = text.split(/\r?\n/);
  let phase = 'round_of_32';
  let currentDate = null;
  const out = [];
  let id = 1000;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('▪')) {
      const p = PHASE_HEADER[t.replace(/\s+$/, '')] || PHASE_HEADER[t];
      if (p) phase = p;
      continue;
    }
    const d = parseDateLine(line);
    if (d) {
      currentDate = d;
      continue;
    }
    const pm = parseMatchLine(line);
    if (!pm || !currentDate) continue;
    id += 1;
    const { city, stadium } = resolveVenue(pm.venueRaw);
    const mn = pm.matchNum ?? id;
    out.push({
      id,
      date: currentDate,
      kickoffTime: pm.kickoff,
      city,
      homeTeam: pm.home,
      awayTeam: pm.away,
      stadium,
      flag1: flagFor(pm.home),
      flag2: flagFor(pm.away),
      matchNumber: mn,
      stage: 'knockout',
      phase,
    });
  }
  return out;
}

const cup = fs.readFileSync(cupPath, 'utf8');
const finals = fs.readFileSync(finalsPath, 'utf8');
const groupMatches = parseCupGroups(cup);
const koMatches = parseFinals(finals);

const all = [...groupMatches, ...koMatches].sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.kickoffTime.localeCompare(b.kickoffTime);
});

// Re-assign sequential id 1..n
all.forEach((m, i) => {
  m.id = i + 1;
});

const outPath = path.join(__dirname, '..', 'src', 'wc2026Schedule.ts');
const header = `/**
 * FIFA World Cup 2026™ — full 104-match schedule (group + knockout).
 * Source: openfootball/worldcup (2026--usa/cup.txt + cup_finals.txt).
 * Venue cities normalized to app listing keys (e.g. New York, San Francisco).
 */
import type { Match } from './data';

export const wc2026Matches: Match[] = `;

const body = JSON.stringify(all, null, 2);

fs.writeFileSync(outPath, `${header}${body};
`);

console.log('Wrote', outPath, 'matches:', all.length);
