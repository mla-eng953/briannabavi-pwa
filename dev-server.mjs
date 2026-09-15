#!/usr/bin/env node
/* Dependency-free static dev server for the Brian Nabavi PWA.
   Usage: node dev-server.mjs [--port 7100] [--host 127.0.0.1] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const PORT = Number(arg('port', 7100));
const HOST = arg('host', '127.0.0.1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

    let target = file;
    const info = await stat(target).catch(() => null);
    if (!info) { res.writeHead(404); res.end('Not found'); return; }
    if (info.isDirectory()) target = join(target, 'index.html');

    const body = await readFile(target);
    const headers = { 'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream' };
    // Never cache the service worker — updates must reach clients immediately.
    headers['Cache-Control'] = target.endsWith('sw.js') ? 'no-store' : 'no-cache';
    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Brian Nabavi PWA → http://${HOST}:${PORT}/`);
});
