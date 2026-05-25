import { getOgHeroJpegDataUrl } from './ogHeroBg.ts';

/** Open Graph brand card — 1200×630 (1.91:1). Safe zone: ~64px inset. */
export const OG_BRAND_W = 1200;
export const OG_BRAND_H = 630;

const W = OG_BRAND_W;
const H = OG_BRAND_H;
const PAD = 64;
const WA_GREEN = '#25D366';
const BRAND_ORANGE = '#FF7A1A';
const HIGHLIGHT = '#FBBF24';
const WHITE = '#FFFFFF';

export interface BrandOgContent {
  /** Primary headline — keep ≤ 28 chars for mobile crop safety. */
  h1?: string;
  h2?: string;
  cta?: string;
  subtext?: string;
  freeBadge?: string;
}

const DEFAULTS: Required<BrandOgContent> = {
  h1: 'FAN-TO-FAN TICKET HUB',
  h2: '100% FREE MARKETPLACE',
  cta: 'DIRECT WHATSAPP CHAT WITH SELLERS',
  subtext: 'Skip the 30% StubHub fees. Save money together.',
  freeBadge: '100% FREE',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** WhatsApp-style chat bubble (white on green bar). */
function whatsappBubbleIcon(x: number, y: number, size: number): string {
  const s = size / 48;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path fill="${WHITE}" fill-rule="evenodd" d="M24 4C13.507 4 5 12.507 5 23c0 3.86 1.01 7.48 2.78 10.62L5 43l9.58-2.51A18.93 18.93 0 0024 42c10.493 0 19-8.507 19-19S34.493 4 24 4zm-1.17 24.77c-5.47 0-9.92-4.45-9.92-9.92 0-5.47 4.45-9.92 9.92-9.92 5.47 0 9.92 4.45 9.92 9.92 0 2.58-1 4.93-2.63 6.68l.98 3.58-3.67-.96a9.82 9.82 0 01-5.6 1.74zm5.2-7.01c.3-.48-.19-.88-.48-1.17l-1.9-1.74c-.24-.22-.62-.24-.88-.05l-2.26 1.58c-.44.31-1.04.22-1.38-.2l-3.4-3.92c-.34-.42-.28-1.04.14-1.38l2.1-1.72c.26-.22.32-.6.14-.88l-1.44-2.24c-.28-.44-.9-.52-1.3-.18l-2.68 2.22c-.5.42-1.22.36-1.64-.14-1.12-1.28-2.9-3.42-2.9-5.5 0-3.72 3.02-6.74 6.74-6.74 3.1 0 5.78 2.02 6.68 4.86.9 2.84-.38 5.92-2.96 7.38z"/>
  </g>`;
}

export function buildBrandCardSvg(content: BrandOgContent = {}): string {
  const c = { ...DEFAULTS, ...content };
  const hero = getOgHeroJpegDataUrl();
  const bgLayer = hero
    ? `<image href="${hero}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${W}" height="${H}" fill="#0f1f18"/>`;

  const badgeW = 196;
  const badgeH = 50;
  const badgeX = W - PAD - badgeW;
  const badgeY = 52;
  const ctaBarY = 468;
  const ctaBarH = 92;
  const ctaBarW = W - PAD * 2;
  const iconSize = 52;
  const iconX = PAD + 28;
  const iconY = ctaBarY + (ctaBarH - iconSize) / 2;
  const ctaTextX = iconX + iconSize + 22;
  const ctaFontSize = c.cta.length > 34 ? 30 : 34;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="heroOverlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0.48"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.58"/>
    </linearGradient>
    <linearGradient id="ctaSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1EBE5A"/>
      <stop offset="100%" stop-color="${WA_GREEN}"/>
    </linearGradient>
  </defs>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#heroOverlay)"/>
  <rect width="${W}" height="${H}" fill="#000000" fill-opacity="0.08"/>

  <text x="${PAD}" y="96" fill="${BRAND_ORANGE}" font-family="Inter, sans-serif" font-size="56" font-weight="800" letter-spacing="3">OKCOPA</text>

  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${WA_GREEN}"/>
  <text x="${badgeX + badgeW / 2}" y="${badgeY + 34}" text-anchor="middle" fill="${WHITE}" font-family="Inter, sans-serif" font-size="22" font-weight="800" letter-spacing="0.5">${escapeXml(c.freeBadge)}</text>

  <text x="${PAD}" y="228" fill="${WHITE}" font-family="Inter, sans-serif" font-size="58" font-weight="800" letter-spacing="-0.5">${escapeXml(c.h1)}</text>
  <text x="${PAD}" y="292" fill="${HIGHLIGHT}" font-family="Inter, sans-serif" font-size="40" font-weight="700">${escapeXml(c.h2)}</text>

  <line x1="${PAD}" y1="340" x2="${PAD + 120}" y2="340" stroke="${BRAND_ORANGE}" stroke-width="5" stroke-linecap="round"/>

  <text x="${PAD}" y="388" fill="#E5E7EB" font-family="Inter, sans-serif" font-size="26" font-weight="500">Fan listings · No platform fees · Built for World Cup 2026</text>

  <rect x="${PAD}" y="${ctaBarY}" width="${ctaBarW}" height="${ctaBarH}" rx="18" fill="url(#ctaSheen)"/>
  ${whatsappBubbleIcon(iconX, iconY, iconSize)}
  <text x="${ctaTextX}" y="${ctaBarY + ctaBarH / 2 + 12}" fill="${WHITE}" font-family="Inter, sans-serif" font-size="${ctaFontSize}" font-weight="800">${escapeXml(c.cta)}</text>

  <text x="${PAD}" y="598" fill="#D1D5DB" font-family="Inter, sans-serif" font-size="24" font-weight="600">${escapeXml(c.subtext)}</text>
</svg>`;
}
