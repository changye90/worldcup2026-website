/**
 * Render brand OG card → public/og-okcopa.jpg
 * Run: node scripts/test-og-brand-render.mjs
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
const { buildBrandCardSvg } = await import(join(root, 'functions/ogBrandSvg.ts'));

const svg = buildBrandCardSvg();
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    fontBuffers: getOgFontBuffers(),
    defaultFontFamily: 'Inter',
    sansSerifFamily: 'Inter',
  },
});
const png = resvg.render().asPng();
const jpeg = pngToJpeg(png, 78);
const out = join(root, 'public/og-okcopa.jpg');
writeFileSync(out, jpeg);
writeFileSync(join(root, 'dist/og-brand-test.jpg'), jpeg);
console.log('wrote', out, jpeg.length, 'bytes (png was', png.length, ')');
