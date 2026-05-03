'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

function etag(content) {
  return '"' + crypto.createHash('md5').update(content).digest('hex').slice(0, 16) + '"';
}

/**
 * Attempt to serve a static file. Returns true if handled, false otherwise.
 */
function serveStatic(req, res, reqPath, rootDir, prefix = '/') {
  if (!reqPath.startsWith(prefix)) return false;

  const relative = reqPath.slice(prefix.length) || 'index.html';
  // prevent directory traversal
  const safePath = path.normalize(relative).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(rootDir, safePath);

  // don't let the path escape rootDir
  if (!filePath.startsWith(rootDir)) return false;

  let stat;
  try { stat = fs.statSync(filePath); } catch { return false; }

  // if directory, serve index.html inside it
  let target = filePath;
  if (stat.isDirectory()) {
    target = path.join(filePath, 'index.html');
    try { fs.statSync(target); } catch { return false; }
  }

  const ext = path.extname(target).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  let content;
  try { content = fs.readFileSync(target); } catch { return false; }

  const tag = etag(content);
  if (req.headers['if-none-match'] === tag) {
    res.writeHead(304);
    res.end();
    return true;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length,
    'ETag': tag,
    'Cache-Control': 'public, max-age=3600',
  });

  if (req.method === 'HEAD') { res.end(); return true; }
  res.end(content);
  return true;
}

module.exports = { serveStatic };
