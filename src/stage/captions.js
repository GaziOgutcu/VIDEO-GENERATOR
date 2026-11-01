// Word-by-word captions (4 styles). Position and font are brand-locked; the highlight treatment varies.
window.Captions = (() => {
  const box = document.getElementById('captions'); const { clamp, outBack } = window.E;
  let chunks = [], cur = -1, spans = [], L = {};
  const MAX = 20;
  function build(words) {
    chunks = []; let c = [];
    const flush = () => { if (c.length) { chunks.push({ words: c, s: c[0].s, e: c[c.length - 1].e }); c = []; } };
    for (const w of words) {
      const len = c.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (c.length && len > MAX && !(/[.!?]$/.test(w.w) && len <= MAX + 9)) flush();
      c.push(w); if (/[.!?]$/.test(w.w) || (/[,;:]$/.test(w.w) && len >= 10)) flush();
    }
    flush(); chunks.forEach((k, i) => { const n = chunks[i + 1]; k.until = Math.min(n ? n.s : Infinity, k.e + .45); k.from = k.s - .05; });
  }
  function show(i) {
    cur = i; box.innerHTML = ''; spans = []; if (i < 0) return;
    const el = document.createElement('div'); el.className = 'cap cs-' + L.caption;
    for (const w of chunks[i].words) { const s = document.createElement('span'); s.textContent = w.w.replace(/[.,]$/, ''); el.appendChild(s); spans.push({ s, w }); }
    box.appendChild(el); let fs = 66; while (el.scrollWidth > 900 && fs > 40) { fs -= 2; el.style.fontSize = fs + 'px'; }
  }
  return {
    init(words, look) { L = look; build(words); show(-1); },
    update(t) {
      const i = chunks.findIndex(k => t >= k.from && t < k.until); if (i !== cur) show(i);
      for (const { s, w } of spans) {
        const age = t - w.s, on = age >= 0, active = on && t < w.e + .04, k = on ? outBack(clamp(age / .14)) : 0;
        s.style.opacity = on ? 1 : .22; s.style.transform = `scale(${.78 + .22 * k}) translateY(${(1 - k) * 10}px)`;
        s.style.color = '#fff'; s.style.background = 'none'; s.style.textDecoration = 'none'; s.style.padding = '0'; s.style.margin = '0';
        if (!active) continue;
        if (L.caption === 'pop' || L.caption === 'box') s.style.color = L.hl;
        else if (L.caption === 'bar') { s.style.background = L.hl; s.style.color = '#04101A'; s.style.padding = '0 14px'; s.style.margin = '0 -8px'; s.style.borderRadius = '16px'; }
        else if (L.caption === 'underline') { s.style.textDecoration = `underline ${L.hl} 8px`; s.style.textUnderlineOffset = '12px'; }
      }
    }
  };
})();
