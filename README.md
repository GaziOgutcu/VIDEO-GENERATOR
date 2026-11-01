# Money From Scratch — Motion Engine v2

Deterministic (`seek(t)`) DOM/SVG/Canvas renderer. **Brand is locked, everything else varies per seed.**

## Kurulum

Bu depo `mfs-motion-engine-v2.zip` içindeki v2 motorunu içerir. Node.js **22.9+**,
Chromium/Google Chrome ve `libx264` kodlayıcılı FFmpeg gerekir. Sürekli çalışan bir
web servisi veya veritabanı gerekmez. Komutları repository kökünde çalıştırın.

```bash
npm ci
# Debian / Ubuntu üzerinde tarayıcı ve video araçları yoksa:
sudo apt-get update
sudo apt-get install -y chromium ffmpeg
cp .env.example .env
```

`playwright-core` tarayıcıyı otomatik indirmez. Motor önce `CHROME_PATH`, sonra
Playwright tarayıcı dizini, ardından `/usr/bin/chromium` ve `/usr/bin/google-chrome`
yollarını dener. macOS/Windows veya farklı kurulumlarda `.env` içinde `CHROME_PATH`
ile tarayıcının tam yolunu belirtin. `ffmpeg` PATH üzerinde bulunmalıdır.

## Çalıştırma

API anahtarı gerektirmeyen, sessiz örnek render:

```bash
npm run render -- --project examples/rates/project.json --words examples/rates/words.json --width 540 --fps 15 --out out/rates.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration out/rates.mp4
```

Diğer örnekler için `rates` yerine `mortgage` veya `dotcom` kullanın. Örneklerdeki
`words.json` dosyaları yapay kelime zamanlamalarıdır; ses dosyası içermezler.
Üretim çözünürlüğü için `--width 1080 --fps 30` kullanın (varsayılanlar).
Tek kare PNG ve sabit görünüm:

```bash
npm run render -- --project examples/mortgage/project.json --words examples/mortgage/words.json --still 4.4 --seed demo --width 540 --out out/frame.png
```

`--seed` görünümü belirler. Video renderları son görünümleri `.looks-log.json`
içinde tutar ve tekrarları önler; tamamen tekrarlanabilir görünüm için aynı seed
ile `--no-avoid` kullanın. Seçilen görünüm videonun yanındaki `.look.json` dosyasına
yazılır. Çıktı klasörleri otomatik oluşturulur.

## Ortam değişkenleri ve seslendirme

`npm run render` ve `npm run tts`, varsa kökteki `.env` dosyasını okur; önceden
export edilen değerler önceliklidir. Doğrudan `node` çağırırken
`node --env-file=.env ...` kullanın.

| Değişken | Kullanım |
| --- | --- |
| `CHROME_PATH` | İsteğe bağlı Chromium/Chrome çalıştırılabilir dosyası |
| `PLAYWRIGHT_BROWSERS_PATH` | İsteğe bağlı Playwright tarayıcı önbelleği |
| `ELEVENLABS_API_KEY` | Yalnız TTS için gerekli gizli API anahtarı |
| `ELEVENLABS_VOICE_ID` | Yalnız TTS için gerekli, kullanım izniniz olan ses kimliği |
| `ELEVENLABS_MODEL` | TTS modeli; varsayılan `eleven_multilingual_v2` |

Gerçek anahtarı yalnız `.env` içine veya ortamın güvenli ayarlarına girin.
`.env.example` gerçek anahtar içermez. `.env`, bağımlılıklar, ses/video çıktıları
ve görünüm geçmişi `.gitignore` ile hariç tutulur. Anahtarları kaynak koduna yazmayın.

ElevenLabs erişimi (`api.elevenlabs.io`) ve uygun kredi gerektiren isteğe bağlı TTS:

```bash
npm run tts -- examples/mortgage/script.txt out/mortgage
npm run render -- --project examples/mortgage/project.json --words out/mortgage/words.json --audio out/mortgage/narration.mp3 --out out/mortgage.mp4
```

TTS hem `narration.mp3` hem gerçek hizalamaya dayalı `words.json` üretir. Gerçek
sesle render alırken bu kelime zamanlamalarını kullanın.

## Sorun giderme

- `Chromium not found`: Chromium kurun veya `CHROME_PATH` belirtin.
- `ffmpeg` bulunamıyorsa FFmpeg kurulumunu ve PATH değerini kontrol edin.
- Kısıtlı bulut yürütmesinde Chromium başlatma hatası oluşursa tarayıcı çalıştırma
  izni olan yürütme kullanın. Motor sahneyi geçici `127.0.0.1` HTTP sunucusundan
  yükler; `file://` erişimine ihtiyaç duymaz ve işlem bitince sunucuyu kapatır.
- Motor Chromium'u `--no-sandbox` ile başlatır; güvenilir proje ve varlıklarla,
  izole bir geliştirme ortamında kullanın.

## Doğrulama

Bu bulut ortamında Node.js 24.19.0 ile `npm ci` tekrar çalıştırıldı; `rates`,
`mortgage`, `dotcom` örneklerinin tamamı 540×960 / 15 fps H.264 MP4 olarak
üretildi ve FFprobe ile kontrol edildi (yaklaşık 11.33 / 17.27 / 13.27 saniye).
Tek kare PNG çıktısı da kontrol edildi. Gerçek ElevenLabs çağrısı, API anahtarı
bulunmadığı için çalıştırılmadı.

## What is locked (brand)
Inter 800/900, "MONEY FROM SCRATCH" wordmark on every scene, dark base, caption position/size, safe zones, all-caps labels.

## What varies (src/stage/variation.js)
**Per video (from `seed`)**: accent palette (6), dark tone (5), background (grid/dots/diagonal/aurora/blueprint/scan), caption highlight (pop/bar/underline/box),
camera (push/drift/tilt/static), scene transition (fade/slide/zoom/wipe/cut), title style (center/left/boxed/kicker).
**Per scene (never repeats the previous scene)**: card style (glass/outline/solid/neon/none), entrance (rise/pop/slide/drop/wipe/flip),
glyph style (line/duo/solid/iso/badge), chart style, count-up style, template layout.
Same seed = same look (reproducible). Change `seed` in project.json or pass `--seed`. Pin anything with `"look": {"accent":"cyan","bg":"blueprint",...}`.

## Templates (src/stage/templates)
chart-step (real data series) · big-number (meter ring/bar, glyph or PNG hero) · compare (bars-v / bars-h / versus) · flow (chain / loop / hub) · grid (tiles / rows)
Add one: create `templates/<name>.js` exposing `layouts`, `mount`, `update`, register it in stage.html, use `"template"` in project.json.

## Assets
Glyphs are procedural (18 icons x 5 styles). For richer art put a transparent PNG in `data.asset: {"src": "path.png"}` (big-number hero slot today).
Factual numbers must come from data/sources; keep the `source` line on every data scene.
