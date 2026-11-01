import fs from 'node:fs';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
export async function sendFile(req, res, file) {
  const stat = await fs.promises.stat(file);
  if (!stat.isFile()) throw new Error('Not a file');
  const ext = file.slice(file.lastIndexOf('.'));
  const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  let start = 0, end = stat.size - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
    if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
    if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(req.headers.range ? 206 : 200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
}
