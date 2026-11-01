// Template: flow — nodes connected by edges with coins flowing along them. layouts: chain | loop | hub
// data: { nodes:[{label,icon}], edges:[label,...] (optional), coin:'$' }
(() => {
  const NS = 'http://www.w3.org/2000/svg', { clamp, outCubic, outBack } = window.E;
  const S = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  window.TEMPLATES['flow'] = {
    layouts: ['chain', 'loop', 'hub'],
    mount(root, sc, theme, L) {
      const d = sc.data, N = d.nodes.length; let lay = L.layout; if (lay === 'loop' && N < 3) lay = 'chain'; if (lay === 'hub' && N < 4) lay = 'chain';
      const lk = window.getLook(), col = { a: L.accent, b: lk.accentB }, P = [];
      const svg = S('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;inset:0' }, root);
      const nodeW = lay === 'chain' ? 600 : 250, nodeH = lay === 'chain' ? 170 : 250;
      d.nodes.forEach((n, i) => {
        let x, y;
        if (lay === 'chain') { x = 540; const gap = N <= 3 ? 310 : 235; y = 640 + i * gap - (N === 2 ? -40 : 0); }
        else if (lay === 'loop') { const ang = (-90 + i * 360 / N) * Math.PI / 180; x = 540 + 320 * Math.cos(ang); y = 900 + 300 * Math.sin(ang); }
        else { if (i === 0) { x = 540; y = 940; } else { const ang = (-90 + (i - 1) * 360 / (N - 1)) * Math.PI / 180; x = 540 + 340 * Math.cos(ang); y = 940 + 300 * Math.sin(ang); } }
        P.push([x, y]);
      });
      const edges = [], ctr = [540, 900], add = (i, j, lab) => edges.push({ i, j, lab });
      if (lay === 'chain') for (let i = 0; i < N - 1; i++) add(i, i + 1, d.edges?.[i]);
      else if (lay === 'loop') for (let i = 0; i < N; i++) add(i, (i + 1) % N, d.edges?.[i]);
      else for (let i = 1; i < N; i++) add(0, i, d.edges?.[i - 1]);
      const pull = (A, B, r) => { const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1; return [dx / l * r, dy / l * r]; };
      edges.forEach(e => {
        const A = P[e.i], B = P[e.j], r = lay === 'chain' ? 98 : 150, ra = lay === 'hub' && e.i === 0 ? 150 : r;
        let [ox, oy] = pull(A, B, ra), [px, py] = pull(B, A, r); let dstr;
        const a = [A[0] + ox, A[1] + oy], b = [B[0] + px, B[1] + py];
        if (lay === 'loop') { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, c = [mx + (mx - ctr[0]) * .5, my + (my - ctr[1]) * .5]; dstr = `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`; }
        else dstr = `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
        e.path = S('path', { d: dstr, fill: 'none', stroke: L.accent, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': '1 1', pathLength: 1, 'stroke-dashoffset': 1, opacity: .9, style: `filter:drop-shadow(0 0 8px ${L.accent})` }, svg);
        e.len = e.path.getTotalLength(); e.head = S('path', { d: 'M-16 -14 L12 0 L-16 14 Z', fill: L.accent, opacity: 0 }, svg);
        const nc = Math.max(1, Math.min(5, Math.round(e.len / 110))); e.nc = nc;
        e.coins = Array.from({ length: nc }, () => { const g = S('g', { opacity: 0 }, svg); S('circle', { r: 18, fill: L.accent, style: `filter:drop-shadow(0 0 10px ${L.accent})` }, g); const tx = S('text', { 'text-anchor': 'middle', y: 8, 'font-size': 22, 'font-weight': 900, fill: '#04101A', 'font-family': 'Inter' }, g); tx.textContent = d.coin || '$'; return g; });
        if (e.lab) { const m = e.path.getPointAtLength(e.len / 2); e.pill = H('div', `position:absolute;left:${m.x}px;top:${m.y}px;transform:translate(-50%,-50%);padding:10px 22px;border-radius:999px;background:#04101A;border:3px solid ${L.accent};font-weight:900;font-size:28px;letter-spacing:.04em;white-space:nowrap;opacity:0;z-index:4`, root, e.lab.toUpperCase()); }
      });
      const nodes = d.nodes.map((n, i) => {
        const [x, y] = P[i], big = lay === 'hub' && i === 0;
        const el = window.card(root, L, `left:${x - nodeW / 2}px;top:${y - nodeH / 2}px;width:${nodeW}px;height:${nodeH}px`); el.classList.add('node'); el.style.zIndex = 3;
        el.style.flexDirection = lay === 'chain' ? 'row' : 'column'; el.style.justifyContent = 'center'; el.style.gap = lay === 'chain' ? '34px' : '8px'; el.style.padding = '0 26px'; if (big) el.style.setProperty('--accent', L.accent);
        const g = H('div', 'flex:none', el); g.appendChild(Glyph.el(n.icon || 'coin', L.glyphStyle, col, lay === 'chain' ? 128 : 124));
        H('div', `font-weight:900;font-size:${lay === 'chain' ? 46 : 33}px;line-height:1.05;text-align:${lay === 'chain' ? 'left' : 'center'};letter-spacing:-.01em`, el, n.label.toUpperCase());
        return el;
      });
      return { nodes, edges, N, lay };
    },
    update(m, t, sc, tm, L) {
      const t0 = sc.start + .25;
      m.nodes.forEach((el, i) => Variation.enter(el, clamp((t - t0 - i * .28) / .5), L.enter === 'wipe' ? 'pop' : L.enter));
      const te = t0 + m.N * .28 + .1;
      m.edges.forEach((e, i) => {
        const k = clamp((t - te - i * .22) / .55); e.path.setAttribute('stroke-dashoffset', 1 - outCubic(k));
        const end = e.path.getPointAtLength(e.len * outCubic(k)), bef = e.path.getPointAtLength(Math.max(0, e.len * outCubic(k) - 4));
        e.head.setAttribute('transform', `translate(${end.x} ${end.y}) rotate(${Math.atan2(end.y - bef.y, end.x - bef.x) * 180 / Math.PI})`); e.head.setAttribute('opacity', k > .02 ? 1 : 0);
        if (e.pill) { const pk = clamp((t - te - i * .22 - .25) / .3); e.pill.style.opacity = pk; e.pill.style.transform = `translate(-50%,-50%) scale(${.7 + .3 * outBack(pk)})`; }
        e.coins.forEach((c, j) => { const on = k >= 1; c.setAttribute('opacity', on ? 1 : 0); if (!on) return; const s = ((t - te) * .22 + j / e.nc + i * .11) % 1, pt = e.path.getPointAtLength(e.len * s); c.setAttribute('transform', `translate(${pt.x} ${pt.y})`); c.setAttribute('opacity', Math.min(1, s * 6, (1 - s) * 6)); });
      });
    }
  };
})();
