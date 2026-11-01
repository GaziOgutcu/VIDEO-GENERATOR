export class ElevenLabsError extends Error {
  constructor(message, statusCode = 502) { super(message); this.statusCode = statusCode; }
}
export async function elevenRequest(route, { key = process.env.ELEVENLABS_API_KEY, fetcher = fetch, ...options } = {}) {
  if (!key?.trim()) throw new ElevenLabsError('ElevenLabs API key is missing on this server. Add ELEVENLABS_API_KEY in Render → Environment, then redeploy.', 503);
  let response;
  try {
    response = await fetcher(`https://api.elevenlabs.io${route}`, { ...options, headers: { ...options.headers, 'xi-api-key': key.trim() }, redirect: 'error', signal: options.signal || AbortSignal.timeout(20000) });
  } catch { throw new ElevenLabsError('Could not reach ElevenLabs. Check server network access and try again.'); }
  if (response.ok) return response;
  let code;
  try { code = (await response.json())?.detail?.status; } catch {}
  if (code === 'missing_permissions' || response.status === 403) throw new ElevenLabsError('ElevenLabs denied access. Enable Voices: Read to list voices and Text to Speech access to create narration on this API key.');
  if (response.status === 401) throw new ElevenLabsError('ElevenLabs rejected the API key. Check ELEVENLABS_API_KEY in Render Environment and redeploy. This is not a panel login error.');
  if (response.status === 429) throw new ElevenLabsError('ElevenLabs rate limit reached. Wait briefly, then retry.');
  if (response.status === 402 || code === 'quota_exceeded') throw new ElevenLabsError('ElevenLabs credits are exhausted. Check your account balance.');
  throw new ElevenLabsError(`ElevenLabs request failed (HTTP ${response.status}). Check your account and voice access.`);
}
export async function listVoices(options = {}) {
  const voices = new Map(); let token;
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ page_size: '100' }); if (token) query.set('next_page_token', token);
    const response = await elevenRequest(`/v2/voices?${query}`, options);
    let data;
    try { data = await response.json(); } catch { throw new ElevenLabsError('ElevenLabs returned an unreadable voice list. Please retry.'); }
    if (!Array.isArray(data.voices)) throw new ElevenLabsError('ElevenLabs returned an unexpected voice list.');
    for (const voice of data.voices) if (voice.voice_id && voice.name) voices.set(voice.voice_id, { id: voice.voice_id, name: voice.name });
    if (!data.has_more) return [...voices.values()];
    if (!data.next_page_token || data.next_page_token === token) throw new ElevenLabsError('ElevenLabs voice pagination failed. Retry or enter a voice ID directly.');
    token = data.next_page_token;
  }
  throw new ElevenLabsError('Too many voices to list. Enter a voice ID directly.');
}
