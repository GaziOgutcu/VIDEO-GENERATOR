import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { compileProject } from './planner.mjs';
import { selectAutomaticStock } from './auto-stock.mjs';
import { narrate } from './narration.mjs';

export class JobQueue {
  constructor({ root, stock, renderWidth = 540, renderFps = 15 }) {
    this.root = root; this.directory = path.join(root, 'out/jobs'); this.stock = stock;
    this.renderWidth = renderWidth; this.renderFps = renderFps; this.jobs = new Map(); this.pending = []; this.active = false;
  }
  async init() {
    await fs.mkdir(this.directory, { recursive: true });
    for (const entry of await fs.readdir(this.directory)) {
      if (!/^[a-f0-9-]{36}$/.test(entry)) continue;
      try {
        const job = JSON.parse(await fs.readFile(path.join(this.directory, entry, 'status.json'), 'utf8'));
        if (!['done', 'failed'].includes(job.status)) { job.status = 'failed'; job.message = 'Sunucu yeniden başladı. Videoyu tekrar oluşturun.'; }
        this.jobs.set(entry, job);
      } catch { /* incomplete directory is not a valid job */ }
    }
  }
  async save(job) {
    this.jobs.set(job.id, job);
    const file = path.join(this.directory, job.id, 'status.json');
    await fs.writeFile(file + '.tmp', JSON.stringify(job)); await fs.rename(file + '.tmp', file);
  }
  list() { return [...this.jobs.values()].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 50); }
  async create(input) {
    if (this.pending.length + Number(this.active) >= 5) throw new Error('Render kuyruğu dolu. Bir işin bitmesini bekleyin.');
    const job = { id: randomUUID(), title: input.title, created: new Date().toISOString(), status: 'queued', message: 'Sırada', progress: 0, credits: [] };
    await fs.mkdir(path.join(this.directory, job.id), { recursive: true });
    await this.save(job); this.pending.push({ job, input }); void this.pump(); return job;
  }
  async pump() {
    if (this.active || !this.pending.length) return;
    this.active = true;
    const { job, input } = this.pending.shift();
    try { await this.run(job, input); }
    catch (error) { job.status = 'failed'; job.message = error.message; await this.save(job); }
    finally { this.active = false; void this.pump(); }
  }
  async run(job, input) {
    const dir = path.join(this.directory, job.id);
    job.status = 'preparing'; job.message = 'Sahneler hazırlanıyor'; await this.save(job);
    job.warnings = [];
    if (input.autoStock) {
      job.warnings = await selectAutomaticStock(input.scenes, this.stock, async (index, total) => {
        job.message = `Stok görüntüler otomatik seçiliyor (${index}/${total})`; await this.save(job);
      });
    }
    const script = input.scenes.map(sc => sc.text).join(' ');
    await fs.writeFile(path.join(dir, 'script.txt'), script);
    let words;
    if (input.narration) {
      job.message = 'Seslendirme ve kelime zamanlamaları oluşturuluyor'; await this.save(job);
      words = await narrate(script, input.voice, dir);
    }
    const assets = {};
    for (const sc of input.scenes) {
      if (!sc.stockId || assets[sc.stockId]) continue;
      job.message = 'Seçilen stok görüntüler indiriliyor'; await this.save(job);
      const name = `stock-${sc.stockId}.mp4`;
      const credit = await this.stock.download(sc.stockId, path.join(dir, name));
      job.credits.push(credit); assets[sc.stockId] = `/out/jobs/${job.id}/${name}`;
    }
    const compiled = compileProject(input.scenes, { words, assets, seed: input.seed });
    await fs.writeFile(path.join(dir, 'project.json'), JSON.stringify(compiled.project, null, 2));
    await fs.writeFile(path.join(dir, 'words.json'), JSON.stringify(compiled.words));
    await fs.writeFile(path.join(dir, 'credits.json'), JSON.stringify(job.credits, null, 2));
    job.status = 'rendering'; job.message = 'Video render ediliyor'; await this.save(job);
    const args = [path.join(this.root, 'src/render.mjs'), '--project', path.join(dir, 'project.json'), '--words', path.join(dir, 'words.json'), '--width', String(this.renderWidth), '--fps', String(this.renderFps), '--no-avoid', '--out', path.join(dir, 'video.mp4')];
    if (input.narration) args.push('--audio', path.join(dir, 'narration.mp3'));
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd: this.root, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      let log = '';
      const timer = setTimeout(() => { if (process.platform === 'win32') child.kill(); else { try { process.kill(-child.pid, 'SIGKILL'); } catch {} } reject(new Error('Render 30 dakika sınırını aştı.')); }, 30 * 60 * 1000);
      child.stdout.on('data', chunk => {
        log = (log + chunk).slice(-16000);
        const matches = [...String(chunk).matchAll(/(\d+)\/(\d+)/g)], last = matches.at(-1);
        if (last) job.progress = Math.min(99, Math.round(Number(last[1]) / Number(last[2]) * 100));
      });
      child.stderr.on('data', chunk => { log = (log + chunk).slice(-16000); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', async code => {
        clearTimeout(timer);
        try { await fs.writeFile(path.join(dir, 'render.log'), log); }
        catch { /* status still reports the failure */ }
        code === 0 ? resolve() : reject(new Error('Render tamamlanamadı. Sunucudaki render.log dosyasını kontrol edin.'));
      });
    });
    job.status = 'done'; job.progress = 100; job.message = job.warnings.length ? 'Video hazır · ' + job.warnings.join(' ') : 'Video hazır'; await this.save(job);
  }
}
