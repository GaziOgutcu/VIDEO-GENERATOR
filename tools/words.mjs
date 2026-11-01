// Helpers shared by the TTS tool and the demo generator.
// charsToWords: ElevenLabs alignment {characters, character_start_times_seconds, character_end_times_seconds} -> [{w,s,e}]
export function charsToWords(al) {
  const ch = al.characters, st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  const out = []; let w = '', s = 0, e = 0;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) { if (w) out.push({ w, s: +s.toFixed(3), e: +e.toFixed(3) }); w = ''; continue; }
    if (!w) s = st[i]; w += ch[i]; e = en[i];
  }
  if (w) out.push({ w, s: +s.toFixed(3), e: +e.toFixed(3) });
  return out;
}
// synthWords: rough timing model for demos WITHOUT audio. Real projects use the TTS alignment instead.
export function synthWords(text, lead = .5) {
  let t = lead; const out = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const dur = /\d/.test(w) ? .62 : .12 + .062 * w.replace(/[^\w]/g, '').length;
    out.push({ w, s: +t.toFixed(3), e: +(t + dur).toFixed(3) });
    t += dur + (/[.!?]$/.test(w) ? .38 : /[,;:]$/.test(w) ? .18 : .04);
  }
  return out;
}
