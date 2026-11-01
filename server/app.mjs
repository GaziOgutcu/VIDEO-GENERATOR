import { createServer } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PixabayStock } from './stock.mjs';
import { JobQueue } from './jobs.mjs';
import { planScript, validateScenes } from './planner.mjs';
import { sendFile } from './files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
async function body(req) {
  let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 64000) throw new Error('İstek çok büyük.'); }
  return JSON.parse(text || '{}');
}
export async function createApp({ authEnabled = process.env.PANEL_AUTH_ENABLED === 'true', password = process.env.PANEL_PASSWORD, stock = new PixabayStock(), workspace = root, renderWidth = 540, renderFps = 15 } = {}) {
  if (authEnabled && (!password || password.length < 12 || password.length > 256)) throw new Error('PANEL_PASSWORD en az 12, en fazla 256 karakter olmalı. Güvenli ortam ayarlarında tanımlayın.');
  const salt = randomBytes(16), hash = authEnabled ? scryptSync(password, salt, 32) : null, sessions = new Map(), attempts = new Map();
  const queue = new JobQueue({ root: workspace, stock, renderWidth, renderFps }); await queue.init();
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://cdn.pixabay.com https://pixabay.com; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const mutation = !['GET', 'HEAD'].includes(req.method);
      if (mutation && (req.headers['x-requested-with'] !== 'mfs-panel' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host))) return json(res, 403, { error: 'Geçersiz istek kaynağı.' });
      if (route === '/healthz' && req.method === 'GET') return json(res, 200, { ok: true });
      if (route === '/api/login' && req.method === 'POST') {
        if (!authEnabled) return json(res, 200, { ok: true });
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        for (const [key, value] of attempts) if (now - value.since > 15 * 60 * 1000) attempts.delete(key);
        const attempt = attempts.get(ip) || { since: now, count: 0 }; attempts.set(ip, attempt);
        if (++attempt.count > 10) return json(res, 429, { error: 'Çok fazla giriş denemesi. 15 dakika bekleyin.' });
        const input = await body(req);
        if (typeof input.password !== 'string' || input.password.length > 256 || !timingSafeEqual(scryptSync(input.password, salt, 32), hash)) return json(res, 401, { error: 'Parola yanlış.' });
        attempts.delete(ip);
        for (const [key, expiry] of sessions) if (expiry < now) sessions.delete(key);
        if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
        const token = randomBytes(32).toString('hex'); sessions.set(token, now + 12 * 3600000);
        res.setHeader('Set-Cookie', `mfs_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
        return json(res, 200, { ok: true });
      }
      if (['/', '/app.js', '/style.css'].includes(route) && ['GET', 'HEAD'].includes(req.method)) return await sendFile(req, res, path.join(root, 'public', route === '/' ? 'index.html' : route.slice(1)));
      if (/^\/fonts\/inter-latin-(400|600|700|900)-normal\.woff2$/.test(route) && ['GET', 'HEAD'].includes(req.method)) return await sendFile(req, res, path.join(root, 'node_modules/@fontsource/inter/files', route.split('/').at(-1)));
      if (route === '/favicon.ico') { res.writeHead(204).end(); return; }
      const token = /(?:^|;\s*)mfs_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      if (authEnabled && (!token || !sessions.has(token) || sessions.get(token) < Date.now())) return json(res, 401, { error: 'Oturum açın.' });
      if (route === '/api/logout' && req.method === 'POST') { sessions.delete(token); res.setHeader('Set-Cookie', 'mfs_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); return json(res, 200, { ok: true }); }
      if (route === '/api/config' && req.method === 'GET') return json(res, 200, { authEnabled, stock: Boolean(process.env.PIXABAY_API_KEY), narration: Boolean(process.env.ELEVENLABS_API_KEY), defaultVoice: process.env.ELEVENLABS_VOICE_ID || '', width: renderWidth, fps: renderFps });
      if (route === '/api/voices' && req.method === 'GET') {
        if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY tanımlı değil.');
        const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, redirect: 'error', signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`Ses listesi alınamadı (${response.status}).`);
        const data = await response.json(); return json(res, 200, { voices: (data.voices || []).map(v => ({ id: v.voice_id, name: v.name })) });
      }
      if (route === '/api/plan' && req.method === 'POST') { const input = await body(req); return json(res, 200, { scenes: planScript(input.script) }); }
      if (route === '/api/stock' && req.method === 'GET') {
        const query = (url.searchParams.get('q') || '').trim(); if (!query || query.length > 100) throw new Error('1–100 karakter arama kelimesi girin.');
        return json(res, 200, { videos: await stock.search(query) });
      }
      if (route === '/api/jobs' && req.method === 'GET') return json(res, 200, { jobs: queue.list() });
      if (route === '/api/jobs' && req.method === 'POST') {
        const input = await body(req), scenes = validateScenes(input.scenes);
        if (typeof input.narration !== 'boolean') throw new Error('Seslendirme tercihi geçersiz.');
        const voice = input.voice || process.env.ELEVENLABS_VOICE_ID;
        if (input.narration && (!process.env.ELEVENLABS_API_KEY || !/^[A-Za-z0-9_-]{1,100}$/.test(voice || ''))) throw new Error('Seslendirme için API anahtarı ve geçerli bir ses gerekli.');
        return json(res, 202, await queue.create({ scenes, narration: input.narration, voice, title: String(input.title || 'Yeni video').slice(0, 100), seed: String(input.seed || 'mfs-panel').slice(0, 100) }));
      }
      const jobMatch = /^\/api\/jobs\/([a-f0-9-]{36})$/.exec(route);
      if (jobMatch && req.method === 'GET') { const job = queue.jobs.get(jobMatch[1]); return json(res, job ? 200 : 404, job || { error: 'Video bulunamadı.' }); }
      const media = /^\/media\/([a-f0-9-]{36})\/(video\.mp4|credits\.json|project\.json)$/.exec(route);
      if (media && ['GET', 'HEAD'].includes(req.method)) {
        const job = queue.jobs.get(media[1]); if (!job || job.status !== 'done') return json(res, 404, { error: 'Video hazır değil.' });
        return await sendFile(req, res, path.join(queue.directory, media[1], media[2]));
      }
      json(res, 404, { error: 'Bulunamadı.' });
    } catch (error) {
      if (res.headersSent) res.destroy(); else json(res, 400, { error: error instanceof SyntaxError ? 'Geçersiz JSON.' : error.message });
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  return { server, queue };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const width = Number(process.env.RENDER_WIDTH || 540), fps = Number(process.env.RENDER_FPS || 15);
  if (![540, 1080].includes(width) || ![15, 30].includes(fps)) throw new Error('RENDER_WIDTH 540/1080, RENDER_FPS 15/30 olmalı.');
  const { server } = await createApp({ renderWidth: width, renderFps: fps });
  const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000);
  server.listen(port, host, () => console.log(`MFS panel listening on ${host}:${server.address().port}`));
}
