import fs from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

export class PixabayStock {
  constructor({ key = process.env.PIXABAY_API_KEY, fetcher = fetch } = {}) {
    this.key = key; this.fetcher = fetcher; this.cache = new Map();
  }
  async api(params) {
    if (!this.key) throw new Error('Stok araması için sunucuda PIXABAY_API_KEY tanımlayın. Mevcut ElevenLabs ayarlarını değiştirmeyin.');
    const query = new URLSearchParams({ ...params, key: this.key, safesearch: 'true' });
    const cacheKey = new URLSearchParams(params).toString();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.data;
    let res;
    try {
      res = await this.fetcher(`https://pixabay.com/api/videos/?${query}`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch { throw new Error('Pixabay bağlantısı kurulamadı. Sunucunun ağ erişimini kontrol edin.'); }
    if (!res.ok) throw new Error(`Pixabay isteği başarısız (${res.status}). Anahtarı ve kullanım kotasını kontrol edin.`);
    let data;
    try { data = await res.json(); } catch { throw new Error('Pixabay yanıtı okunamadı.'); }
    // Pixabay asks clients to cache API results for 24 hours; bound memory use.
    for (const [key, entry] of this.cache) if (entry.expires <= Date.now()) this.cache.delete(key);
    if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(cacheKey, { data, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return data;
  }
  normalize(video) {
    const files = Object.values(video.videos || {}).filter(f => f.url && f.width > 0 && f.height > 0);
    files.sort((a, b) => Math.abs(a.height - 960) - Math.abs(b.height - 960));
    if (!files.length) return null;
    return { id: String(video.id), thumbnail: files[0].thumbnail || video.userImageURL || '', url: video.pageURL, author: video.user || 'Pixabay', duration: video.duration, width: files[0].width, height: files[0].height, download: files[0].url, provider: 'Pixabay' };
  }
  async search(query) {
    const data = await this.api({ q: query, per_page: '9' });
    return (data.hits || []).map(v => this.normalize(v)).filter(Boolean).map(({ download, ...v }) => v);
  }
  async download(id, destination) {
    if (!/^\d{1,16}$/.test(String(id))) throw new Error('Stok kimliği geçersiz.');
    const data = await this.api({ id: String(id) });
    const video = this.normalize((data.hits || []).find(v => String(v.id) === String(id)) || {});
    if (!video) throw new Error('İndirilebilir MP4 bulunamadı.');
    const url = new URL(video.download);
    if (url.protocol !== 'https:' || !(url.hostname === 'pixabay.com' || url.hostname.endsWith('.pixabay.com')) || url.username || url.password || url.port) throw new Error('Stok medya adresi doğrulanamadı.');
    let res;
    try { res = await this.fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(120000) }); }
    catch { throw new Error('Pixabay klibi indirilemedi. Medya sunucusunun ağ erişimini kontrol edin.'); }
    if (!res.ok || !res.body) throw new Error(`Stok indirme başarısız (${res.status}).`);
    let size = 0;
    const limit = new Transform({ transform(chunk, encoding, callback) { size += chunk.length; callback(size > 100 * 1024 * 1024 ? new Error('Stok klip 100 MB sınırını aşıyor.') : null, chunk); } });
    try { await pipeline(Readable.fromWeb(res.body), limit, createWriteStream(destination)); }
    catch (error) { await fs.rm(destination, { force: true }); throw error; }
    const { download, ...credit } = video;
    return credit;
  }
}
