import type { OgCardContent } from './ogCardContent';

const W = 1200;
const H = 630;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function wrapLines(text: string, maxLen: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
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
  const accentSoft = isSell ? 'rgba(251,191,36,0.15)' : 'rgba(56,189,248,0.15)';

  const headline = truncate(card.headline, 72);
  const meta = card.meta ? truncate(card.meta, 90) : '';
  const kickoff = card.kickoff ? truncate(card.kickoff, 48) : '';
  const detailLines = wrapLines(card.detail, 88, 2);
  const price = card.price ? truncate(card.price, 32) : '';

  const detailSvg = detailLines
    .map(
      (line, i) =>
        `<text x="72" y="${340 + i * 40}" fill="#e5e7eb" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="500">${escapeXml(line)}</text>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0f0d"/>
      <stop offset="100%" stop-color="#111c17"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="28" fill="#0e1512" stroke="#2d3748" stroke-width="2"/>
  <rect x="72" y="72" width="280" height="40" rx="10" fill="${accentSoft}"/>
  <text x="92" y="100" fill="${accent}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="700" letter-spacing="1">${escapeXml(card.badge)}</text>
  <text x="72" y="200" fill="#f9fafb" font-family="Inter, system-ui, sans-serif" font-size="46" font-weight="700">${escapeXml(headline)}</text>
  ${meta ? `<text x="72" y="252" fill="#9ca3af" font-family="Inter, system-ui, sans-serif" font-size="28">${escapeXml(meta)}</text>` : ''}
  ${kickoff ? `<text x="72" y="${meta ? 292 : 252}" fill="#9ca3af" font-family="Inter, system-ui, sans-serif" font-size="28">${escapeXml(kickoff)}</text>` : ''}
  ${detailSvg}
  ${price ? `<text x="72" y="520" fill="${accent}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="700">${escapeXml(price)}</text>` : ''}
  <text x="1040" y="560" text-anchor="end" fill="#4b5563" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="600">OKcopa</text>
</svg>`;
}
