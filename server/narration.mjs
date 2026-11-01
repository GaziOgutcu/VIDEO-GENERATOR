import fs from 'node:fs/promises';
import path from 'node:path';
import { elevenRequest } from './elevenlabs.mjs';
import { charsToWords } from '../tools/words.mjs';
export async function narrate(text, voice, directory) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(voice || '')) throw new Error('Choose a valid voice.');
  const res = await elevenRequest(`/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: .45, similarity_boost: .85 } }),
    redirect: 'error', signal: AbortSignal.timeout(180000),
  });
  const data = await res.json();
  if (!data.audio_base64 || !data.alignment) throw new Error('Narration alignment was not returned.');
  const words = charsToWords(data.alignment);
  if (!words.length) throw new Error('Narration word timings are empty.');
  await fs.writeFile(path.join(directory, 'narration.mp3'), Buffer.from(data.audio_base64, 'base64'));
  return words;
}
