const $ = id => document.getElementById(id);
let scenes = [], selectedScene = 0, activeJob = null, polling = null, config;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'mfs-panel', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { if (response.status === 401 && url !== '/api/login') showLogin(); throw new Error(data.error || 'İstek tamamlanamadı.'); }
  return data;
}
function notice(text) { $('notice').textContent = text; $('notice').hidden = !text; }
function showLogin() { $('login').hidden = false; $('studio').hidden = true; clearInterval(polling); }
async function enter() {
  config = await api('/api/config'); $('logout').hidden = !config.authEnabled; $('login').hidden = true; $('studio').hidden = false;
  $('resolution').textContent = `${config.width} × ${Math.round(config.width * 16 / 9)}`;
  $('provider-status').textContent = `Pixabay: ${config.stock ? 'anahtar tanımlı' : 'anahtar gerekli'} · ElevenLabs: ${config.narration ? 'anahtar tanımlı' : 'anahtar gerekli'}`;
  if (config.defaultVoice) $('voice').add(new Option('Varsayılan ses', config.defaultVoice));
  await refreshJobs(); clearInterval(polling); polling = setInterval(() => refreshJobs().catch(error => notice(error.message)), 2500);
}
$('login-form').onsubmit = async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) }); $('password').value = ''; $('login-error').textContent = ''; await enter(); }
  catch (error) { $('login-error').textContent = error.message; } finally { button.disabled = false; }
};
$('logout').onclick = async () => { await api('/api/logout', { method: 'POST', body: '{}' }); showLogin(); };
$('script').oninput = () => { scenes = []; $('scene-section').hidden = true; $('char-count').textContent = `${$('script').value.length} / 6000`; };
$('plan').onclick = async () => {
  const button = $('plan'); button.disabled = true; notice('');
  try {
    const data = await api('/api/plan', { method: 'POST', body: JSON.stringify({ script: $('script').value }) });
    scenes = data.scenes; drawScenes(); $('scene-section').hidden = false; $('render').disabled = false;
    notice(`${scenes.length} sahne hazır. Metni değiştirdiysen sahneleri yeniden hazırlayabilirsin.`);
  } catch (error) { notice(error.message); } finally { button.disabled = false; }
};
function node(tag, text, className) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; }
function link(text, url) { const a = node('a', text); try { if (new URL(url).protocol === 'https:') a.href = url; } catch {} a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function drawScenes() {
  $('scenes').replaceChildren();
  scenes.forEach((scene, index) => {
    const card = node('article', null, 'scene-card'), heading = node('div', null, 'section-heading');
    heading.append(node('span', `SAHNE ${String(index + 1).padStart(2, '0')}`), node('span', scene.stockId ? 'STOK GÖRÜNTÜ' : scene.skipStock || !$('auto-stock').checked ? 'HAREKETLİ METİN' : 'OTOMATİK GÖRÜNTÜ')); card.append(heading);
    const titleLabel = node('label', 'Sahne başlığı'), title = node('input'); title.value = scene.title; title.maxLength = 100; title.oninput = () => { scene.title = title.value; }; titleLabel.append(title);
    const textLabel = node('label', 'Anlatım'), text = node('textarea'); text.value = scene.text; text.maxLength = 600; text.rows = 2; text.oninput = () => { scene.text = text.value; }; textLabel.append(text); card.append(titleLabel, textLabel);
    const media = node('div', null, 'scene-media');
    if (scene.selection) { const img = node('img'); img.src = scene.selection.thumbnail; img.alt = 'Seçilen stok görüntü'; media.append(img, link(`${scene.selection.author} / Pixabay ↗`, scene.selection.url)); }
    else media.append(node('span', scene.skipStock ? 'Markalı metin animasyonu' : 'Render sırasında otomatik seçilecek'));
    const search = node('button', scene.stockId ? 'Görüntüyü değiştir' : '+ Stok görüntü seç'); search.onclick = () => { selectedScene = index; $('stock-query').value = scene.query || ''; $('stock-results').replaceChildren(); $('stock-message').textContent = config.stock ? 'Bir konu ara ve sahnen için klip seç.' : 'Pixabay anahtarı henüz tanımlı değil. Sunucu ortam ayarlarına PIXABAY_API_KEY ekleyin.'; $('stock-dialog').showModal(); }; media.append(search);
    if (scene.stockId) { const remove = node('button', 'Kaldır', 'quiet'); remove.onclick = () => { scene.stockId = null; scene.selection = null; scene.skipStock = true; drawScenes(); }; media.append(remove); }
    card.append(media); $('scenes').append(card);
  });
}
$('close-stock').onclick = () => $('stock-dialog').close();
$('stock-form').onsubmit = async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; $('stock-message').textContent = 'Pixabay üzerinde aranıyor…'; $('stock-results').replaceChildren();
  try {
    const query = $('stock-query').value.trim(); scenes[selectedScene].query = query;
    const data = await api(`/api/stock?q=${encodeURIComponent(query)}`);
    $('stock-message').textContent = data.videos.length ? `${data.videos.length} görüntü bulundu. Klipler dikey kadraja kırpılır.` : 'Sonuç yok. Farklı bir arama dene.';
    for (const video of data.videos) {
      const card = node('article', null, 'stock-card'), img = node('img'); img.src = video.thumbnail; img.alt = `${video.author} tarafından stok görüntü`; img.loading = 'lazy';
      const choose = node('button', 'Bu görüntüyü seç →'); choose.onclick = () => { scenes[selectedScene].skipStock = false; scenes[selectedScene].stockId = video.id; scenes[selectedScene].selection = video; drawScenes(); $('stock-dialog').close(); };
      card.append(img, node('p', `${video.duration} sn · ${video.width} × ${video.height}`), link(`${video.author} / Pixabay ↗`, video.url), choose); $('stock-results').append(card);
    }
  } catch (error) { $('stock-message').textContent = error.message; } finally { button.disabled = false; }
};
$('narration').onchange = () => { $('voice-settings').hidden = $('narration').value !== 'true'; };
$('load-voices').onclick = async () => {
  $('load-voices').disabled = true;
  try { const data = await api('/api/voices'); $('voice').replaceChildren(new Option('Ses seç', '')); for (const voice of data.voices) $('voice').add(new Option(voice.name, voice.id)); if (config.defaultVoice) $('voice').value = config.defaultVoice; notice('Ses listesi güncellendi.'); }
  catch (error) { notice(error.message); } finally { $('load-voices').disabled = false; }
};
$('render').onclick = async () => {
  $('render').disabled = true; notice(''); $('downloads').hidden = true;
  try {
    if (!scenes.length) {
      const planned = await api('/api/plan', { method: 'POST', body: JSON.stringify({ script: $('script').value }) });
      scenes = planned.scenes; drawScenes(); $('scene-section').hidden = false;
    }
    const job = await api('/api/jobs', { method: 'POST', body: JSON.stringify({ title: $('title').value, scenes, autoStock: $('auto-stock').checked, seed: $('seed').value, narration: $('narration').value === 'true', voice: $('voice').value }) });
    activeJob = job.id; showJob(job); await refreshJobs(); notice('Video sıraya alındı. İlerlemeyi sağ taraftan takip edebilirsin.');
  } catch (error) { notice(error.message); } finally { $('render').disabled = false; }
};
function showJob(job) {
  $('job-status').textContent = `${job.title} · ${job.message}${job.status === 'rendering' ? ` · %${job.progress}` : ''}`;
  $('progress').hidden = ['done', 'failed'].includes(job.status); $('progress').value = job.progress;
  $('downloads').hidden = job.status !== 'done';
  if (job.status === 'done') {
    const url = `/media/${job.id}/video.mp4`;
    if ($('video').getAttribute('src') !== url) { $('video').src = url; $('video').load(); }
    $('video').hidden = false; $('placeholder').hidden = true;
    $('download').href = url; $('download').download = `${job.id}.mp4`; $('credits').href = `/media/${job.id}/credits.json`;
  } else { $('video').pause(); $('video').hidden = true; $('placeholder').hidden = false; }
}
async function refreshJobs() {
  const data = await api('/api/jobs'); $('jobs').replaceChildren();
  if (!data.jobs.length) $('jobs').append(node('p', 'Henüz video yok.', 'hint'));
  for (const job of data.jobs) {
    const item = node('button', null, 'job'); item.append(node('span', job.title), node('small', { queued: 'Sırada', preparing: 'Hazırlanıyor', rendering: `%${job.progress}`, done: 'Hazır ↗', failed: 'Hata' }[job.status] || job.status));
    item.onclick = () => { activeJob = job.id; showJob(job); }; $('jobs').append(item);
  }
  if (!activeJob && data.jobs.length) activeJob = data.jobs[0].id;
  const current = data.jobs.find(job => job.id === activeJob); if (current) showJob(current);
}
$('refresh').onclick = () => refreshJobs().catch(error => notice(error.message));
enter().catch(() => showLogin());

$('auto-stock').onchange = () => drawScenes();
