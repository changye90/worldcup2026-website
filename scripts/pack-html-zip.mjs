#!/usr/bin/env node
/**
 * Copy server.js into dist/ and create html.zip (flat: index.html, assets/, server.js at zip root).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const zipPath = path.join(root, 'html.zip');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('[pack:html] dist/index.html missing — run npm run build first');
  process.exit(1);
}

fs.copyFileSync(path.join(root, 'scripts', 'server.js'), path.join(dist, 'server.js'));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`cd "${dist}" && zip -r "${zipPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });

const stat = fs.statSync(zipPath);
console.log(`\n[okcopa] Created ${zipPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log('[okcopa] Upload to server, unzip, then: sudo node server.js');
