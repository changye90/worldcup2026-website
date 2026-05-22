import type { OgCardContent } from './ogCardContent';

const W = 1200;
const H = 630;
const CX = W / 2;

/** resvg cannot paint emoji in &lt;text&gt;; strip flags for PNG, keep names. */
function plainText(text: string): string {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  const joined = lines.join(' ');
  if (joined.length < text.length && lines.length === maxLines) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1], maxLen);
  }
  return lines.length ? lines : [truncate(text, maxLen)];
}

export function buildCardSvg(card: OgCardContent): string {
  const isSell = card.badge.includes('SALE');
  const accent = isSell ? '#fbbf24' : '#38bdf8';
  const accentSoft = isSell ? 'rgba(251,191,36,0.22)' : 'rgba(56,189,248,0.22)';

  const badge = truncate(card.badge, 40);
  const headline = truncate(card.headline, 64);
  const meta = card.meta ? truncate(card.meta, 80) : '';
  const kickoff = card.kickoff ? truncate(card.kickoff, 44) : '';
  const detailLines = wrapLines(card.detail, 70, 2);
  const price = card.price ? truncate(card.price, 28) : '';

  let y = 168;
  const step = (line: string, size: number, fill: string, weight = '500') => {
    const el = `<text x="${CX}" y="${y}" text-anchor="middle" fill="${fill}" font-family="Inter, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`;
    y += size + (size >= 40 ? 22 : 16);
    return el;
  };

  const parts: string[] = [];
  parts.push(
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#1e2d26" stroke="#4a6358" stroke-width="2"/>`,
    `<rect x="${CX - 200}" y="${y - 36}" width="400" height="44" rx="12" fill="${accentSoft}"/>`,
    step(badge, 22, accent, '700'),
  );
  y += 8;
  parts.push(step(headline, 48, '#f9fafb', '700'));
  if (meta) parts.push(step(meta, 26, '#b8c4be'));
  if (kickoff) parts.push(step(kickoff, 24, '#9ca3af'));
  y += 6;
  for (const line of detailLines) {
    parts.push(step(line, 28, '#e5e7eb'));
  }
  if (price) {
    y += 10;
    parts.push(step(price, 38, accent, '700'));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3d2e"/>
      <stop offset="50%" stop-color="#234a38"/>
      <stop offset="100%" stop-color="#152820"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${parts.join('\n  ')}
  <text x="${CX}" y="580" text-anchor="middle" fill="#6b7f73" font-family="Inter, sans-serif" font-size="22" font-weight="600">okcopa.com · World Cup 2026</text>
</svg>`;
}
