// Usage: node src/render.mjs --project examples/rates/project.json --words examples/rates/words.json --out out.mp4
//        [--audio narration.mp3] [--width 1080] [--fps 30] [--still 5.2 --out frame.png]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { sendFile } from '../server/files.mjs';
import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2), get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const projectPath = get('--project'), wordsPath = get('--words'), out = get('--out', 'out.mp4'), audio = get('--audio'), still = get('--still');
if (!projectPath || !wordsPath) throw new Error('--project and --words are required');
if (audio && !fs.existsSync(audio)) throw new Error('Audio file not found: ' + audio);
const OW = Number(get('--width', 1080)), OH = Math.round(OW * 16 / 9 / 2) * 2, fps = Number(get('--fps', 30));
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8')), words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
if (get('--seed')) project.seed = get('--seed');
const logPath = path.join(root, '.looks-log.json'), log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
if (!a.includes('--no-avoid') && still === undefined) project.look = { ...(project.look || {}), avoid: log.slice(-3) };
const theme = JSON.parse(fs.readFileSync(path.join(root, 'brand/theme.json'), 'utf8'));

function findChrome() {
  const c = [process.env.CHROME_PATH];
  try { c.push(chromium.executablePath()); } catch {}
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (pw && fs.existsSync(pw)) for (const d of fs.readdirSync(pw).filter(n => /^chromium-\d+/.test(n))) c.push(path.join(pw, d, 'chrome-linux64/chrome'), path.join(pw, d, 'chrome-linux/chrome'));
  c.push('/usr/bin/chromium', '/usr/bin/google-chrome');
  const f = c.find(p => p && fs.existsSync(p)); if (!f) throw new Error('Chromium not found; set CHROME_PATH'); return f;
}
// Serve local assets over HTTP: managed Chromium can block file:// navigation.
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || path.relative(root, file).split(path.sep).some(part => part.startsWith('.'))) {
      res.writeHead(403).end(); return;
    }
    await sendFile(req, res, file);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
let browser;
let ff;
try {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: findChrome(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: OW / 1080 });
  let pageError;
  page.on('pageerror', error => { pageError = error; }); page.on('console', m => m.type() === 'error' && console.error('[page]', m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/src/stage/stage.html`);
  await page.evaluate(([p, w, t]) => window.init(p, w, t), [project, words, theme]);
  const dur = await page.evaluate(() => window.getDuration());
  const shot = () => { if (pageError) throw pageError; return page.locator('#stage').screenshot({ type: 'png' }); };
  if (still !== undefined) { await page.evaluate(t => window.seekAsync(t), Number(still)); fs.writeFileSync(out, await shot()); console.log('Saved', out); }
  else {
    const frames = Math.round(dur * fps);
    const inArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
    const aArgs = audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest'] : [];
    ff = spawn('ffmpeg', [...inArgs, ...aArgs, '-threads', '1', '-filter_threads', '1', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', '-t', dur.toFixed(3), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.once('error', rej).once('exit', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
    done.catch(() => {});
    ff.stdin.on('error', () => {});
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => window.seekAsync(t), i / fps);
      const frame = await shot();
      await new Promise((resolve, reject) => ff.stdin.write(frame, error => error ? reject(error) : resolve()));
      if (i % 30 === 0) process.stdout.write(`\r${i}/${frames}`);
    }
    ff.stdin.end(); await done; const L = await page.evaluate(() => window.getLook()); log.push(L); fs.writeFileSync(logPath, JSON.stringify(log.slice(-20)));
    fs.writeFileSync(out + '.look.json', JSON.stringify({ accent: L.accentName, tone: L.toneIdx, bg: L.bgStyle, caption: L.caption, camera: L.camera, transition: L.transition, titleStyle: L.titleStyle }, null, 1));
    console.log(`\nSaved ${out} (${dur.toFixed(2)}s, ${OW}x${OH}@${fps}) look: ${L.accentName}/${L.bgStyle}/${L.caption}/${L.titleStyle}/${L.transition}/${L.camera}`);
  }
} catch (e) { ff?.kill('SIGKILL'); throw e; } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
