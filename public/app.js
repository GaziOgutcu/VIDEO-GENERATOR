const $ = id => document.getElementById(id);
let scenes = [], selectedScene = 0, activeJob = null, polling = null, config;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'mfs-panel', ...options.headers } });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Server unavailable (HTTP ${response.status}). It may be restarting or overloaded. Job progress could not be refreshed.`); }
  if (!response.ok) { if (response.status === 401 && url !== '/api/login') showLogin(); throw new Error(data.error || 'Request failed.'); }
  return data;
}
function connectionFailed(error) { notice(error.message); $('job-status').textContent = 'Connection lost. Current job status is unknown. Retrying…'; $('progress').hidden = true; }
function notice(text) { $('notice').textContent = text; $('notice').hidden = !text; }
function showLogin() { $('login').hidden = false; $('studio').hidden = true; clearInterval(polling); }
async function enter() {
  config = await api('/api/config'); $('logout').hidden = !config.authEnabled; $('login').hidden = true; $('studio').hidden = false;
  $('resolution').textContent = `${config.width} × ${Math.round(config.width * 16 / 9)}`;
  $('provider-status').textContent = `Pixabay: ${config.stock ? 'key configured' : 'key required'} · ElevenLabs: ${config.narration ? 'key configured' : 'key required'}`;
  if (config.defaultVoice) { $('voice').add(new Option('Configured default voice', config.defaultVoice)); $('voice').value = config.defaultVoice; }
  await refreshJobs(); clearInterval(polling); polling = setInterval(() => refreshJobs().catch(connectionFailed), 2500);
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
    notice(`${scenes.length} scenes ready. Edit them if needed, or create your video now.`);
  } catch (error) { notice(error.message); } finally { button.disabled = false; }
};
function node(tag, text, className) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; }
function link(text, url) { const a = node('a', text); try { if (new URL(url).protocol === 'https:') a.href = url; } catch {} a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function drawScenes() {
  $('scenes').replaceChildren();
  scenes.forEach((scene, index) => {
    const card = node('article', null, 'scene-card'), heading = node('div', null, 'section-heading');
    heading.append(node('span', `SCENE ${String(index + 1).padStart(2, '0')}`), node('span', scene.stockId ? 'STOCK FOOTAGE' : scene.skipStock || !$('auto-stock').checked ? 'MOTION TEXT' : 'AUTOMATIC FOOTAGE')); card.append(heading);
    const titleLabel = node('label', 'Scene title'), title = node('input'); title.value = scene.title; title.maxLength = 100; title.oninput = () => { scene.title = title.value; }; titleLabel.append(title);
    const textLabel = node('label', 'Narration'), text = node('textarea'); text.value = scene.text; text.maxLength = 600; text.rows = 2; text.oninput = () => { scene.text = text.value; }; textLabel.append(text); card.append(titleLabel, textLabel);
    const media = node('div', null, 'scene-media');
    if (scene.selection) { const img = node('img'); img.src = scene.selection.thumbnail; img.alt = 'Selected stock footage'; media.append(img, link(`${scene.selection.author} / Pixabay ↗`, scene.selection.url)); }
    else media.append(node('span', scene.skipStock ? 'Branded text animation' : 'Automatically selected during rendering'));
    const search = node('button', scene.stockId ? 'Replace footage' : '+ Choose footage'); search.onclick = () => { selectedScene = index; $('stock-query').value = scene.query || ''; $('stock-results').replaceChildren(); $('stock-message').textContent = config.stock ? 'Search a topic and choose a clip for this scene.' : 'Pixabay key is missing. Add PIXABAY_API_KEY in your server environment settings.'; $('stock-dialog').showModal(); }; media.append(search);
    if (scene.stockId) { const remove = node('button', 'Remove', 'quiet'); remove.onclick = () => { scene.stockId = null; scene.selection = null; scene.skipStock = true; drawScenes(); }; media.append(remove); }
    card.append(media); $('scenes').append(card);
  });
}
$('close-stock').onclick = () => $('stock-dialog').close();
$('stock-form').onsubmit = async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; $('stock-message').textContent = 'Searching Pixabay…'; $('stock-results').replaceChildren();
  try {
    const query = $('stock-query').value.trim(); scenes[selectedScene].query = query;
    const data = await api(`/api/stock?q=${encodeURIComponent(query)}`);
    $('stock-message').textContent = data.videos.length ? `${data.videos.length} clips found. Footage is cropped to a vertical frame.` : 'No results. Try another search.';
    for (const video of data.videos) {
      const card = node('article', null, 'stock-card'), img = node('img'); img.src = video.thumbnail; img.alt = `${video.author} stock footage`; img.loading = 'lazy';
      const choose = node('button', 'Use this clip →'); choose.onclick = () => { scenes[selectedScene].skipStock = false; scenes[selectedScene].stockId = video.id; scenes[selectedScene].selection = video; drawScenes(); $('stock-dialog').close(); };
      card.append(img, node('p', `${video.duration} sec · ${video.width} × ${video.height}`), link(`${video.author} / Pixabay ↗`, video.url), choose); $('stock-results').append(card);
    }
  } catch (error) { $('stock-message').textContent = error.message; } finally { button.disabled = false; }
};
$('narration').onchange = () => {
  const enabled = $('narration').value === 'true'; $('voice-settings').hidden = !enabled;
  if (enabled) void loadVoices();
};
async function loadVoices() {
  if ($('load-voices').disabled) return;
  $('load-voices').disabled = true; $('voice-message').textContent = 'Loading your ElevenLabs voices…';
  const selected = $('voice').value || config.defaultVoice;
  try {
    const data = await api('/api/voices');
    $('voice').replaceChildren(new Option('Choose a voice', ''));
    for (const voice of data.voices) $('voice').add(new Option(voice.name, voice.id));
    if (selected && !data.voices.some(v => v.id === selected)) $('voice').add(new Option('Configured voice ID', selected));
    if (selected) $('voice').value = selected;
    $('voice-message').textContent = data.voices.length ? `${data.voices.length} voices loaded from ElevenLabs.` : 'ElevenLabs returned no voices. Add a voice to your account, or enter a voice ID.';
  } catch (error) { $('voice-message').textContent = error.message; }
  finally { $('load-voices').disabled = false; }
}
$('load-voices').onclick = loadVoices;

$('render').onclick = async () => {
  $('render').disabled = true; notice(''); $('downloads').hidden = true;
  try {
    if (!scenes.length) {
      const planned = await api('/api/plan', { method: 'POST', body: JSON.stringify({ script: $('script').value }) });
      scenes = planned.scenes; drawScenes(); $('scene-section').hidden = false;
    }
    const job = await api('/api/jobs', { method: 'POST', body: JSON.stringify({ title: $('title').value, scenes, autoStock: $('auto-stock').checked, seed: $('seed').value, narration: $('narration').value === 'true', voice: $('voice-id').value.trim() || $('voice').value }) });
    activeJob = job.id; showJob(job); await refreshJobs(); notice('Video queued. Follow its progress in the preview panel.');
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
  if (!data.jobs.length) $('jobs').append(node('p', 'No videos yet.', 'hint'));
  for (const job of data.jobs) {
    const item = node('button', null, 'job'); item.append(node('span', job.title), node('small', { queued: 'Queued', preparing: 'Preparing', rendering: `%${job.progress}`, done: 'Ready ↗', failed: 'Failed' }[job.status] || job.status));
    item.onclick = () => { activeJob = job.id; showJob(job); }; $('jobs').append(item);
  }
  if (!activeJob && data.jobs.length) activeJob = data.jobs[0].id;
  const current = data.jobs.find(job => job.id === activeJob); if (current) showJob(current);
}
$('refresh').onclick = () => refreshJobs().catch(connectionFailed);
enter().catch(() => showLogin());

$('auto-stock').onchange = () => drawScenes();
