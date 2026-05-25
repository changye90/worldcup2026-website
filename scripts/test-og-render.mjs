/**
 * Local check: OG card SVG → JPEG (same as production /og/ticket).
 * Run: node scripts/test-og-render.mjs
 */
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { pngToJpeg } from './og-png-to-jpeg.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasm = readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm'));
await initWasm(wasm);

const { getOgFontBuffers } = await import(join(root, 'functions/ogFontBuffers.ts'));
const OG_FONT_BUFFERS = getOgFontBuffers();
const { buildCardSvg } = await import(join(root, 'functions/ogCardSvg.ts'));

const svg = buildCardSvg({
  badge: 'TICKETS FOR SALE',
  homeTeam: 'Portugal',
  awayTeam: 'DR Congo',
  flag1: '🇵🇹',
  flag2: '🇨🇩',
  meta: 'USA · Miami · Hard Rock Stadium',
  kickoff: 'Fri, Jun 17, 12:00 PM',
  detail: 'Match 61 · 2 tickets · Category 1',
  price: '$900 USD',
});

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { fontBuffers: OG_FONT_BUFFERS, defaultFontFamily: 'Inter', sansSerifFamily: 'Inter' },
});
const png = resvg.render().asPng();
const jpeg = pngToJpeg(png, 78);
const pub = join(root, 'public/og-ticket-fallback.jpg');
writeFileSync(pub, jpeg);
writeFileSync(join(root, 'dist/og-render-test.jpg'), jpeg);
console.log('wrote', pub, jpeg.length, 'bytes (png was', png.length, ')');
