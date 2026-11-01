# Money From Scratch — Motion Engine v2

Deterministic (`seek(t)`) DOM/SVG/Canvas renderer. **Brand is locked, everything else varies per seed.**

## Web paneli: metinden videoya

Panel tek kullanıcı içindir. Parolayla giriş yapar; metni düzenlenebilir sahnelere
böler, sahne bazında Pixabay stok araması sunar, ElevenLabs ile seslendirir ve MP4
oluşturur. Stok seçilmeyen sahneler markalı hareketli metin olarak render edilir.
Sahne planlama kural tabanlıdır; metin yazmaz, finansal veri uydurmaz ve arama
kelimelerini otomatik tercüme etmez. Her sahnenin başlığını ve anlatımını düzenleyin.

```bash
npm ci
[ -f .env ] || cp .env.example .env
# .env içindeki PANEL_PASSWORD değerini benzersiz, 12+ karakterlik bir parolayla doldurun.
npm start
```

Tarayıcıda `http://127.0.0.1:3000` açın. Bu adres yalnız uygulamayı çalıştıran
makinede erişilir. GitHub repository sayfası uygulamayı çalıştırmaz.

1. Panel parolasıyla giriş yapın; başlık ve anlatım metnini girin.
2. **Sahneleri hazırla** ile sahneleri oluşturun ve başlıkları gözden geçirin.
3. İstediğiniz sahnede **Stok görüntü seç** ile Pixabay'te arayın (ör. `city`,
   `saving money`); klibi seçin. Görüntüler dikey kadraja kırpılır, kısa klipler
   tekrar edilir, stok klibin orijinal sesi kullanılmaz.
4. Sessiz demo veya ElevenLabs seslendirmesini seçin. **Sesleri getir** hesabın
   erişebildiği sesleri listeler; seslendirme kredi kullanır.
5. **Videoyu oluştur** düğmesine basın. Hazır olunca önizleyin ve MP4'ü indirin.
   **Kaynaklar** bağlantısı kliplerin Pixabay kimliğini, sahibini ve sayfasını içerir.

### Sağlayıcı ve sunucu ayarları

Mevcut `.env` dosyasını yeniden oluşturmayın veya `.env.example` ile değiştirmeyin.
Yalnız `PIXABAY_API_KEY=...` satırını ekleyin; mevcut `ELEVENLABS_API_KEY` ve
`ELEVENLABS_VOICE_ID` değerlerini koruyun. Ortam değişkenlerini değiştirdikten
sonra sunucuyu yeniden başlatın.

Anahtarları yalnız `.env` veya sunucunun güvenli ortam ayarlarına ekleyin.
Tarayıcıya anahtar gönderilmez. GitHub Actions secrets veya başka bir platforma
eklenen değerler bu çalışan uygulamaya kendiliğinden aktarılmaz.

| Değişken | Gereklilik |
| --- | --- |
| `PANEL_PASSWORD` | Panel için zorunlu, 12–256 karakter; API anahtarıyla aynı değer olmasın |
| `PIXABAY_API_KEY` | Stok arama ve indirme için gerekli; [Pixabay API](https://pixabay.com/api/docs/) üzerinden alınır |
| `ELEVENLABS_API_KEY` | İsteğe bağlı seslendirme için gerekli |
| `ELEVENLABS_VOICE_ID` | Varsayılan ses; panelden de ses seçilebilir |
| `HOST`, `PORT` | Varsayılan `127.0.0.1`, `3000` |
| `COOKIE_SECURE` | HTTPS dağıtımında `true`; yerel HTTP için `false` |
| `RENDER_WIDTH`, `RENDER_FPS` | `540` veya `1080`; `15` veya `30` (varsayılan 540/15) |

Ağ erişimi: `pixabay.com`, `cdn.pixabay.com` ve
`api.elevenlabs.io`. Diğer Pixabay medya alt alanlarına yönlenen bir klip hata
verirse o alanı doğrulayıp ağ ayarlarına ekleyin. HTTP yönlendirmeleri otomatik
takip edilmez; yalnız HTTPS Pixabay medya adresleri indirilir. Stok dosyaları
100 MB ile sınırlıdır. [Pixabay lisansını](https://pixabay.com/service/license-summary/) ve klibin
kullanım koşullarını yayınlamadan önce kontrol edin.

Panel Node.js **24.5+** kullanır; `npm start` yönetilen bulut ortamlarının
HTTP proxy ayarlarını Node'un yerleşik `--use-env-proxy` seçeneğiyle kullanır.
Parola yerel süreçte okunabilen bir ortam değişkeni olmalıdır; yalnız uzak HTTPS
isteklerine anahtar enjekte eden proxy bağlantısı panel parolası için uygun değildir.

### Barındırma

Bu uygulama Chromium ve FFmpeg çalıştırabilen, kalıcı diski olan bir Node.js
sunucusunda çalışır. GitHub Pages gibi yalnız statik dosya sunan hizmetler uygun
değildir. Uzak erişim için `HOST=0.0.0.0`, `PORT` ve `COOKIE_SECURE=true` ayarlayın;
önünde HTTPS ters proxy kullanın. İşlem yöneticisiyle `npm start` komutunu yeniden
başlatılabilir tutun. Anahtarları ve parolayı barındırma hizmetinin güvenli
ayarlarından verin. Bu değişiklik bir alan adına canlı dağıtım yapmaz.

Bir seferde bir render çalışır, en fazla beş iş sırada/çalışır durumda tutulur.
İşler `out/jobs/<id>/` altında saklanır; tamamlanan videolar yeniden başlatmadan
sonra görünür, yarım kalan işler hata olarak işaretlenir. Oturumlar yeniden giriş
gerektirir. Render başına 30 dakika sınırı vardır. Disk kullanımı için eski iş
klasörlerini uygulama duruyken temizleyin; `out/` klasörünü kullanıcı içeriği
olarak koruyun ve gerektiğinde yedekleyin.

### Testler

```bash
npm test
```

Testler Chromium ve FFmpeg gerektirir. Sahne zamanlaması, sağlayıcı yanıtlarının
ayrıştırılması, medya adresi doğrulaması ve tarayıcı üzerinden parola, stok seçimi,
gerçek MP4 renderı, HTTP Range indirme, oturum kapatma ve mobil taşma kontrolü
çalışır. Testlerde Pixabay yanıtı ve klibi yerel fixture ile sağlanır; canlı API
anahtarı veya ücretli ElevenLabs çağrısı kullanılmaz. Ekran görüntüleri
`out/panel-desktop.png` ve `out/panel-mobile.png` altında üretilir.

## Kurulum

Bu depo `mfs-motion-engine-v2.zip` içindeki v2 motorunu içerir. Node.js **24.5+**,
Chromium/Google Chrome ve `libx264` kodlayıcılı FFmpeg gerekir. Sürekli çalışan bir
web servisi veya veritabanı gerekmez. Komutları repository kökünde çalıştırın.

```bash
npm ci
# Debian / Ubuntu üzerinde tarayıcı ve video araçları yoksa:
sudo apt-get update
sudo apt-get install -y chromium ffmpeg
[ -f .env ] || cp .env.example .env
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
