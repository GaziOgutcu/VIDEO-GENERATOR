import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { sendFile } from '../server/files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('14 stock scenes load only active footage and release previous clips, including rewind', { timeout: 60000 }, async () => {
  const fixture = path.join(root, 'out/lazy-stock-fixture.mp4');
  await fs.mkdir(path.dirname(fixture), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=270x480:rate=5:duration=2', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', fixture]);
  let requests = 0;
  const server = createServer(async (req, res) => {
    try {
      if (req.url.includes('lazy-stock-fixture')) requests++;
      await sendFile(req, res, path.join(root, new URL(req.url, 'http://localhost').pathname));
    } catch { if (!res.headersSent) res.writeHead(404).end(); else res.destroy(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/src/stage/stage.html`);
    const theme = JSON.parse(await fs.readFile(path.join(root, 'brand/theme.json'), 'utf8'));
    const project = { duration: 14, seed: 'memory-check', look: { transition: 'cut' }, scenes: Array.from({ length: 14 }, (_, i) => ({ template: 'story', at: i, title: `Scene ${i}`, data: { text: 'Test footage', video: `/out/lazy-stock-fixture.mp4?scene=${i}` } })) };
    await page.evaluate(([p, t]) => window.init(p, [], t), [project, theme]);
    assert.equal(requests, 0, 'Inactive media must not preload');
    for (const time of [.5, 10.5, .5]) {
      await page.evaluate(t => window.seekAsync(t), time);
      const loaded = await page.evaluate(() => [...document.querySelectorAll('video')].filter(v => v.hasAttribute('src')).map(v => v.getAttribute('src')));
      assert.equal(loaded.length, 1);
      assert.match(loaded[0], new RegExp(`scene=${Math.floor(time)}$`));
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await fs.rm(fixture, { force: true }); }
});
