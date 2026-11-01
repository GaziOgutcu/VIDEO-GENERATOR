# Money From Scratch — Video Studio

Turn a script into a vertical MP4 with branded motion graphics, automatically
selected Pixabay stock footage, optional ElevenLabs narration, and word captions.
The engine uses Playwright/Chromium to render frames and FFmpeg to encode H.264.

## Deploy on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/GaziOgutcu/VIDEO-GENERATOR)

1. Sign in to Render with GitHub and deploy the blueprint. Verify the **Free** plan.
2. Open the `https://…onrender.com` address assigned by Render.
3. Add your API keys in the service's **Environment** settings and redeploy.
4. For subsequent code updates, choose **Manual Deploy → Deploy latest commit**.

Public test mode is currently the default. Anyone with the URL can access videos,
create jobs and consume credits from connected providers. To restore login, set
`PANEL_AUTH_ENABLED=true` and a unique `PANEL_PASSWORD` containing 12–256 characters.
The blueprint generates a password, but it is unused while login is disabled.

The free service can sleep and has ephemeral disk storage. Download completed
videos; redeployments or instance replacement may delete them. Long or stock-heavy
renders may exceed free-tier CPU/memory limits. A short silent video was verified
in the deployment image under a 512 MB / 1 CPU limit. FFmpeg uses one encoding
thread to reduce memory use. GitHub Pages cannot run this backend.

## Use the studio

1. Paste your script and enter a title.
2. Leave **Automatically select Pixabay footage from the script** enabled.
3. Choose **Silent demo** or **ElevenLabs narration** and a voice.
4. Click **Create video**. Scene editing and manual clip selection are optional.
5. Preview the result, download the MP4, and inspect **Credits** for stock sources.

Automatic selection uses local keyword rules and Pixabay search. It does not
create AI images or guarantee semantic matching. It tries to avoid duplicate
clips. If search fails or has no results, scenes use motion text and the completion
message reports that fallback. Stock clips are cropped vertically, looped if short,
and used without original audio. Manually selected clips are preserved.

## Local setup

Requirements: Node.js **24.5+**, Chromium/Chrome, and FFmpeg with `libx264`.
Run all commands from the repository root. No database is required.

```bash
npm ci
# Debian/Ubuntu, if the system dependencies are missing:
sudo apt-get update
sudo apt-get install -y chromium ffmpeg
# Keep existing configuration; never overwrite your .env:
[ -f .env ] || cp .env.example .env
npm start
```

Open `http://127.0.0.1:3000` on the machine running the app. For remote hosting,
use `HOST=0.0.0.0`, an HTTPS reverse proxy and `COOKIE_SECURE=true`.

Keep existing ElevenLabs values. Add only missing settings to `.env` or your
hosting service's environment. Never put real keys in `.env.example` or GitHub.
The Docker build excludes `.env`, Git metadata, dependencies and generated videos.
GitHub Actions secrets are not automatically injected into a Render service.
Restart/redeploy after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | Optional narration and voice listing; server-side only |
| `ELEVENLABS_VOICE_ID` | Optional default voice; the panel can select or accept a voice ID |
| `ELEVENLABS_MODEL` | Default: `eleven_multilingual_v2` |
| `PIXABAY_API_KEY` | Stock search/download; obtain at https://pixabay.com/api/docs/ |
| `PANEL_AUTH_ENABLED` | Default false for temporary public testing |
| `PANEL_PASSWORD` | Required only when login is enabled; 12–256 characters |
| `HOST`, `PORT` | Defaults: `127.0.0.1`, `3000`; Render uses `0.0.0.0`, `10000` |
| `COOKIE_SECURE` | True behind HTTPS, false for local HTTP |
| `RENDER_WIDTH`, `RENDER_FPS` | Width 540/1080; fps 15/30; defaults 540/15 |
| `CHROME_PATH` | Optional explicit browser executable |
| `PLAYWRIGHT_BROWSERS_PATH` | Optional Playwright browser cache |

