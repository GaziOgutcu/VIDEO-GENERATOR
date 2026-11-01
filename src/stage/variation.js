// Variation engine. BRAND is locked (font, wordmark, safe zones, dark base). Everything in POOLS varies per seed.
window.Variation = (() => {
  const hash = s => { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return h >>> 0; };
  const rng = seed => { let a = hash(String(seed)); const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    r.pick = arr => arr[Math.floor(r() * arr.length)]; r.pickNot = (arr, not) => r.pick(arr.length > 1 ? arr.filter(x => x !== not) : arr); return r; };
  const POOLS = {
    accent: [{ n: 'cyan', a: '#36C9F6', b: '#9BEAFF' }, { n: 'neon', a: '#39FF14', b: '#BCFFA3' }, { n: 'gold', a: '#E7B85A', b: '#FFE09E' },
      { n: 'coral', a: '#FF5D6C', b: '#FFAAB2' }, { n: 'mint', a: '#2EE6B8', b: '#A6FFE8' }, { n: 'violet', a: '#9D7BFF', b: '#D3C7FF' }],
    tone: [{ bg0: '#04080E', bg1: '#10202F' }, { bg0: '#050A09', bg1: '#112822' }, { bg0: '#09060F', bg1: '#241639' }, { bg0: '#0A0807', bg1: '#2B1E14' }, { bg0: '#060710', bg1: '#18204A' }],
    bg: ['grid', 'dots', 'diagonal', 'aurora', 'blueprint', 'scan'],
    caption: ['pop', 'bar', 'underline', 'box'],
    camera: ['push', 'drift', 'tilt', 'static'],
    transition: ['fade', 'slide', 'zoom', 'wipe', 'cut'],
    titleStyle: ['center', 'left', 'boxed', 'kicker'],
    card: ['glass', 'outline', 'solid', 'neon', 'none'],
    enter: ['rise', 'pop', 'slideL', 'slideR', 'drop', 'wipe', 'flip'],
    glyphStyle: ['line', 'duo', 'solid', 'iso', 'badge'],
    chartStyle: ['area', 'line', 'ghost'],
    count: ['ease', 'tick', 'punch'],
  };
  const find = (list, v) => list.find(x => x.n === v || x.a === v);
  function make(seed, ov = {}, theme = {}) {
    const r = rng(seed + '|video'), av = ov.avoid || [];
    const fresh = (pool, key, n, get = x => x) => { const used = new Set(av.slice(-n).map(a => a[key])); const f = pool.filter(x => !used.has(get(x))); return f.length ? f : pool; };
    const apool = theme.accentPool ? POOLS.accent.filter(x => theme.accentPool.includes(x.n)) : POOLS.accent;
    const ac = (ov.accent && find(POOLS.accent, ov.accent)) || r.pick(fresh(apool, 'accentName', 2, x => x.n));
    const pair = r.pick(POOLS.accent.filter(x => x !== ac));
    const toneIdx = ov.tone !== undefined ? ov.tone : r.pick(fresh(POOLS.tone.map((_, i) => i), 'toneIdx', 1)), tone = POOLS.tone[toneIdx];
    const hl = ac.n === 'gold' ? POOLS.accent[0] : POOLS.accent[2];
    return { seed, accentName: ac.n, accent: ac.a, accentB: ac.b, pair: pair.a, pairB: pair.b, danger: '#FF5D6C', ...tone, toneIdx, hl: hl.a,
      bgStyle: ov.bg || r.pick(fresh(POOLS.bg, 'bgStyle', 2)), caption: ov.caption || r.pick(fresh(POOLS.caption, 'caption', 1)), camera: ov.camera || r.pick(fresh(POOLS.camera, 'camera', 1)),
      transition: ov.transition || r.pick(fresh(POOLS.transition, 'transition', 1)), titleStyle: ov.titleStyle || r.pick(fresh(POOLS.titleStyle, 'titleStyle', 1)), dust: r() > .35, tilt: r() > .5 ? 1 : -1 };
  }
  function scene(look, idx, ov = {}, prev) {
    const r = rng(look.seed + '|scene' + idx);
    return { card: ov.card || r.pickNot(POOLS.card, prev?.card), enter: ov.enter || r.pickNot(POOLS.enter, prev?.enter), glyphStyle: ov.glyphStyle || r.pickNot(POOLS.glyphStyle, prev?.glyphStyle),
      chartStyle: ov.chartStyle || r.pick(POOLS.chartStyle), count: ov.count || r.pick(POOLS.count), layoutPick: r, accent: ov.accent || look.accent };
  }
  const E = () => window.E;
  function enter(el, k, kind) {            // k: 0..1 linear time; sets opacity/transform/clip on el
    const { outCubic, outBack } = E(); const e = outCubic(k), b = outBack(k); let tr = '', cp = 'none', op = Math.min(1, k * 2.2);
    if (kind === 'rise') tr = `translateY(${(1 - e) * 80}px)`;
    else if (kind === 'pop') tr = `scale(${.78 + .22 * b})`;
    else if (kind === 'slideL') tr = `translateX(${-(1 - e) * 170}px)`;
    else if (kind === 'slideR') tr = `translateX(${(1 - e) * 170}px)`;
    else if (kind === 'drop') tr = `translateY(${-(1 - b) * 110}px) rotate(${-(1 - e) * 3}deg)`;
    else if (kind === 'flip') tr = `perspective(900px) rotateX(${(1 - e) * 62}deg)`;
    else if (kind === 'wipe') { cp = `inset(0 ${(1 - e) * 100}% 0 0 round 30px)`; op = k > 0 ? 1 : 0; }
    el.style.opacity = k <= 0 ? 0 : op; el.style.transform = tr || 'none'; el.style.clipPath = cp;
  }
  return { rng, make, scene, enter, POOLS };
})();
