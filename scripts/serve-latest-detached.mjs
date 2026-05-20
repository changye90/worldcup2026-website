/**
 * Build + start `vite preview` in the background (survives when the parent shell exits).
 * Writes URL to `.okcopa-url` and PID to `.okcopa-preview.pid`.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickPreviewPort } from './preview-port.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const pidFile = join(root, '.okcopa-preview.pid');
const urlFile = join(root, '.okcopa-url');

function killOldPreview() {
  if (!existsSync(pidFile)) return;
  try {
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    if (pid > 0) process.kill(pid, 'SIGTERM');
  } catch {
    /* already dead */
  }
  try {
    unlinkSync(pidFile);
  } catch {
    /* ignore */
  }
}

console.log('[okcopa] Building…');
execSync(`"${process.execPath}" "${viteCli}" build`, { cwd: root, stdio: 'inherit' });

killOldPreview();
await new Promise((r) => setTimeout(r, 450));

const host = '127.0.0.1';
const port = await pickPreviewPort();
const url = `http://${host}:${port}/`;

writeFileSync(urlFile, `${url}\n`, 'utf8');

const child = spawn(
  process.execPath,
  [viteCli, 'preview', '--host', host, '--port', String(port), '--strictPort'],
  {
    cwd: root,
    detached: true,
    stdio: 'ignore',
  },
);
child.unref();
writeFileSync(pidFile, `${child.pid}\n`, 'utf8');

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  OKCOPA — 预览已在后台运行（关掉需 kill PID 见下方）      ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  ${url.padEnd(56)}║`);
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  PID ${String(child.pid).padEnd(51)}║`);
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  地址已写入 .okcopa-url   PID 已写入 .okcopa-preview.pid   ║');
console.log('║  停止预览: kill $(cat .okcopa-preview.pid)                ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(
  '\n[okcopa] 改代码后必须重新执行本命令（会先 vite build）。只刷新浏览器不会载入新 dist。',
);
console.log(
  `[okcopa] 默认预览端口优先 ${process.env.OKCOPA_PREVIEW_PORT || 5291}；请以本输出或 .okcopa-url 为准，勿死记旧端口。\n`,
);
