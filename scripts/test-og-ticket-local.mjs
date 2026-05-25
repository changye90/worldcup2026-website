/**
 * Local OG PNG test (same stack as functions/og/ticket.ts).
 * Run: npm run build && node scripts/test-og-ticket-local.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasm = readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm'));
await initWasm(wasm);

const { OG_FONT_BUFFERS } = await import(join(root, 'functions/ogFontBuffers.ts'));
const { buildCardSvg } = await import(join(root, 'functions/ogCardSvg.ts'));

const svg = buildCardSvg.buildCardSvg
  ? buildCardSvg.buildCardSvg({
      badge: 'TICKETS FOR SALE',
      headline: '🇳🇿 New Zealand vs Belgium 🇧🇪',
      meta: 'Canada · Vancouver · BC Place',
      kickoff: 'Fri, Jun 26, 8:00 PM',
      detail: 'Match 42 · 2 tickets · Category 2',
      price: 'Negotiable',
    })
  : (await import(join(root, 'functions/ogCardSvg.ts'))).buildCardSvg({
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
const out = join(root, 'dist/og-ticket-local-test.png');
writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes (expect >> 20k if text rendered)');
