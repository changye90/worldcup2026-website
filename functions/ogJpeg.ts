import { encode as encodeJpeg } from '@jsquash/jpeg';
import { decode as decodePng } from '@jsquash/png';

/** WhatsApp / Meta previews often ignore images above ~300KB. */
export async function pngToJpeg(png: Uint8Array, quality = 78): Promise<Uint8Array> {
  const imageData = await decodePng(png);
  return encodeJpeg(imageData, { quality });
}
