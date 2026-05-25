import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

export function pngToJpeg(png, quality = 78) {
  const decoded = PNG.sync.read(Buffer.from(png));
  return jpeg.encode(
    { data: decoded.data, width: decoded.width, height: decoded.height },
    quality,
  ).data;
}
