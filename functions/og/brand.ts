import { ogStaticJpegResponse } from '../ogFallback';
import { buildBrandCardSvg } from '../ogBrandSvg';
import { jpegResponse } from '../ogImageResponse';
import { MIN_OG_IMAGE_BYTES, svgToOgJpeg } from '../ogImage';

const BRAND_FALLBACK = '/og-okcopa.jpg';

export const onRequest: PagesFunction = async context => {
  try {
    const jpeg = await svgToOgJpeg(buildBrandCardSvg());
    if (jpeg.byteLength < MIN_OG_IMAGE_BYTES) {
      throw new Error(`brand og jpeg too small: ${jpeg.byteLength}`);
    }
    return jpegResponse(jpeg, 86400);
  } catch (err) {
    console.error('og/brand render failed', err);
    return ogStaticJpegResponse(context.request.url, BRAND_FALLBACK);
  }
};
