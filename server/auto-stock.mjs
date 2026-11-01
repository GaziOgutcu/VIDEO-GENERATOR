// Keyword extraction is local and rule based; no language-model credentials required.
const topics = [
  [/interest|inflation|central bank|faiz|enflasyon/i, 'finance economy'],
  [/mortgage|housing|house|konut|ev kredisi/i, 'house real estate'],
  [/saving|savings|budget|tasarruf|birikim|bütçe/i, 'saving money'],
  [/stock market|invest|borsa|yatırım/i, 'stock market'],
  [/business|company|startup|şirket|işletme/i, 'business office'],
  [/money|dollar|cash|para|dolar/i, 'money finance'],
  [/technology|artificial intelligence|yapay zeka|teknoloji/i, 'technology computer'],
];
const stop = new Set('the a an this that these those is are was were be been being to of in on at for from with and or but so if as by it its your you we our they their he she his her will can could would should have has had do does not more most less very when how what why into about through every each one small matter ve bir bu şu için ile daha gibi olan olarak çok her nasıl neden'.split(' '));
export function stockQueries(text) {
  const topic = topics.find(([pattern]) => pattern.test(text))?.[1];
  const words = text.toLowerCase().match(/[\p{L}]{3,}/gu) || [];
  const unique = [...new Set(words.filter(w => !stop.has(w)))];
  return [...new Set([topic, unique.slice(0, 3).join(' '), unique[0]].filter(Boolean))].slice(0, 2);
}
export async function selectAutomaticStock(scenes, stock, progress = async () => {}) {
  const used = new Set(scenes.filter(s => s.stockId).map(s => String(s.stockId)));
  const warnings = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]; if (scene.stockId || scene.skipStock) continue;
    await progress(i + 1, scenes.length);
    try {
      let picked;
      for (const query of stockQueries(scene.text)) {
        const videos = await stock.search(query);
        const sorted = [...videos].sort((a, b) => Math.abs(a.width / a.height - 9 / 16) - Math.abs(b.width / b.height - 9 / 16));
        picked = sorted.find(v => !used.has(String(v.id))) || sorted[0];
        if (picked) { scene.query = query; break; }
      }
      if (picked) { scene.stockId = String(picked.id); used.add(scene.stockId); }
      else warnings.push(`Scene ${i + 1}: no stock match found; motion text was used.`);
    } catch (error) {
      warnings.push(`Automatic footage search stopped: ${error.message} Scenes without selected clips will use motion text.`);
      break;
    }
  }
  return warnings;
}
