/**
 * Local check: OG card SVG → PNG (same as production /og/ticket).
 * Run: node scripts/test-og-render.mjs
 */
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasm = readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm'));
await initWasm(wasm);

const { getOgFontBuffers } = await import(join(root, 'functions/ogFontBuffers.ts'));
const OG_FONT_BUFFERS = getOgFontBuffers();
const { buildCardSvg } = await import(join(root, 'functions/ogCardSvg.ts'));

const svg = buildCardSvg({
  badge: 'TICKETS FOR SALE',
  headline: '🇳🇿 New Zealand vs Belgium 🇧🇪',
  meta: 'Canada · Vancouver · BC Place',
  kickoff: 'Fri, Jun 26, 8:00 PM',
  detail: 'Match 42 · 2 tickets · Category 2',
  price: 'Negotiable',
});

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { fontBuffers: OG_FONT_BUFFERS, defaultFontFamily: 'Inter', sansSerifFamily: 'Inter' },
});
const png = resvg.render().asPng();
const out = join(root, 'dist/og-render-test.png');
const pub = join(root, 'public/og-ticket-fallback.png');
writeFileSync(out, png);
writeFileSync(pub, png);
console.log('wrote', out, png.length, 'bytes');