`playwright-core` does not install a browser. The renderer tries `CHROME_PATH`,
Playwright's browser cache, `/usr/bin/chromium`, and `/usr/bin/google-chrome`.
The Dockerfile installs Chromium and FFmpeg. It runs as an unprivileged user;
Chromium uses `--no-sandbox`, so run trusted projects in an isolated environment.

## ElevenLabs voices troubleshooting

Selecting **ElevenLabs narration** automatically loads voices from your account.
**Refresh voices** retries. Voice listing uses the paginated `/v2/voices` API.

- Missing key: add `ELEVENLABS_API_KEY` in **Render → Environment**, then redeploy.
- Rejected key: verify the key in that service's environment, not a GitHub file.
- Missing permissions: enable **Voices: Read** for listing and **Text to Speech**
  for narration on the ElevenLabs API key.
- Empty list: add a voice to your ElevenLabs account, then refresh.
- Restricted listing: enter an accessible voice ID directly; a configured
  `ELEVENLABS_VOICE_ID` is preserved even if it is absent from the returned list.
- Network errors: allow HTTPS access to `api.elevenlabs.io`.

Provider failures are shown inline in English and do not trigger studio login.
The “key configured” label reports presence only; it does not validate access.
Your key is never sent to the browser, included in credits or echoed in errors.
Voice listing is read-only; generating narration uses ElevenLabs credits.

## CLI rendering

Silent example with synthetic word timings:

```bash
npm run render -- --project examples/rates/project.json --words examples/rates/words.json --width 540 --fps 15 --out out/rates.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration out/rates.mp4
```

Other examples: `examples/mortgage` and `examples/dotcom`. Defaults: 1080 px, 30 fps.
Render a PNG:

```bash
npm run render -- --project examples/mortgage/project.json --words examples/mortgage/words.json --still 4.4 --seed demo --width 540 --out out/frame.png
```

Generate narration using your configured key and voice, then use its real timings:

```bash
npm run tts -- examples/mortgage/script.txt out/mortgage
npm run render -- --project examples/mortgage/project.json --words out/mortgage/words.json --audio out/mortgage/narration.mp3 --out out/mortgage.mp4
```

Npm scripts load optional `.env`. For direct Node commands use `node --env-file=.env`.
The CLI writes a `.look.json` sidecar and retains recent looks in `.looks-log.json`.
Use a fixed `--seed` and `--no-avoid` for a repeatable look. The renderer serves
local assets over temporary loopback HTTP and closes its server after completion.

## Operations and tests

One render runs at a time, with at most five active/queued jobs. Jobs, media,
credits and logs are stored in `out/jobs/<id>/`. On persistent storage, completed
jobs survive restarts; unfinished jobs become failed. Sessions require login again.
Each render has a 30-minute limit. Clean up old job directories while the app is
stopped, and back up user content if needed. `/healthz` is a public health check.

```bash
npm test
```

Tests exercise real Chromium and FFmpeg, desktop/mobile layout, login and public
mode, script planning, manual and automatic stock selection, rendering, MP4 Range
downloads, and voice-list error handling. Provider tests use fixtures; passing
them does not establish live Pixabay or ElevenLabs access. Test screenshots are
written to `out/panel-desktop.png` and `out/panel-mobile.png`.

Network hosts: `api.elevenlabs.io`, `pixabay.com`, `cdn.pixabay.com`. Pixabay results
are cached in memory for 24 hours, downloads are capped at 100 MB, and only HTTPS
Pixabay media hosts are accepted without redirects. Check the
[Pixabay license](https://pixabay.com/service/license-summary/) before publishing.

## Motion engine

Brand constants: Inter 800/900, Money From Scratch wordmark, dark background,
caption placement and safe zones. Seeded variation controls palettes, backgrounds,
transitions, title styles, cards and layouts.

Templates: `story` (text and optional video), `chart-step`, `big-number`, `compare`,
`flow`, `grid`. Templates expose `layouts`, `mount`, `update`, and optional async
`seek` for media. Register new templates in `src/stage/stage.html`.
Factual values in supplied examples must be verified before publication.
