// Procedural finance glyphs rendered in 5 styles (line, duo, solid, iso, badge). Shapes live on a 64x64 grid.
window.Glyph = (() => {
  const NS = 'http://www.w3.org/2000/svg'; let uid = 0;
  const S = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const G = {
    bank: [['p', 'M8 24 L32 8 L56 24 Z', 'f'], ['r', 13, 28, 8, 22, 1, 'f'], ['r', 28, 28, 8, 22, 1, 'f'], ['r', 43, 28, 8, 22, 1, 'f'], ['r', 8, 52, 48, 6, 2, 'f']],
    coin: [['c', 32, 32, 24, 'f'], ['c', 32, 32, 17, 's'], ['p', 'M32 17 V47', 's'], ['p', 'M40 25 Q32 18 24 25 Q25 32 32 32 Q40 33 40 40 Q32 47 24 40', 's']],
    house: [['p', 'M6 30 L32 9 L58 30 Z', 'f'], ['r', 13, 30, 38, 25, 2, 'f'], ['r', 27, 38, 10, 17, 1, 's']],
    barsup: [['r', 9, 38, 11, 18, 2, 'f'], ['r', 26, 28, 11, 28, 2, 'f'], ['r', 43, 14, 11, 42, 2, 'f'], ['p', 'M8 28 L22 18 L34 22 L54 6', 's']],
    barsdown: [['r', 9, 14, 11, 42, 2, 'f'], ['r', 26, 28, 11, 28, 2, 'f'], ['r', 43, 40, 11, 16, 2, 'f'], ['p', 'M8 8 L24 20 L36 16 L56 34', 's']],
    shield: [['p', 'M32 6 L54 14 V32 C54 46 44 54 32 58 C20 54 10 46 10 32 V14 Z', 'f'], ['p', 'M22 32 L30 40 L44 24', 's']],
    bolt: [['p', 'M37 4 L14 36 H28 L24 60 L50 26 H34 Z', 'f']],
    cart: [['p', 'M14 18 H56 L49 40 H21 Z', 'f'], ['p', 'M4 8 H12 L21 40', 's'], ['c', 25, 52, 5, 'f'], ['c', 46, 52, 5, 'f']],
    chip: [['r', 16, 16, 32, 32, 5, 'f'], ['r', 26, 26, 12, 12, 2, 's'], ['r', 22, 7, 4, 9, 1, 'f'], ['r', 30, 7, 4, 9, 1, 'f'], ['r', 38, 7, 4, 9, 1, 'f'], ['r', 22, 48, 4, 9, 1, 'f'], ['r', 30, 48, 4, 9, 1, 'f'], ['r', 38, 48, 4, 9, 1, 'f']],
    globe: [['c', 32, 32, 25, 'f'], ['p', 'M32 7 C20 20 20 44 32 57 C44 44 44 20 32 7', 's'], ['p', 'M7 32 H57', 's'], ['p', 'M12 19 H52', 's'], ['p', 'M12 45 H52', 's']],
    clock: [['c', 32, 32, 25, 'f'], ['p', 'M32 17 V32 L43 39', 's']],
    lock: [['r', 14, 28, 36, 28, 5, 'f'], ['p', 'M22 28 V21 A10 10 0 0 1 42 21 V28', 's'], ['c', 32, 41, 4, 's']],
    flame: [['p', 'M32 5 C34 18 48 24 48 40 C48 52 40 58 32 58 C24 58 16 52 16 40 C16 32 22 28 24 20 C28 24 28 28 30 28 C34 22 30 14 32 5 Z', 'f'], ['p', 'M32 38 C36 43 40 45 36 50 C32 54 26 50 28 45 C30 43 32 41 32 38 Z', 's']],
    scale: [['p', 'M32 8 V54', 's'], ['r', 20, 54, 24, 5, 2, 'f'], ['p', 'M10 17 H54', 's'], ['p', 'M10 17 L3 34 H17 Z', 'f'], ['p', 'M54 17 L47 34 H61 Z', 'f']],
    rocket: [['p', 'M32 4 C42 12 46 24 44 38 H20 C18 24 22 12 32 4 Z', 'f'], ['c', 32, 24, 5, 's'], ['p', 'M20 30 L9 45 L22 42 Z', 'f'], ['p', 'M44 30 L55 45 L42 42 Z', 'f'], ['p', 'M26 42 L32 59 L38 42 Z', 'f']],
    percent: [['c', 19, 19, 9, 'f'], ['c', 45, 45, 9, 'f'], ['p', 'M49 11 L15 53', 's']],
    magnifier: [['c', 27, 27, 19, 'f'], ['p', 'M41 41 L57 57', 's']],
    pie: [['c', 32, 32, 25, 'f'], ['p', 'M32 32 V7 A25 25 0 0 1 57 32 Z', 's']],
  };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = i => Math.round(((n >> i) & 255) * f).toString(16).padStart(2, '0'); return '#' + c(16) + c(8) + c(0); };
  const mk = (sh, a, p) => { const t = sh[0]; let e; if (t === 'p') e = S('path', { d: sh[1] }); else if (t === 'r') e = S('rect', { x: sh[1], y: sh[2], width: sh[3], height: sh[4], rx: sh[5] }); else e = S('circle', { cx: sh[1], cy: sh[2], r: sh[3] }); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  const role = sh => sh[sh.length - 1];
  function draw(g, name, style, c, id) {
    const shapes = G[name] || G.coin, ln = { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    if (style === 'line') shapes.forEach(sh => mk(sh, { fill: 'none', stroke: c.a, 'stroke-width': 3.6, ...ln }, g));
    else if (style === 'duo') shapes.forEach(sh => role(sh) === 'f' ? mk(sh, { fill: c.a, 'fill-opacity': .2, stroke: c.a, 'stroke-width': 3.2, ...ln }, g) : mk(sh, { fill: 'none', stroke: c.b, 'stroke-width': 3.2, ...ln }, g));
    else if (style === 'solid') shapes.forEach(sh => role(sh) === 'f' ? mk(sh, { fill: `url(#${id})`, stroke: 'none' }, g) : mk(sh, { fill: 'none', stroke: '#04101A', 'stroke-width': 3.6, ...ln }, g));
    else if (style === 'iso') {
      for (let i = 9; i >= 1; i--) { const gg = S('g', { transform: `translate(${i * .85} ${i * .85})` }, g); shapes.forEach(sh => role(sh) === 'f' && mk(sh, { fill: shade(c.a, .22 + .02 * (9 - i)), stroke: 'none' }, gg)); }
      shapes.forEach(sh => role(sh) === 'f' ? mk(sh, { fill: `url(#${id})` }, g) : mk(sh, { fill: 'none', stroke: '#04101A', 'stroke-width': 3.4, ...ln }, g));
    }
  }
  function el(name, style, c, px) {
    const svg = S('svg', { viewBox: '-8 -8 80 80', width: px, height: px, style: 'overflow:visible' }), id = 'gg' + (uid++);
    const d = S('defs', {}, svg), lg = S('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, d);
    S('stop', { offset: '0%', 'stop-color': c.b }, lg); S('stop', { offset: '100%', 'stop-color': c.a }, lg);
    if (style === 'badge') {
      const bg = S('linearGradient', { id: id + 'b', x1: 0, y1: 0, x2: 1, y2: 1 }, d); S('stop', { offset: '0%', 'stop-color': c.a }, bg); S('stop', { offset: '100%', 'stop-color': shade(c.a, .45) }, bg);
      S('rect', { x: -6, y: -6, width: 76, height: 76, rx: 22, fill: `url(#${id}b)` }, svg); S('rect', { x: -6, y: -6, width: 76, height: 38, rx: 22, fill: '#fff', 'fill-opacity': .12 }, svg);
      const g = S('g', { transform: 'translate(14 14) scale(.58)' }, svg); draw(g, name, 'line', { a: '#04101A', b: '#04101A' }, id);
    } else { const g = S('g', {}, svg); draw(g, name, style, c, id); if (style === 'line' || style === 'duo') svg.style.filter = `drop-shadow(0 0 8px ${c.a}99)`; }
    return svg;
  }
  return { el, names: Object.keys(G) };
})();
