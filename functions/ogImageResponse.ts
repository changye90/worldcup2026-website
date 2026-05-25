import { OG_IMAGE_CONTENT_TYPE } from './ogImage';

export function jpegResponse(jpeg: Uint8Array, maxAge = 3600): Response {
  return new Response(jpeg, {
    headers: {
      'Content-Type': OG_IMAGE_CONTENT_TYPE,
      'Content-Length': String(jpeg.byteLength),
      'Cache-Control': `public, max-age=${maxAge}`,
      'Accept-Ranges': 'bytes',
    },
  });
}
