import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

/** WhatsApp / Meta previews often ignore images above ~300KB; target JPEG output. */
export function pngToJpeg(png: Uint8Array, quality = 78): Uint8Array {
  const decoded = PNG.sync.read(Buffer.from(png));
  const encoded = jpeg.encode(
    { data: decoded.data, width: decoded.width, height: decoded.height },
    quality,
  );
  return encoded.data;
}
