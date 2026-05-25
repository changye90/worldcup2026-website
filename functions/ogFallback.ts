const JPEG_HEADERS = {
  'Content-Type': 'image/jpeg',
  'Cache-Control': 'public, max-age=300',
} as const;

/** WhatsApp / Meta need 200 + image bytes on the og:image URL (no redirects). */
export async function ogStaticJpegResponse(
  requestUrl: string,
  pathname: string,
): Promise<Response> {
  const url = new URL(pathname, requestUrl);
  const res = await fetch(url.toString());
  if (!res.ok) {
    return new Response('OG unavailable', { status: 503 });
  }
  return new Response(await res.arrayBuffer(), { headers: JPEG_HEADERS });
}
