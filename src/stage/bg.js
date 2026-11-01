// Backgrounds (6 styles) tinted by the video's look. Deterministic in t.
window.Background = (() => {
  const c = document.getElementById('bg'), x = c.getContext('2d');
  const R = Variation.rng('dust');
  const dust = Array.from({ length: 70 }, () => ({ x: R() * 1080, y: R() * 1920, r: .8 + R() * 2.2, a: .1 + R() * .3, v: 8 + R() * 26, ph: R() * 6.28 }));
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const styles = {
    grid(t, L) { x.strokeStyle = 'rgba(255,255,255,.035)'; x.lineWidth = 1; x.beginPath(); const o = (t * 6) % 90;
      for (let i = 0; i <= 1080; i += 90) { x.moveTo(i, 0); x.lineTo(i, 1920); } for (let j = -90; j <= 1920; j += 90) { x.moveTo(0, j + o); x.lineTo(1080, j + o); } x.stroke(); },
    dots(t, L) { for (let i = 0; i < 1080 / 54 + 1; i++) for (let j = 0; j < 1920 / 54 + 1; j++) { const w = .5 + .5 * Math.sin(t * 1.6 + i * .45 + j * .3);
      x.fillStyle = rgba(L.accent, .05 + .11 * w); x.beginPath(); x.arc(i * 54, j * 54, 2.2 + 1.6 * w, 0, 6.283); x.fill(); } },
    diagonal(t, L) { x.strokeStyle = rgba(L.accent, .05); x.lineWidth = 2; x.beginPath(); const o = (t * 14) % 80;
      for (let i = -2000; i < 1080; i += 80) { x.moveTo(i + o, 1920); x.lineTo(i + o + 1920 * .7, 0); } x.stroke(); },
    aurora(t, L) { const bl = [[.25, .3, L.accent, .22, 1], [.8, .55, L.pair, .16, 1.3], [.4, .85, L.accentB, .12, .8]];
      bl.forEach(([bx, by, col, a, s], i) => { const px = 1080 * (bx + .09 * Math.sin(t * .5 * s + i * 2)), py = 1920 * (by + .06 * Math.cos(t * .4 * s + i));
        const g = x.createRadialGradient(px, py, 10, px, py, 760); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); }); },
    blueprint(t, L) { x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.028)'; x.beginPath(); for (let i = 0; i <= 1080; i += 30) { x.moveTo(i, 0); x.lineTo(i, 1920); } for (let j = 0; j <= 1920; j += 30) { x.moveTo(0, j); x.lineTo(1080, j); } x.stroke();
      x.strokeStyle = rgba(L.accent, .09); x.beginPath(); for (let i = 0; i <= 1080; i += 150) { x.moveTo(i, 0); x.lineTo(i, 1920); } for (let j = 0; j <= 1920; j += 150) { x.moveTo(0, j); x.lineTo(1080, j); } x.stroke();
      x.strokeStyle = rgba(L.accent, .28); x.lineWidth = 2; x.beginPath(); for (let i = 150; i < 1080; i += 150) for (let j = 150; j < 1920; j += 150) { x.moveTo(i - 8, j); x.lineTo(i + 8, j); x.moveTo(i, j - 8); x.lineTo(i, j + 8); } x.stroke(); },
    scan(t, L) { x.fillStyle = 'rgba(255,255,255,.028)'; for (let j = 0; j < 1920; j += 8) x.fillRect(0, j, 1080, 3);
      const y = (t * 260) % 2300 - 200, g = x.createLinearGradient(0, y - 160, 0, y + 160); g.addColorStop(0, rgba(L.accent, 0)); g.addColorStop(.5, rgba(L.accent, .09)); g.addColorStop(1, rgba(L.accent, 0)); x.fillStyle = g; x.fillRect(0, y - 160, 1080, 320); },
  };
  return {
    draw(t, L) {
      x.fillStyle = L.bg0; x.fillRect(0, 0, 1080, 1920);
      let g = x.createRadialGradient(540, 860, 40, 540, 900, 1250); g.addColorStop(0, L.bg1); g.addColorStop(1, L.bg0); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
      styles[L.bgStyle](t, L);
      const br = .06 + .03 * Math.sin(t * 1.4); g = x.createRadialGradient(540, 900, 10, 540, 900, 640); g.addColorStop(0, rgba(L.accent, br)); g.addColorStop(1, rgba(L.accent, 0)); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
      if (L.dust) for (const d of dust) { const yy = ((d.y - t * d.v) % 1920 + 1920) % 1920, xx = d.x + Math.sin(t * .6 + d.ph) * 14;
        x.globalAlpha = d.a * (.6 + .4 * Math.sin(t * 1.3 + d.ph)); x.fillStyle = L.accentB; x.beginPath(); x.arc(xx, yy, d.r, 0, 6.283); x.fill(); }
      x.globalAlpha = 1; g = x.createRadialGradient(540, 960, 600, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
    }
  };
})();
