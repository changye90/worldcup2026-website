import { buildBrandCardSvg } from '../ogBrandSvg';
import { svgToPng } from '../ogPng';

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400',
} as const;

const MIN_PNG_BYTES = 20_000;

export const onRequest: PagesFunction = async () => {
  try {
    const png = await svgToPng(buildBrandCardSvg());
    if (png.byteLength < MIN_PNG_BYTES) {
      throw new Error(`brand og png too small: ${png.byteLength}`);
    }
    return new Response(png, { headers: PNG_HEADERS });
  } catch (err) {
    console.error('og/brand render failed', err);
    return new Response('OG image unavailable', { status: 503 });
  }
};
