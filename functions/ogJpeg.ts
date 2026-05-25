import encodeJpeg, { init as initJpeg } from '@jsquash/jpeg/encode.js';
import decodePng, { init as initPng } from '@jsquash/png/decode.js';
// @ts-expect-error Cloudflare Pages bundles .wasm as a module
import jpegWasm from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';
// @ts-expect-error Cloudflare Pages bundles .wasm as a module
import pngWasm from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm';

let codecsReady: Promise<void> | null = null;

function ensureCodecs(): Promise<void> {
  if (!codecsReady) {
    codecsReady = Promise.all([initPng(pngWasm), initJpeg(jpegWasm)]).then(() => undefined);
  }
  return codecsReady;
}

/** WhatsApp / Meta previews often ignore images above ~300KB. */
export async function pngToJpeg(png: Uint8Array, quality = 78): Promise<Uint8Array> {
  await ensureCodecs();
  const imageData = await decodePng(png);
  const buf = await encodeJpeg(imageData, { quality });
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}
