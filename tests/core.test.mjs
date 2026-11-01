import test from 'node:test';
import assert from 'node:assert/strict';
import { planScript, validateScenes, compileProject } from '../server/planner.mjs';
import { PixabayStock } from '../server/stock.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('planner preserves narration and compiles distinct numeric scene anchors', () => {
  const script = 'Saving starts with one small habit. Saving grows when you keep that habit every day.';
  const scenes = validateScenes(planScript(script));
  assert.equal(scenes.map(s => s.text).join(' '), script);
  assert.equal(scenes.length, 2);
  scenes[1].stockId = '42';
  const result = compileProject(scenes, { assets: { 42: '/out/jobs/example/stock-42.mp4' } });
  assert.equal(result.project.scenes[1].at, result.words[6].s);
  assert.equal(result.project.scenes[1].data.video, '/out/jobs/example/stock-42.mp4');
  assert.ok(result.project.scenes[1].at > 0);
  assert.equal(result.words.map(w => w.w).join(' '), script);
});
test('planner rejects missing text, oversized input and URL injection in stock IDs', () => {
  assert.throws(() => planScript(''));
  assert.throws(() => planScript('x'.repeat(6001)));
  assert.throws(() => validateScenes([{ title: 'test', text: 'test', stockId: 'https://localhost' }]));
});
test('Pixabay search keeps the key server-side, parses hits and caches results', async () => {
  let calls = 0;
  const provider = new PixabayStock({ key: 'fixture-test-key', fetcher: async (url, options) => {
    calls++; const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://pixabay.com/api/videos/');
    assert.equal(parsed.searchParams.get('q'), 'city lights'); assert.equal(parsed.searchParams.get('key'), 'fixture-test-key');
    assert.equal(options.redirect, 'error');
    return Response.json({ hits: [{ id: 42, user: 'Test author', pageURL: 'https://pixabay.com/videos/test-42/', videos: { medium: { width: 540, height: 960, url: 'https://cdn.pixabay.com/test.mp4', thumbnail: 'https://cdn.pixabay.com/test.jpg' } } }] });
  } });
  const [video] = await provider.search('city lights');
  assert.equal(video.id, '42'); assert.equal(video.author, 'Test author'); assert.equal(video.download, undefined);
  assert.equal(JSON.stringify(video).includes('fixture-test-key'), false);
  await provider.search('city lights'); assert.equal(calls, 1);
});
test('Pixabay download rejects untrusted destinations before fetching bytes', async () => {
  let calls = 0;
  const provider = new PixabayStock({ key: 'fixture', fetcher: async () => {
    calls++;
    return Response.json({ hits: [{ id: 42, videos: { medium: { width: 1, height: 1, url: 'https://127.0.0.1/private' } } }] });
  } });
  await assert.rejects(provider.download('42', '/tmp/unused-stock.mp4'), /doğrulanamadı/); assert.equal(calls, 1);
});
test('Pixabay downloader fetches metadata by ID and never forwards API key to CDN', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mfs-stock-'));
  const destination = path.join(directory, 'clip.mp4');
  let calls = 0;
  const provider = new PixabayStock({ key: 'fixture', fetcher: async (url, options) => {
    if (++calls === 1) {
      assert.equal(new URL(url).searchParams.get('id'), '7');
      return Response.json({ hits: [{ id: 7, user: 'Author', videos: { medium: { width: 540, height: 960, url: 'https://cdn.pixabay.com/clip.mp4' } } }] });
    }
    assert.equal(String(url), 'https://cdn.pixabay.com/clip.mp4'); assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error');
    return new Response(new Uint8Array([1, 2, 3]));
  } });
  try { const credit = await provider.download('7', destination); assert.equal(credit.author, 'Author'); assert.deepEqual([...await fs.readFile(destination)], [1, 2, 3]); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
});
test('Pixabay network failures do not expose the API key in error messages', async () => {
  const provider = new PixabayStock({ key: 'fixture-private-key', fetcher: async url => { throw new Error('Request failed: ' + url); } });
  await assert.rejects(provider.search('city'), error => !error.message.includes('fixture-private-key'));
});
