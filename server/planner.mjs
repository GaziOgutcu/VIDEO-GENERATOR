import { synthWords } from '../tools/words.mjs';

export function planScript(script) {
  if (typeof script !== 'string' || script.trim().length < 3 || script.length > 6000) throw new Error('Metin 3–6000 karakter olmalı.');
  const tokens = script.trim().split(/\s+/);
  const scenes = [];
  for (let i = 0; i < tokens.length;) {
    let end = Math.min(i + 20, tokens.length);
    for (let j = i + 5; j < end; j++) if (/[.!?]$/.test(tokens[j])) { end = j + 1; break; }
    const text = tokens.slice(i, end).join(' ');
    scenes.push({ title: tokens.slice(i, Math.min(i + 6, end)).join(' '), text, query: '', stockId: null });
    i = end;
  }
  if (scenes.length > 20) throw new Error('En fazla 20 sahne destekleniyor. Metni kısaltın.');
  return scenes;
}

export function validateScenes(scenes) {
  if (!Array.isArray(scenes) || !scenes.length || scenes.length > 20) throw new Error('1–20 sahne gerekli.');
  let length = 0;
  const result = scenes.map(sc => {
    if (!sc || typeof sc.title !== 'string' || typeof sc.text !== 'string' || !sc.text.trim() || sc.text.length > 600 || sc.title.length > 100) throw new Error('Sahne başlığı veya metni geçersiz.');
    length += sc.text.length;
    if (sc.stockId != null && !/^\d{1,16}$/.test(String(sc.stockId))) throw new Error('Stok kimliği geçersiz.');
    return { title: sc.title.trim(), text: sc.text.trim(), stockId: sc.stockId == null ? null : String(sc.stockId) };
  });
  if (length > 6000) throw new Error('Toplam metin 6000 karakteri aşamaz.');
  return result;
}

export function compileProject(scenes, { seed = 'mfs-panel', words, assets = {} } = {}) {
  const script = scenes.map(sc => sc.text).join(' ');
  words ??= synthWords(script);
  let wordIndex = 0;
  const project = { brand: 'Money From Scratch', seed, tail: 1.5, scenes: scenes.map(sc => {
    const at = words[wordIndex]?.s;
    if (at == null) throw new Error('Ses hizalaması sahne metniyle eşleşmiyor.');
    wordIndex += sc.text.split(/\s+/).length;
    return { template: 'story', title: sc.title, at, data: { text: sc.text, video: assets[sc.stockId] || null } };
  }) };
  return { project, words, script };
}
