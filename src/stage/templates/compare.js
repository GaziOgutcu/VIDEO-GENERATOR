// Template: compare — 2-4 values side by side. layouts: bars-v | bars-h | versus (2 items only).
// data: { items:[{label,value,icon,tone:'bad'|'good'}], prefix, suffix, decimals }
(() => {
  const { clamp, outCubic } = window.E;
  window.TEMPLATES['compare'] = {
    layouts: ['bars-v', 'bars-h', 'versus'],
    mount(root, sc, theme, L) {
      const d = sc.data, N = d.items.length; let lay = L.layout; if (lay === 'versus' && N !== 2) lay = 'bars-v';
      const lk = window.getLook(), max = Math.max(...d.items.map(i => i.value)), els = [];
      const colOf = it => it.tone === 'bad' ? { a: lk.danger, b: '#FFAAB2' } : it.tone === 'good' ? { a: '#39FF14', b: '#BCFFA3' } : { a: L.accent, b: lk.accentB };
      const wrap = H('div', 'position:absolute;inset:0', root);
      const f = v => (d.prefix || '') + fmt(v, d.decimals || 0) + (d.suffix || '');
      d.items.forEach((it, i) => {
        const c = colOf(it), o = { it, c, i, max };
        if (lay === 'bars-v') {
          const slot = 860 / N, bw = Math.min(190, slot * .62), cx = 110 + slot * (i + .5), base = 1150, H0 = 540;
          o.root = H('div', `position:absolute;left:${cx - slot / 2}px;top:0;width:${slot}px;height:1920px`, wrap);
          o.bar = H('div', `position:absolute;left:${(slot - bw) / 2}px;bottom:${1920 - base}px;width:${bw}px;height:0;border-radius:20px 20px 6px 6px;background:linear-gradient(180deg,${c.b},${c.a});box-shadow:0 0 40px ${c.a}66`, o.root);
          o.val = H('div', `position:absolute;left:0;width:${slot}px;text-align:center;font-weight:900;font-size:${N > 3 ? 54 : 66}px;letter-spacing:-.03em;font-feature-settings:"tnum"`, o.root);
          const g = H('div', `position:absolute;left:${slot / 2 - 48}px;top:${base + 24}px`, o.root); g.appendChild(Glyph.el(it.icon || 'coin', L.glyphStyle, c, 96));
          H('div', `position:absolute;left:0;width:${slot}px;top:${base + 140}px;text-align:center;font-weight:900;font-size:34px;letter-spacing:.02em;color:#C9D6E0`, o.root, it.label.toUpperCase());
          o.layout = () => 0; o.H0 = H0; o.base = base;
          H('div', `position:absolute;left:110px;width:860px;top:${base}px;height:3px;background:rgba(255,255,255,.2)`, wrap);
        } else if (lay === 'bars-h') {
          const step = Math.min(240, 760 / N), y = 540 + i * step; o.root = H('div', `position:absolute;left:90px;top:${y}px;width:900px;height:${step}px`, wrap);
          const g = H('div', 'position:absolute;left:0;top:0', o.root); g.appendChild(Glyph.el(it.icon || 'coin', L.glyphStyle, c, 84));
          H('div', 'position:absolute;left:110px;top:16px;font-weight:900;font-size:42px;letter-spacing:-.01em', o.root, it.label.toUpperCase());
          o.val = H('div', 'position:absolute;right:0;top:4px;font-weight:900;font-size:64px;letter-spacing:-.03em;font-feature-settings:"tnum"', o.root);
          const tr = H('div', 'position:absolute;left:0;top:104px;width:900px;height:44px;border-radius:22px;background:rgba(255,255,255,.09);overflow:hidden', o.root);
          o.bar = H('div', `height:100%;width:0;border-radius:22px;background:linear-gradient(90deg,${c.a},${c.b});box-shadow:0 0 30px ${c.a}`, tr);
        } else {
          const w = 440, x = i ? 570 : 70, win = it.value === max;
          o.root = window.card(wrap, L, `left:${x}px;top:${win ? 520 : 570}px;width:${w}px;height:${win ? 700 : 600}px`); o.root.style.setProperty('--accent', c.a);
          const g = H('div', `position:absolute;left:${w / 2 - 90}px;top:40px`, o.root); g.appendChild(Glyph.el(it.icon || 'coin', L.glyphStyle, c, 180));
          o.val = H('div', `position:absolute;left:0;width:${w}px;top:290px;text-align:center;font-weight:900;font-size:${win ? 120 : 100}px;letter-spacing:-.04em;font-feature-settings:"tnum";color:${c.a};text-shadow:0 0 40px ${c.a}55`, o.root);
          H('div', `position:absolute;left:20px;width:${w - 40}px;top:${win ? 470 : 430}px;text-align:center;font-weight:900;font-size:40px;line-height:1.1`, o.root, it.label.toUpperCase());
        }
        els.push(o);
      });
      if (lay === 'versus') { const vs = H('div', `position:absolute;left:${540 - 62}px;top:${860 - 62}px;width:124px;height:124px;border-radius:50%;background:#04101A;border:4px solid ${L.accent};box-shadow:0 0 40px ${L.accent}88;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:48px;z-index:5`, wrap, 'VS'); els.vs = vs; }
      return { els, lay, f, wrap };
    },
    update(m, t, sc, tm, L) {
      const { drawStart: a } = tm;
      m.els.forEach((o, i) => {
        const k = clamp((t - a - .22 * i) / 1.0), e = outCubic(k), v = o.it.value * e;
        if (m.lay === 'bars-v') { o.bar.style.height = o.H0 * (o.it.value / o.max) * e + 'px'; o.val.style.top = (o.base - o.H0 * (o.it.value / o.max) * e - 86) + 'px'; o.val.textContent = m.f(v); Variation.enter(o.root, clamp((t - sc.start - .1 - i * .1) / .5), 'rise'); o.root.style.transform = 'none'; }
        else if (m.lay === 'bars-h') { o.bar.style.width = 100 * (o.it.value / o.max) * e + '%'; o.val.textContent = m.f(v); Variation.enter(o.root, clamp((t - sc.start - .1 - i * .12) / .5), L.enter === 'wipe' ? 'rise' : L.enter); }
        else { o.val.textContent = m.f(v); Variation.enter(o.root, clamp((t - sc.start - .1 - i * .18) / .6), i ? 'slideR' : 'slideL'); }
      });
      if (m.els.vs) { const k = clamp((t - sc.start - .55) / .4); m.els.vs.style.opacity = k; m.els.vs.style.transform = `scale(${.5 + .5 * window.E.outBack(k)})`; }
    }
  };
})();
