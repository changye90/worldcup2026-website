/**
 * Frees OKcopa port 5280 before Vite starts (dev or preview).
 * If listeners remain (e.g. kill not permitted), exits with code 1 so CI/scripts fail loud.
 */
import { execSync } from 'node:child_process';

const port = Number(process.env.OKCOPA_DEV_PORT || 5280);

function listListenerPids() {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null`, {
      encoding: 'utf8',
    }).trim();
    if (!out) return [];
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  } catch {
    return [];
  }
}

function killListeners() {
  const pids = listListenerPids();
  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`);
    } catch {
      /* ignore single-PID failure */
    }
  }
  if (pids.length) {
    console.log(`[okcopa] Tried to free port ${port} (PIDs: ${pids.join(', ')}).`);
  }
}

killListeners();

// brief pause so the OS releases the socket
try {
  execSync('sleep 0.2', { stdio: 'ignore' });
} catch {
  /* Windows / no sleep: ignore */
}

const remaining = listListenerPids();
if (remaining.length > 0) {
  console.error(
    `[okcopa] Port ${port} is still in use (PIDs: ${remaining.join(', ')}). ` +
      `Stop that process, then run again. Example: kill -9 ${remaining.join(' ')}`,
  );
  process.exit(1);
}

console.log(
  `[okcopa] Port ${port} is free. Next: Vite → http://127.0.0.1:${port}/\n` +
    `  · npm run dev     — dev + HMR\n` +
    `  · npm run publish — build + preview (for Cursor / fixed browser tab)\n` +
    `Bookmark: http://127.0.0.1:${port}/`,
);
