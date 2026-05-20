/**
 * Pick a TCP port for `vite preview` after optional old-process kill.
 * Default 5291 so `.okcopa-url` stays stable across `npm run latest:bg` runs.
 */
import { createServer } from 'node:net';

const host = '127.0.0.1';

function tryListenOnce(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(null));
    s.listen(port, host, () => {
      s.close(() => resolve(port));
    });
  });
}

/**
 * @param {object} opts
 * @param {number} [opts.preferred] default OKCOPA_PREVIEW_PORT or 5291
 * @param {number} [opts.fallbackStart] scan range if preferred busy
 * @param {number} [opts.fallbackEnd]
 */
export async function pickPreviewPort(opts = {}) {
  const preferred = Number(
    process.env.OKCOPA_PREVIEW_PORT || opts.preferred || 5291,
  );
  const fallbackStart = opts.fallbackStart ?? 5280;
  const fallbackEnd = opts.fallbackEnd ?? 5310;

  const first = await tryListenOnce(preferred);
  if (first !== null) return first;

  for (let p = fallbackStart; p <= fallbackEnd; p++) {
    if (p === preferred) continue;
    const ok = await tryListenOnce(p);
    if (ok !== null) return ok;
  }

  throw new Error(
    `No free TCP port for vite preview (${fallbackStart}–${fallbackEnd}, preferred ${preferred}).`,
  );
}
