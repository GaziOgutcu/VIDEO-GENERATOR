import test from 'node:test';
import assert from 'node:assert/strict';
import { planScript, validateScenes, compileProject } from '../server/planner.mjs';
import { PexelsStock } from '../server/stock.mjs';
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
test('Pexels search uses server authentication and hides download URLs', async () => {
  const provider = new PexelsStock({ key: 'fixture-test-key', fetcher: async (url, options) => {
    assert.match(url, /query=city%20lights/); assert.equal(options.headers.Authorization, 'fixture-test-key');
    return Response.json({ videos: [{ id: 42, image: 'https://images.pexels.com/test.jpg', user: { name: 'Test author' }, video_files: [{ file_type: 'video/mp4', width: 540, height: 960, link: 'https://videos.pexels.com/test.mp4' }] }] });
  } });
  const [video] = await provider.search('city lights');
  assert.equal(video.id, '42'); assert.equal(video.author, 'Test author'); assert.equal(video.download, undefined);
});
test('Pexels download rejects untrusted destinations before fetching bytes', async () => {
  let calls = 0;
  const provider = new PexelsStock({ key: 'fixture', fetcher: async () => {
    calls++;
    return Response.json({ id: 42, video_files: [{ file_type: 'video/mp4', width: 1, height: 1, link: 'https://127.0.0.1/private' }] });
  } });
  await assert.rejects(provider.download('42', '/tmp/unused-stock.mp4'), /doğrulanamadı/); assert.equal(calls, 1);
});
test('Pexels downloader fetches metadata separately and never forwards API key to media CDN', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mfs-stock-'));
  const destination = path.join(directory, 'clip.mp4');
  let calls = 0;
  const provider = new PexelsStock({ key: 'fixture', fetcher: async (url, options) => {
    if (++calls === 1) return Response.json({ id: 7, user: { name: 'Author' }, video_files: [{ file_type: 'video/mp4', width: 540, height: 960, link: 'https://videos.pexels.com/clip.mp4' }] });
    assert.equal(String(url), 'https://videos.pexels.com/clip.mp4'); assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error');
    return new Response(new Uint8Array([1, 2, 3]));
  } });
  try { const credit = await provider.download('7', destination); assert.equal(credit.author, 'Author'); assert.deepEqual([...await fs.readFile(destination)], [1, 2, 3]); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
});
