// Template: grid — 2-6 labelled glyph tiles. layouts: grid | rows
// data: { items:[{label,icon}] }
(() => {
  const { clamp } = window.E;
  window.TEMPLATES['grid'] = {
    layouts: ['grid', 'rows'],
    mount(root, sc, theme, L) {
      const d = sc.data, N = d.items.length, lay = L.layout, lk = window.getLook(), col = { a: L.accent, b: lk.accentB };
      const tiles = d.items.map((it, i) => {
        let css, el;
        if (lay === 'grid') { const cw = 430, ch = 330, rows = Math.ceil(N / 2), x = 90 + (i % 2) * (cw + 40), y = 520 + Math.floor(i / 2) * (ch + 36) + (rows === 1 ? 140 : 0);
          el = window.card(root, L, `left:${x}px;top:${y}px;width:${cw}px;height:${ch}px`); el.classList.add('node'); el.style.flexDirection = 'column'; el.style.justifyContent = 'center'; el.style.gap = '14px';
          H('div', '', el).appendChild(Glyph.el(it.icon || 'coin', L.glyphStyle, col, 150)); H('div', 'font-weight:900;font-size:42px;text-align:center;letter-spacing:-.01em;padding:0 16px', el, it.label.toUpperCase()); }
        else { const rh = Math.min(170, 780 / N), y = 520 + i * (rh + 16);
          el = window.card(root, L, `left:90px;top:${y}px;width:900px;height:${rh}px`); el.classList.add('node'); el.style.gap = '30px'; el.style.padding = '0 34px';
          H('div', `flex:none;font-weight:900;font-size:64px;color:${L.accent};width:70px;opacity:.9`, el, String(i + 1).padStart(2, '0'));
          H('div', 'flex:none', el).appendChild(Glyph.el(it.icon || 'coin', L.glyphStyle, col, Math.min(100, rh - 30))); H('div', 'font-weight:900;font-size:48px;letter-spacing:-.01em', el, it.label.toUpperCase()); }
        return el;
      });
      return { tiles };
    },
    update(m, t, sc, tm, L) { m.tiles.forEach((el, i) => Variation.enter(el, clamp((t - sc.start - .2 - i * .22) / .55), L.layout === 'rows' && L.enter === 'wipe' ? 'wipe' : L.enter)); }
  };
})();
