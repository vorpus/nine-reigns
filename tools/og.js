#!/usr/bin/env node
// Regenerate share/icon assets: web/og.png (1200x630), web/apple-touch-icon.png (180x180), web/favicon.svg.
// Usage: node tools/og.js   (needs Playwright with Chromium installed)
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { catSVG } from '../web/js/catsvg.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

// favicon: the cat's head on a rounded tile
const head = catSVG({ coat: { fur: '#e8964a', shade: '#c9732c', belly: '#f8dfc0' }, pattern: 'tabby' }, { noTail: true })
  .replace('viewBox="0 0 200 200"', 'viewBox="36 -2 128 128"')
  .replace(/<title>.*?<\/title>/, '')
  .replace(/(<svg[^>]*>)/, '$1<rect x="36" y="-2" width="128" height="128" rx="28" fill="#c8643b"/>');
await writeFile(join(root, 'web/favicon.svg'), head.replace(/\n\s*/g, ' ') + '\n');

const server = createServer(async (req, res) => {
  const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(body);
  } catch (e) { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/tools/og.html`;

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Playwright is required: npm i -g playwright && npx playwright install chromium');
  process.exit(1);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(base);
  await page.waitForSelector('body[data-ready]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(root, 'web/og.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.goto(`${base}#icon`);
  await icon.waitForSelector('body[data-ready]');
  await icon.screenshot({ path: join(root, 'web/apple-touch-icon.png'), clip: { x: 0, y: 0, width: 180, height: 180 } });
} finally {
  await browser.close();
  server.close();
}
const size = (await stat(join(root, 'web/og.png'))).size;
console.log(`web/og.png ${(size / 1024).toFixed(0)} KB, web/apple-touch-icon.png, web/favicon.svg written`);
if (size > 300 * 1024) { console.error('og.png is over 300 KB'); process.exit(1); }
