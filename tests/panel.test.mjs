import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createApp } from '../server/app.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('authenticated panel plans, selects stock, renders, previews and downloads a video', { timeout: 120000 }, async () => {
  const password = 'local-fixture-password-only';
  const fixture = path.join(root, 'out', 'test-stock.mp4');
  await fs.mkdir(path.dirname(fixture), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=270x480:rate=5:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture]);
  const stock = {
    search: async query => { assert.equal(query, 'city'); return [{ id: '42', thumbnail: '/fixture-thumbnail.png', url: 'https://pixabay.com/video/42/', author: 'Offline fixture', duration: 3, width: 270, height: 480 }]; },
    download: async (id, destination) => { assert.equal(id, '42'); await fs.copyFile(fixture, destination); return { id, author: 'Offline fixture', url: 'https://pixabay.com/video/42/' }; },
  };
  const { server, queue } = await createApp({ password, stock, renderWidth: 270, renderFps: 5 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser, jobId;
  try {
    assert.equal((await fetch(`${origin}/api/jobs`)).status, 401);
    assert.equal((await fetch(`${origin}/.env`)).status, 401);
    assert.equal((await fetch(`${origin}/api/login`, { method: 'POST', body: '{}' })).status, 403);
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    await page.route('**/fixture-thumbnail.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh1sAAAAASUVORK5CYII=', 'base64') }));
    const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(origin);
    await page.locator('#password').fill(password); await page.locator('#login-form button').click();
    await page.locator('#studio').waitFor({ state: 'visible' });
    await page.locator('#title').fill('Panel integration check');
    await page.locator('#script').fill('Small steps matter.');
    await page.locator('#plan').click();
    await page.locator('.scene-card').waitFor();
    await page.locator('.scene-media button').click();
    await page.locator('#stock-query').fill('city'); await page.locator('#stock-form button').click();
    await page.locator('.stock-card button').click();
    assert.equal(await page.locator('.scene-card .section-heading').innerText(), 'SAHNE 01\nSTOK GÖRÜNTÜ');
    const [createdResponse] = await Promise.all([page.waitForResponse(response => response.url() === origin + '/api/jobs' && response.request().method() === 'POST'), page.locator('#render').click()]);
    const created = await createdResponse.json();
    assert.equal(createdResponse.status(), 202); jobId = created.id;
    await page.waitForFunction(id => document.getElementById('video').getAttribute('src') === `/media/${id}/video.mp4` && !document.getElementById('downloads').hidden, jobId, { timeout: 90000 });
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    assert.equal((await page.locator('#video').getAttribute('src')).split('/')[2], jobId);
    const job = queue.jobs.get(jobId);
    assert.equal(job.title, 'Panel integration check');
    assert.equal(job.status, 'done'); assert.equal(job.credits[0].author, 'Offline fixture');
    const media = path.join(root, 'out/jobs', job.id, 'video.mp4');
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', media], { encoding: 'utf8' }));
    assert.equal(probe.streams[0].codec_name, 'h264'); assert.equal(probe.streams[0].width, 270); assert.equal(probe.streams[0].height, 480);
    const cookies = await page.context().cookies(); const cookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const response = await fetch(`${origin}/media/${job.id}/video.mp4`, { headers: { Cookie: cookie, Range: 'bytes=0-99' } });
    assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 100);
    const credits = await fetch(`${origin}/media/${job.id}/credits.json`, { headers: { Cookie: cookie } });
    assert.equal((await credits.json())[0].id, '42');
    await page.locator('#video').evaluate(async video => { if (video.readyState < 2) await new Promise(resolve => video.addEventListener('loadeddata', resolve, { once: true })); video.currentTime = .8; });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, 'out/panel-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(root, 'out/panel-mobile.png'), fullPage: true });
    const csrf = await fetch(`${origin}/api/plan`, { method: 'POST', headers: { Cookie: cookie, 'X-Requested-With': 'mfs-panel', Origin: 'https://untrusted.example' }, body: '{}' });
    assert.equal(csrf.status, 403);
    await page.locator('#logout').click(); await page.locator('#login').waitFor({ state: 'visible' });
    assert.equal((await fetch(`${origin}/api/jobs`, { headers: { Cookie: cookie } })).status, 401);
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
    if (jobId) await fs.rm(path.join(root, 'out/jobs', jobId), { recursive: true, force: true });
  }
});
