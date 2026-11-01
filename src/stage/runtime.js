// Deterministic runtime: window.seek(t) renders the exact frame at time t. Look (variation) is derived from project.seed.
window.TEMPLATES = {};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
window.E = { clamp, outCubic: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2) };
window.H = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
window.card = (parent, L, css) => { const e = H('div', `position:absolute;${css}`, parent); e.className = `card card-${L.card}`; return e; };
window.fmt = (v, dec = 0) => v.toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec });
let project, words, theme, look, mounted = [], OV = .4;

function resolveTime(spec) {
  if (typeof spec === 'number') return spec;
  const nz = s => s.replace(/[.,!?]$/, '').toLowerCase(); const w = words.filter(x => nz(x.w) === nz(spec.word))[spec.nth || 0];
  if (!w) throw new Error('Anchor word not found: ' + spec.word);
  return (spec.edge === 'end' ? w.e : w.s) + (spec.offset || 0);
}
window.getDuration = () => project.duration || (words.length ? words[words.length - 1].e : 0) + (project.tail ?? 1.5);
window.getLook = () => look;

window.init = async (p, w, th) => {
  project = p; words = w; theme = th;
  look = Variation.make(project.seed ?? project.title ?? 'mfs', project.look || {}, theme); OV = look.transition === 'cut' ? 0 : .4;
  const r = document.documentElement.style;
  r.setProperty('--bg0', look.bg0); r.setProperty('--accent', look.accent); r.setProperty('--hl', look.hl); r.setProperty('--muted', theme.muted);
  document.getElementById('captions').className = 'cs-' + look.caption;
  await document.fonts.load('900 64px Inter'); await document.fonts.load('800 30px Inter'); await document.fonts.ready;
  const dur = window.getDuration(), host = document.getElementById('scenes');
  project.scenes.forEach((sc, i) => { sc.start = i === 0 ? 0 : resolveTime(sc.at ?? 0); });
  let prevL;
  project.scenes.forEach((sc, i) => {
    const nx = project.scenes[i + 1]; sc.end = nx ? nx.start + OV : dur;
    const L = Variation.scene(look, i, sc.look, prevL); prevL = L; if (sc.accent) L.accent = sc.accent;
    const T = window.TEMPLATES[sc.template]; if (!T) throw new Error('Unknown template ' + sc.template);
    L.layout = sc.layout || L.layoutPick.pick(T.layouts || ['default']);
    sc.tm = {}; for (const k in (sc.timing || {})) sc.tm[k] = resolveTime(sc.timing[k]);
    sc.tm.drawStart ??= sc.start + .55; sc.tm.drawEnd ??= sc.tm.drawStart + 1.8;
    const root = H('div', `--accent:${L.accent}`, host); root.className = 'scene';
    const brand = H('div', '', root, `<i></i>${(project.brand || theme.name).toUpperCase()}`); brand.className = 'brand';
    if (look.titleStyle === 'left' || look.titleStyle === 'kicker') { brand.style.left = '90px'; brand.style.textAlign = 'left'; brand.style.width = '900px'; }
    const title = H('div', '', root); title.className = 'title ts-' + look.titleStyle;
    const span = H('span', '', title); span.textContent = sc.title || ''; const rule = H('div', '', root); rule.className = 'rule';
    let kick; if (look.titleStyle === 'kicker') { kick = H('div', '', root, sc.kicker || ''); kick.className = 'kicker'; }
    if (look.titleStyle === 'boxed') { span.style.background = L.accent; span.style.color = '#04101A'; }
    rule.style.background = L.accent; rule.style.boxShadow = `0 0 18px ${L.accent}`;
    const rg = document.createRange(); rg.selectNodeContents(span); let fs = 84; title.style.fontSize = fs + 'px';
    while (rg.getBoundingClientRect().width > (look.titleStyle === 'boxed' ? 820 : 900) && fs > 36) { fs -= 2; title.style.fontSize = fs + 'px'; }
    if (sc.source) { const f = H('div', '', root, 'SOURCE: ' + sc.source.toUpperCase()); f.className = 'foot'; }
    const inst = T.mount(root, sc, theme, L);
    mounted.push({ sc, root, title, rule, brand, kick, L, T, inst });
  });
  Captions.init(words, look); window.seek(0);
};

window.seek = t => {
  const dur = window.getDuration(), p = t / dur;
  Background.draw(t, look);
  const cam = document.getElementById('cam'), c = look.camera, s = look.tilt;
  cam.style.transform = c === 'push' ? `scale(${1 + .04 * p}) translateY(${-14 * p}px)` : c === 'drift' ? `scale(1.05) translateX(${s * (-24 + 48 * p)}px)` :
    c === 'tilt' ? `scale(${1.03 + .02 * p}) rotate(${s * (-.7 + 1.4 * p)}deg)` : 'none';
  mounted.forEach((m, i) => {
    const { sc, L } = m, vis = t >= sc.start && t <= sc.end; m.root.style.display = vis ? 'block' : 'none'; if (!vis) return;
    const fi = OV ? clamp((t - sc.start) / OV) : 1, fo = (OV && i < mounted.length - 1) ? clamp((sc.end - t) / OV) : 1, st = m.root.style;
    let op = 1, tr = 'none', cp = 'none', z = i;
    const tt = look.transition;
    if (fi < 1) { if (tt === 'fade') op = fi; else if (tt === 'slide') { op = fi; tr = `translateX(${(1 - fi) * 150}px)`; } else if (tt === 'zoom') { op = fi; tr = `scale(${1.12 - .12 * fi})`; } else if (tt === 'wipe') cp = `inset(0 ${(1 - fi) * 100}% 0 0)`; }
    else if (fo < 1) { if (tt === 'fade') op = fo; else if (tt === 'slide') { op = fo; tr = `translateX(${-(1 - fo) * 150}px)`; } else if (tt === 'zoom') { op = fo; tr = `scale(${.9 + .1 * fo})`; } else if (tt === 'wipe') op = fo > .02 ? 1 : 0; }
    st.opacity = op; st.transform = tr; st.clipPath = cp; st.zIndex = z;
    const k = clamp((t - sc.start) / .6), e = window.E.outCubic(k), ts = look.titleStyle;
    m.title.style.opacity = e; m.title.style.transform = (ts === 'boxed' ? `rotate(${-1.2 * look.tilt}deg) ` : '') + `translateY(${(1 - e) * 36}px)`;
    m.rule.style.width = (ts === 'center' ? 560 : 220) * window.E.outCubic(clamp((t - sc.start - .15) / .8)) + 'px';
    if (m.kick) m.kick.style.opacity = e;
    m.T.update(m.inst, t, sc, sc.tm, L);
  });
  Captions.update(t);
};

// Seek media before taking a screenshot; synchronous seek remains available to existing templates.
window.seekAsync = async t => {
  window.seek(t);
  for (const m of mounted) if (!(t >= m.sc.start && t <= m.sc.end)) m.T.release?.(m.inst);
  await Promise.all(mounted.filter(m => t >= m.sc.start && t <= m.sc.end && m.T.seek).map(m => m.T.seek(m.inst, t, m.sc)));
};
