// Template: chart-step — a real data series (step function) drawn on a glass card.
// data: { label, sub, source, unit, range:[from,to], yRange:[min,max], xLabels:[{date,label}], points:[[date,value],...], rampDays }
(() => {
  const NS = 'http://www.w3.org/2000/svg', DAY = 864e5, { clamp, outCubic, outBack } = window.E;
  const S = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  window.TEMPLATES['chart-step'] = {
    layouts: ['default'],
    mount(root, sc, theme, L) {
      const d = sc.data, acc = L.accent, day = s => Date.parse(s + 'T00:00:00Z') / DAY;
      const d0 = day(d.range[0]), d1 = day(d.range[1]), [ymin, ymax] = d.yRange;
      const W = 900, H = 800, PL = 130, PR = 845, PT = 230, PB = 670;
      const X = k => PL + (PR - PL) * (k - d0) / (d1 - d0), Y = v => PB - (PB - PT) * (v - ymin) / (ymax - ymin);
      const ramp = d.rampDays ?? 9;
      let prev = d.points[0][1]; const pts = [[d0, prev]], steps = [];
      for (const [ds, v] of d.points.slice(1)) { const k = day(ds); pts.push([k, prev], [k + ramp, v]); steps.push({ k, v, label: ds }); prev = v; }
      pts.push([d1, prev]);
      const valueAt = k => { for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return b === a ? vb : va + (vb - va) * (k - a) / (b - a); } return pts[pts.length - 1][1]; };

      const card = window.card(root, L, 'left:90px;top:500px;width:900px;height:800px');
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, card);
      const defs = S('defs', {}, svg);
      const grad = S('linearGradient', { id: 'ag', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      S('stop', { offset: '0%', 'stop-color': acc, 'stop-opacity': .38 }, grad); S('stop', { offset: '100%', 'stop-color': acc, 'stop-opacity': 0 }, grad);
      const glow = S('filter', { id: 'glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
      S('feGaussianBlur', { stdDeviation: 9, result: 'b' }, glow); const mg = S('feMerge', {}, glow); S('feMergeNode', { in: 'b' }, mg); S('feMergeNode', { in: 'SourceGraphic' }, mg);
      const clip = S('clipPath', { id: 'reveal' }, defs); const clipRect = S('rect', { x: PL - 12, y: 0, width: 0, height: H }, clip);

      const T = (x, y, txt, a = {}, p = svg) => { const e = S('text', { x, y, 'font-family': 'Inter', ...a }, p); e.textContent = txt; return e; };
      T(48, 78, (d.label || '').toUpperCase(), { 'font-size': 30, 'font-weight': 800, fill: '#9FB1C0', 'letter-spacing': 1.8 });
      T(48, 114, (d.sub || '').toUpperCase(), { 'font-size': 20, 'font-weight': 800, fill: '#5E7385', 'letter-spacing': 1.6 });
      const counter = T(852, 118, '', { 'font-size': 104, 'font-weight': 900, fill: '#fff', 'text-anchor': 'end', 'letter-spacing': -3, style: 'font-feature-settings:"tnum"' });

      for (let v = ymin; v <= ymax + 1e-9; v += d.yStep ?? 1) {
        S('line', { x1: PL, x2: PR, y1: Y(v), y2: Y(v), stroke: v === ymin ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)', 'stroke-width': 2 }, svg);
        T(PL - 22, Y(v) + 9, v + (d.unit || ''), { 'font-size': 26, 'font-weight': 800, fill: '#6F8497', 'text-anchor': 'end' });
      }
      for (const xl of d.xLabels || []) T(X(day(xl.date)), PB + 52, xl.label, { 'font-size': 24, 'font-weight': 800, fill: '#6F8497', 'text-anchor': 'middle' });

      const line = pts.map(([k, v], i) => (i ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
      const ghost = S('path', { d: line, fill: 'none', stroke: acc, 'stroke-width': 6, opacity: L.chartStyle === 'ghost' ? .14 : 0, 'stroke-linejoin': 'round' }, svg);
      const area = S('path', { d: line + ` L${X(d1)} ${PB} L${X(d0)} ${PB} Z`, fill: 'url(#ag)', 'clip-path': 'url(#reveal)', opacity: L.chartStyle === 'line' ? 0 : 1 }, svg);
      const stroke = S('path', { d: line, fill: 'none', stroke: acc, 'stroke-width': 8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', filter: 'url(#glow)', 'clip-path': 'url(#reveal)' }, svg);
      const rings = steps.map(s => S('circle', { cx: X(s.k + ramp), cy: Y(s.v), r: 10, fill: 'none', stroke: acc, 'stroke-width': 4, opacity: 0 }, svg));
      const head = S('g', {}, svg); S('circle', { r: 26, fill: acc, opacity: .22 }, head); S('circle', { r: 12, fill: '#fff', stroke: acc, 'stroke-width': 5 }, head);

      const last = steps[steps.length - 1], px = X(last.k + ramp), py = Y(last.v);
      const call = S('g', { opacity: 0 }, svg);
      S('line', { x1: 0, y1: 0, x2: -52, y2: -52, stroke: acc, 'stroke-width': 3, 'stroke-dasharray': '6 7', opacity: .8 }, call);
      S('rect', { x: -420, y: -118, width: 372, height: 68, rx: 20, fill: 'rgba(6,12,19,.92)', stroke: acc, 'stroke-width': 3 }, call);
      const mon = new Date(last.k * DAY).toLocaleString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
      T(-234, -71, `${last.v.toFixed(2)}${d.unit || ''} · ${mon}`, { 'font-size': 30, 'font-weight': 900, fill: '#fff', 'text-anchor': 'middle' }, call);
      T(48, 774, d.source ? 'SOURCE: ' + d.source.toUpperCase() : '', { 'font-size': 18, 'font-weight': 800, fill: '#4E6173', 'letter-spacing': 1.2 });

      const prog = p => { const e = p * p * (3 - 2 * p); return .35 * e + .65 * p; };
      return { card, clipRect, head, counter, rings, steps, call, d0, d1, X, Y, valueAt, prog, px, py, unit: d.unit || '', stepT: null, PL, area, stroke };
    },
    update(m, t, sc, tm, L) {
      const { drawStart: a, drawEnd: b } = tm;
      Variation.enter(m.card, clamp((t - sc.start) / .7), L.enter);
      const p = clamp((t - a) / (b - a)), hd = m.d0 + (m.d1 - m.d0) * m.prog(p);
      if (!m.stepT) m.stepT = m.steps.map(s => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; (m.d0 + (m.d1 - m.d0) * m.prog(mid) < s.k + 9) ? lo = mid : hi = mid; } return a + hi * (b - a); });
      m.clipRect.setAttribute('width', Math.max(0, m.X(hd) - m.PL + 14));
      const v = m.valueAt(hd);
      m.head.setAttribute('transform', `translate(${m.X(hd)} ${m.Y(v)})`); m.head.setAttribute('opacity', t >= a ? 1 : 0);
      m.counter.textContent = v.toFixed(2) + m.unit;
      m.rings.forEach((r, i) => { const age = t - m.stepT[i], on = age > 0 && age < .7;
        r.setAttribute('opacity', on ? .9 * (1 - age / .7) : 0); r.setAttribute('r', on ? 12 + 56 * outCubic(age / .7) : 12); });
      const ct = m.stepT[m.stepT.length - 1] + .2, k = outBack(clamp((t - ct) / .5));
      m.call.setAttribute('opacity', clamp((t - ct) / .2)); m.call.setAttribute('transform', `translate(${m.px} ${m.py}) scale(${k})`);
    }
  };
})();
