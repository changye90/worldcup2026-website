/**
 * Build + preview (default port 5291, see scripts/preview-port.mjs).
 * Writes the URL to `.okcopa-url` and prints it so you can paste into any browser.
 */
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickPreviewPort } from './preview-port.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

console.log('[okcopa] Building…');
execSync(`"${process.execPath}" "${viteCli}" build`, { cwd: root, stdio: 'inherit' });

const host = '127.0.0.1';
const port = await pickPreviewPort();
const url = `http://${host}:${port}/`;

const outFile = join(root, '.okcopa-url');
writeFileSync(outFile, `${url}\n`, 'utf8');

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  OKCOPA — 最新效果请打开下面地址（已写入 .okcopa-url）    ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  ${url.padEnd(56)}║`);
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('  若仍见旧 Tab 文案 → 硬刷新 Cmd+Shift+R，');
console.log('  或确认未打开旧 dist / 其它端口；本命令已重新 build。');
console.log(
  '\n[okcopa] 改代码后每次都要重新跑本脚本才会进浏览器；页脚 build 时间戳应变。',
);
console.log(
  '\n[okcopa] 保持此终端运行，预览才有效；关掉终端后地址会连不上。\n' +
    '    若需要后台常驻，请用: npm run latest:bg\n',
);
console.log('\n');

const noOpen = process.env.OKCOPA_NO_OPEN === '1';
const previewArgs = [viteCli, 'preview', '--host', host, '--port', String(port), '--strictPort'];
if (!noOpen) previewArgs.push('--open');

const r = spawnSync(process.execPath, previewArgs, { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
