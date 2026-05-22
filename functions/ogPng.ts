import { initWasm, Resvg } from '@resvg/resvg-wasm';
// @ts-expect-error Cloudflare Pages bundles .wasm as a module
import wasmModule from '@resvg/resvg-wasm/index_bg.wasm';
import { getOgFontBuffers } from './ogFontBuffers';

let wasmReady: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(wasmModule).then(() => undefined);
  }
  return wasmReady;
}

export async function svgToPng(svg: string, _origin?: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontBuffers: getOgFontBuffers(),
      defaultFontFamily: 'Inter',
      sansSerifFamily: 'Inter',
    },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  rendered.free();
  resvg.free();
  return png;
}
