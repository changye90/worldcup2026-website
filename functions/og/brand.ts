import { ogStaticJpegResponse } from '../ogFallback';
import { buildBrandCardSvg } from '../ogBrandSvg';
import { MIN_OG_IMAGE_BYTES, OG_IMAGE_CONTENT_TYPE, svgToOgJpeg } from '../ogImage';

const BRAND_FALLBACK = '/og-okcopa.jpg';

const IMAGE_HEADERS = {
  'Content-Type': OG_IMAGE_CONTENT_TYPE,
  'Cache-Control': 'public, max-age=86400',
} as const;

export const onRequest: PagesFunction = async context => {
  try {
    const jpeg = await svgToOgJpeg(buildBrandCardSvg());
    if (jpeg.byteLength < MIN_OG_IMAGE_BYTES) {
      throw new Error(`brand og jpeg too small: ${jpeg.byteLength}`);
    }
    return new Response(jpeg, { headers: IMAGE_HEADERS });
  } catch (err) {
    console.error('og/brand render failed', err);
    return ogStaticJpegResponse(context.request.url, BRAND_FALLBACK);
  }
};
