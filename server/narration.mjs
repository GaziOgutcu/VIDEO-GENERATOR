import fs from 'node:fs/promises';
import path from 'node:path';
import { charsToWords } from '../tools/words.mjs';
export async function narrate(text, voice, directory) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Sunucuda ELEVENLABS_API_KEY eksik.');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(voice || '')) throw new Error('Geçerli bir ses seçin.');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: .45, similarity_boost: .85 } }),
    redirect: 'error', signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`Seslendirme başarısız (${res.status}). ElevenLabs anahtarını, ses erişimini ve kotayı kontrol edin.`);
  const data = await res.json();
  if (!data.audio_base64 || !data.alignment) throw new Error('Seslendirme hizalaması alınamadı.');
  const words = charsToWords(data.alignment);
  if (!words.length) throw new Error('Seslendirme kelime zamanlamaları boş.');
  await fs.writeFile(path.join(directory, 'narration.mp3'), Buffer.from(data.audio_base64, 'base64'));
  return words;
}
