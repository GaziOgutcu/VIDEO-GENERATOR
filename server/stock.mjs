import fs from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

export class PexelsStock {
  constructor({ key = process.env.PEXELS_API_KEY, fetcher = fetch } = {}) { this.key = key; this.fetcher = fetcher; }
  async api(route) {
    if (!this.key) throw new Error('Stok araması için sunucuda PEXELS_API_KEY tanımlayın.');
    const res = await this.fetcher(`https://api.pexels.com${route}`, { headers: { Authorization: this.key }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Pexels isteği başarısız (${res.status}). Anahtarı ve kullanım kotasını kontrol edin.`);
    return res.json();
  }
  normalize(video) {
    const files = (video.video_files || []).filter(f => f.file_type === 'video/mp4' && f.width > 0 && f.height > 0);
    files.sort((a, b) => Math.abs(a.height - 960) - Math.abs(b.height - 960));
    if (!files.length) return null;
    return { id: String(video.id), thumbnail: video.image, url: video.url, author: video.user?.name || 'Pexels', authorUrl: video.user?.url, duration: video.duration, width: files[0].width, height: files[0].height, download: files[0].link };
  }
  async search(query) {
    const data = await this.api(`/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=9`);
    return (data.videos || []).map(v => this.normalize(v)).filter(Boolean).map(({ download, ...v }) => v);
  }
  async download(id, destination) {
    const video = this.normalize(await this.api(`/videos/videos/${id}`));
    if (!video) throw new Error('İndirilebilir MP4 bulunamadı.');
    const url = new URL(video.download);
    if (url.protocol !== 'https:' || !(url.hostname === 'videos.pexels.com' || url.hostname.endsWith('.pexels.com')) || url.username || url.password || url.port) throw new Error('Stok medya adresi doğrulanamadı.');
    const res = await this.fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(120000) });
    if (!res.ok || !res.body) throw new Error(`Stok indirme başarısız (${res.status}).`);
    let size = 0;
    const limit = new Transform({ transform(chunk, encoding, callback) { size += chunk.length; callback(size > 100 * 1024 * 1024 ? new Error('Stok klip 100 MB sınırını aşıyor.') : null, chunk); } });
    try { await pipeline(Readable.fromWeb(res.body), limit, createWriteStream(destination)); }
    catch (error) { await fs.rm(destination, { force: true }); throw error; }
    const { download, ...credit } = video;
    return credit;
  }
}
