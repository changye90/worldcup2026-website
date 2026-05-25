import { pngToJpeg } from './ogJpeg';
import { svgToPng } from './ogPng';

export const OG_IMAGE_CONTENT_TYPE = 'image/jpeg';
export const MIN_OG_IMAGE_BYTES = 15_000;
export const MAX_OG_IMAGE_BYTES = 280_000;

export async function svgToOgJpeg(svg: string, quality = 78): Promise<Uint8Array> {
  const png = await svgToPng(svg);
  const jpeg = pngToJpeg(png, quality);
  if (jpeg.byteLength > MAX_OG_IMAGE_BYTES) {
    return pngToJpeg(png, Math.max(52, quality - 18));
  }
  return jpeg;
}
