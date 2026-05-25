import type { OgCardContent } from './ogCardContent.ts';
import { getOgHeroJpegDataUrl } from './ogHeroBg.ts';
import { getOgFlagSpriteDataUrl } from './ogFlagSprites.ts';
import { flagEmojiToIso } from './ogFlagIso.ts';

const W = 1200;
const H = 630;
const CX = W / 2;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainText(text: string): string {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  const t = plainText(text);
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function wrapLines(text: string, maxLen: number, maxLines: number): string[] {
  const words = plainText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (!lines.length) return [truncate(text, maxLen)];
  if (lines.length === maxLines) {
    const joined = lines.join(' ');
    if (joined.length < plainText(text).length) {
      lines[maxLines - 1] = truncate(lines[maxLines - 1], maxLen);
    }
  }
  return lines;
}

function flagImage(emoji: string | undefined, x: number, y: number, size: number): string {
  if (!emoji) return '';
  const iso = flagEmojiToIso(emoji);
  if (!iso) return '';
  const href = getOgFlagSpriteDataUrl(iso);
  if (!href) return '';
  const h = Math.round(size * 0.75);
  const w = size;
  return `<image href="${href}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
}

function matchupBlock(card: OgCardContent, accent: string): string {
  const home = card.homeTeam ? truncate(card.homeTeam, 28) : '';
  const away = card.awayTeam ? truncate(card.awayTeam, 28) : '';
  if (!home && !away) {
    const headline = truncate(card.headline || '', 56);
    return `<text x="${CX}" y="300" text-anchor="middle" fill="#f9fafb" font-family="Inter, sans-serif" font-size="46" font-weight="700">${escapeXml(headline)}</text>`;
  }

  const fontSize = home.length + away.length > 36 ? 38 : 44;
  const vsSize = 30;
  const flagW = 52;
  const gap = 18;
  const homeW = home.length * (fontSize * 0.52);
  const awayW = away.length * (fontSize * 0.52);
  const vsW = 48;
  const total =
    flagW + gap + homeW + gap + vsW + gap + awayW + gap + flagW;
  let x = CX - total / 2 + flagW / 2;
  const y = 292;
  const parts: string[] = [];

  parts.push(flagImage(card.flag1, x, y, flagW));
  x += flagW / 2 + gap;
  parts.push(
    `<text x="${x + homeW / 2}" y="${y + fontSize * 0.35}" text-anchor="middle" fill="#f9fafb" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(home)}</text>`,
  );
  x += homeW + gap;
  parts.push(
    `<text x="${x + vsW / 2}" y="${y + vsSize * 0.3}" text-anchor="middle" fill="#9ca3af" font-family="Inter, sans-serif" font-size="${vsSize}" font-weight="600">vs</text>`,
  );
  x += vsW + gap;
  parts.push(
    `<text x="${x + awayW / 2}" y="${y + fontSize * 0.35}" text-anchor="middle" fill="#f9fafb" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(away)}</text>`,
  );
  x += awayW + gap + flagW / 2;
  parts.push(flagImage(card.flag2, x, y, flagW));

  return parts.join('\n  ');
}

export function buildCardSvg(card: OgCardContent): string {
  const isSell = card.badge.includes('SALE');
  const accent = isSell ? '#fbbf24' : '#38bdf8';
  const accentSoft = isSell ? 'rgba(251,191,36,0.28)' : 'rgba(56,189,248,0.28)';

  const badge = truncate(card.badge, 40);
  const meta = card.meta ? truncate(card.meta, 72) : '';
  const kickoff = card.kickoff ? truncate(card.kickoff, 44) : '';
  const detailLines = wrapLines(card.detail, 64, 2);
  const price = card.price ? truncate(card.price, 28) : '';

  const hero = getOgHeroJpegDataUrl();
  const bgLayer = hero
    ? `<image href="${hero}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${W}" height="${H}" fill="#1a3d2e"/>`;

  const textLines: string[] = [];
  let y = 168;

  textLines.push(
    `<rect x="${CX - 210}" y="${y - 28}" width="420" height="40" rx="12" fill="${accentSoft}"/>`,
    `<text x="${CX}" y="${y}" text-anchor="middle" fill="${accent}" font-family="Inter, sans-serif" font-size="22" font-weight="700">${escapeXml(badge)}</text>`,
  );

  const matchup = matchupBlock(card, accent);
  y = 340;
  if (meta) {
    textLines.push(
      `<text x="${CX}" y="${y}" text-anchor="middle" fill="#d1d5db" font-family="Inter, sans-serif" font-size="26" font-weight="500">${escapeXml(meta)}</text>`,
    );
    y += 38;
  }
  if (kickoff) {
    textLines.push(
      `<text x="${CX}" y="${y}" text-anchor="middle" fill="#9ca3af" font-family="Inter, sans-serif" font-size="24" font-weight="500">${escapeXml(kickoff)}</text>`,
    );
    y += 36;
  }
  for (const line of detailLines) {
    textLines.push(
      `<text x="${CX}" y="${y}" text-anchor="middle" fill="#e5e7eb" font-family="Inter, sans-serif" font-size="28" font-weight="500">${escapeXml(line)}</text>`,
    );
    y += 34;
  }
  if (price) {
    y += 8;
    textLines.push(
      `<text x="${CX}" y="${y}" text-anchor="middle" fill="${accent}" font-family="Inter, sans-serif" font-size="40" font-weight="700">${escapeXml(price)}</text>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(10,22,16,0.55)"/>
      <stop offset="45%" stop-color="rgba(10,22,16,0.72)"/>
      <stop offset="100%" stop-color="rgba(8,18,14,0.88)"/>
    </linearGradient>
  </defs>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
  ${textLines.join('\n  ')}
  ${matchup}
  <text x="${CX}" y="598" text-anchor="middle" fill="#8fa89a" font-family="Inter, sans-serif" font-size="20" font-weight="600">okcopa.com · World Cup 2026</text>
</svg>`;
}
