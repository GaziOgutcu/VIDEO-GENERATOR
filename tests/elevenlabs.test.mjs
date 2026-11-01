import test from 'node:test';
import assert from 'node:assert/strict';
import { elevenRequest, listVoices } from '../server/elevenlabs.mjs';

test('voice listing authenticates server-side and follows pagination', async () => {
  let calls = 0;
  const voices = await listVoices({ key: 'fixture-secret', fetcher: async (url, options) => {
    assert.equal(options.headers['xi-api-key'], 'fixture-secret');
    const query = new URL(url); assert.equal(query.pathname, '/v2/voices');
    if (++calls === 1) return Response.json({ voices: [{ voice_id: 'a', name: 'First' }], has_more: true, next_page_token: 'next' });
    assert.equal(query.searchParams.get('next_page_token'), 'next');
    return Response.json({ voices: [{ voice_id: 'b', name: 'Second' }], has_more: false });
  } });
  assert.deepEqual(voices, [{ id: 'a', name: 'First' }, { id: 'b', name: 'Second' }]);
  assert.equal(JSON.stringify(voices).includes('fixture-secret'), false);
});
test('missing and invalid keys have actionable errors without triggering panel authentication', async () => {
  await assert.rejects(listVoices({ key: '' }), error => error.statusCode === 503 && /Render/.test(error.message));
  await assert.rejects(listVoices({ key: 'fixture', fetcher: async () => Response.json({ detail: { status: 'invalid_api_key' } }, { status: 401 }) }), error => error.statusCode === 502 && /rejected/.test(error.message));
});
test('restricted ElevenLabs keys identify voice-read permission failures', async () => {
  await assert.rejects(listVoices({ key: 'fixture', fetcher: async () => Response.json({ detail: { status: 'missing_permissions' } }, { status: 401 }) }), /Voices: Read/);
});
test('upstream error bodies and network errors cannot expose keys', async () => {
  await assert.rejects(elevenRequest('/v2/voices', { key: 'fixture-private', fetcher: async () => { throw new Error('fixture-private'); } }), error => !error.message.includes('fixture-private'));
  await assert.rejects(elevenRequest('/v2/voices', { key: 'fixture-private', fetcher: async () => Response.json({ detail: { message: 'fixture-private' } }, { status: 500 }) }), error => !error.message.includes('fixture-private'));
});
