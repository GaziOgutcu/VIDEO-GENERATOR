// Usage: ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=<your clone id> node tools/tts-elevenlabs.mjs script.txt out-dir
// Writes out-dir/narration.mp3 and out-dir/words.json (word timings from ElevenLabs character alignment).
import fs from 'node:fs'; import path from 'node:path'; import { charsToWords } from './words.mjs';
const [scriptPath, outDir = '.'] = process.argv.slice(2);
const key = process.env.ELEVENLABS_API_KEY, voice = process.env.ELEVENLABS_VOICE_ID;
if (!scriptPath || !key || !voice) { console.error('Need: script file, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID'); process.exit(1); }
const text = fs.readFileSync(scriptPath, 'utf8').replace(/\s*\n+\s*/g, ' ').trim();
const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, model_id: model, voice_settings: { stability: .45, similarity_boost: .85, style: .25, use_speaker_boost: true } })
});
if (!res.ok) { console.error(res.status, await res.text()); process.exit(1); }
const j = await res.json(); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'narration.mp3'), Buffer.from(j.audio_base64, 'base64'));
const words = charsToWords(j.alignment);   // original text alignment, so captions match the script exactly
fs.writeFileSync(path.join(outDir, 'words.json'), JSON.stringify(words, null, 1));
console.log(`OK: ${words.length} words, ${words.at(-1).e.toFixed(2)}s`);
