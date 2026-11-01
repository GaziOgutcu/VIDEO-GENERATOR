// Template: big-number — one hero stat that counts up. layouts: center | split | card. Hero = glyph or external asset PNG.
// data: { value, prefix, suffix, decimals, label, sub, icon, asset:{src,mode}, meter:{max,kind:'ring'|'bar'} }
(() => {
  const { clamp, outCubic, outBack } = window.E;
  window.TEMPLATES['big-number'] = {
    layouts: ['center', 'split', 'card'],
    mount(root, sc, theme, L) {
      const d = sc.data, lay = L.layout, left = lay === 'split';
      const col = { a: L.accent, b: window.getLook().accentB };
      const wrap = H('div', 'position:absolute;inset:0', root); const items = [];
      const al = left ? 'left' : 'center', X = left ? 90 : 0, W = left ? 900 : 1080;
      let cardEl = null, y0 = 520;
      if (lay === 'card') { cardEl = window.card(wrap, L, 'left:90px;top:500px;width:900px;height:800px'); y0 = 560; }
      const hero = H('div', `position:absolute;left:${left ? 90 : 540 - 150}px;top:${y0}px;width:300px;height:300px;display:flex;align-items:center;justify-content:${left ? 'flex-start' : 'center'}`, wrap);
      const size = lay === 'card' ? 230 : 270;
      if (d.asset?.src) { const im = H('img', `height:${size + 40}px;object-fit:contain;filter:drop-shadow(0 20px 40px rgba(0,0,0,.6)) drop-shadow(0 0 40px ${L.accent}55)`, hero); im.src = d.asset.src; }
      else hero.appendChild(Glyph.el(d.icon || 'coin', L.glyphStyle, col, size));
      const ny = y0 + 300;
      const num = H('div', `position:absolute;left:${X}px;width:${W}px;top:${ny}px;text-align:${al};font-weight:900;font-size:230px;line-height:1;letter-spacing:-.045em;white-space:nowrap;font-feature-settings:"tnum";text-shadow:0 10px 50px rgba(0,0,0,.5)`, wrap);
      const label = H('div', `position:absolute;left:${X}px;width:${W}px;top:${ny + 250}px;text-align:${al};font-weight:900;font-size:52px;letter-spacing:-.01em;color:${L.accent}`, wrap, (d.label || '').toUpperCase());
      const sub = H('div', `position:absolute;left:${X}px;width:${W}px;top:${ny + 322}px;text-align:${al};font-weight:800;font-size:30px;letter-spacing:.06em;color:var(--muted)`, wrap, (d.sub || '').toUpperCase());
      let meter = null;
      if (d.meter) {
        const kind = d.meter.kind || (left ? 'ring' : 'bar');
        if (kind === 'ring') { const R = 120, C = 2 * Math.PI * R; meter = H('div', `position:absolute;left:${left ? 650 : 420}px;top:${left ? y0 + 20 : ny + 400}px;width:260px;height:260px`, wrap);
          meter.innerHTML = `<svg viewBox="0 0 260 260" width="260" height="260"><circle cx="130" cy="130" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="22"/><circle id="mr" cx="130" cy="130" r="${R}" fill="none" stroke="${L.accent}" stroke-width="22" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 130 130)" style="filter:drop-shadow(0 0 12px ${L.accent})"/></svg>`; meter.ring = meter.querySelector('#mr'); meter.C = C; meter.kind = 'ring'; }
        else { const tr = H('div', `position:absolute;left:${left ? 90 : 140}px;top:${ny + 405}px;width:${left ? 900 : 800}px;height:30px;border-radius:15px;background:rgba(255,255,255,.1);overflow:hidden`, wrap);
          meter = H('div', `height:100%;width:0;border-radius:15px;background:linear-gradient(90deg,${L.accent},${window.getLook().accentB});box-shadow:0 0 24px ${L.accent}`, tr); meter.kind = 'bar'; }
      }
      const parts = [hero, num, label, sub]; if (meter) parts.push(meter.kind === 'bar' ? meter.parentElement : meter);
      let fs = 230; const rg = document.createRange(); num.textContent = (d.prefix || '') + fmt(d.value, d.decimals || 0) + (d.suffix || '');
      while (num.scrollWidth > 0 && (() => { rg.selectNodeContents(num); return rg.getBoundingClientRect().width > 880; })() && fs > 80) { fs -= 6; num.style.fontSize = fs + 'px'; }
      return { cardEl, parts, num, d, meter, hero };
    },
    update(m, t, sc, tm, L) {
      const { drawStart: a, drawEnd: b } = tm, d = m.d;
      if (m.cardEl) Variation.enter(m.cardEl, clamp((t - sc.start) / .6), L.enter);
      m.parts.forEach((el, i) => Variation.enter(el, clamp((t - sc.start - .1 - i * .13) / .55), i === 0 ? 'pop' : L.enter === 'wipe' ? 'rise' : L.enter));
      const p = clamp((t - a) / (b - a)); let e = outCubic(p);
      if (L.count === 'tick') e = p >= 1 ? 1 : Math.floor(outCubic(p) * 14) / 14; else if (L.count === 'punch') e = 1 - Math.pow(2, -10 * p) * (1 - p);
      const v = (d.from || 0) + (d.value - (d.from || 0)) * e;
      m.num.textContent = (d.prefix || '') + fmt(v, d.decimals || 0) + (d.suffix || '');
      if (m.meter) { const f = clamp(v / d.meter.max); if (m.meter.kind === 'ring') m.meter.ring.setAttribute('stroke-dashoffset', m.meter.C * (1 - f)); else m.meter.style.width = f * 100 + '%'; }
      m.hero.style.transform += ` translateY(${Math.sin(t * 1.6) * 8}px)`;
      if (L.count === 'punch') { const q = clamp((t - b) / .35); m.num.style.transform += ` scale(${1 + .09 * Math.sin(q * Math.PI)})`; }
    }
  };
})();
