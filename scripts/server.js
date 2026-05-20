#!/usr/bin/env node
'use strict';

/**
 * Minimal static server for CentOS / plain Node (no Nginx).
 * Usage (from the folder that contains index.html + assets/):
 *   sudo node server.js          # port 80 needs root
 *   PORT=8080 node server.js     # non-privileged port
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 80;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function resolveFile(urlPath) {
  const raw = decodeURIComponent((urlPath || '/').split('?')[0]);
  const rel = raw.replace(/^\/+/, '') || 'index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }
    send(res, 200, contentType(filePath), data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
    return;
  }

  const filePath = resolveFile(req.url);
  if (!filePath) {
    send(res, 400, 'text/plain; charset=utf-8', 'Bad Request');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      return serveFile(path.join(filePath, 'index.html'), res);
    }
    if (!err && stat.isFile()) {
      if (req.method === 'HEAD') {
        send(res, 200, contentType(filePath), '');
        return;
      }
      return serveFile(filePath, res);
    }
    const indexHtml = path.join(ROOT, 'index.html');
    if (req.method === 'HEAD') {
      send(res, 200, 'text/html; charset=utf-8', '');
      return;
    }
    serveFile(indexHtml, res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`OKcopa static server listening on http://${HOST}:${PORT}/`);
  console.log(`Serving: ${ROOT}`);
  if (PORT < 1024) {
    console.log('Tip: port 80 usually requires: sudo node server.js');
  }
});
