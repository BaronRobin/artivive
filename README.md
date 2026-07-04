# PersonalAR

Self-hosted WebAR for my portfolio: point a phone camera at a physical artwork and a digital layer (video / image / 3D model / audio) plays on top of it, tracked in real time - in the mobile browser, no app install. Built on [MindAR.js](https://github.com/hiukim/mind-ar-js) (MIT) + Three.js.

**No view caps. No subscriptions. No third-party AR service.** The only limit is my own hosting bandwidth; there is deliberately no metering or gating logic anywhere in this codebase.

## How it works

- Each artwork is a folder in [`artworks/`](artworks/) - the single source of truth:
  ```
  artworks/<slug>/
  ├── trigger.png      # the physical artwork's image
  ├── targets.mind     # compiled MindAR tracking target
  ├── scene.json       # layers, transforms, timing (see src/shared/scene-schema.js)
  ├── qr.png           # generated QR code → viewer URL
  └── assets/          # overlay media (video/image/model/audio)
  ```
- The **viewer** (`/ar/<slug>/`) is a static page: camera permission → MindAR tracks the trigger → layers from `scene.json` render on the artwork.
- The **admin** (gallery, trigger compiler, layer editor) only exists on the local dev server. It writes into `artworks/` through a dev-only API and is never deployed.
- Coordinates: trigger-image width = 1 unit, origin at trigger center, +z toward the viewer.

## Daily workflow: add a new artwork

```bash
npm run dev          # local admin at https://localhost:5173/admin/
```

1. **Create** - Admin gallery → “+ New artwork”, pick a slug (`my-piece` → `/ar/my-piece/`).
2. **Compile** - drop the artwork’s photo/scan on the compiler page. Red dots = trackable features; they should cover the whole image. Few/clustered dots ⇒ the image will track badly (avoid flat colors, gradients, repetitive patterns).
   - CLI alternative (also batch): `npm run compile my-piece` or `npm run compile -- --force`
3. **Edit layers** - layer editor: add media files, drag gizmos (G/R/S = move/rotate/scale), set timing (delay, fades, duration, pause-vs-restart on tracking loss) in the inspector, **▶ Preview** to simulate a scan, then Save (⌘S).
4. **Publish** - commit + push to `main`. GitHub Actions builds and deploys. Print `artworks/<slug>/qr.png` next to the physical piece.

Local production check: `npm run build && npm run preview`.

## Viewer behavior

- Videos autoplay **muted** on detection (iOS requirement). If a video is unmuted in the editor or an audio layer exists, a “🔊 Enable sound” button appears - one tap unlocks all sound.
- Tracking lost: layers fade out and (per-layer setting) pause or reset; re-scanning resumes.
- Camera denied / unsupported browser: a fallback page shows the artwork and instructions.

## Deployment (GitHub Pages)

Deployed as a project site at `https://baronrobin.github.io/artivive/` (URL configured in [`personalar.config.json`](personalar.config.json) - QR codes and the Vite base path derive from it).

One-time setup: create the `artivive` repo → push → repo **Settings → Pages → Source: GitHub Actions**. Every push to `main` then deploys via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Moving host later = deploy `dist/` anywhere static (any host, own domain, object storage). Update `baseUrl`, rebuild, reprint QR codes. Artwork folders are portable - copy `artworks/<slug>/` and it moves with all its data.

## Testing on a phone during development

`npm run dev` listens on the LAN with a self-signed HTTPS cert (camera requires HTTPS). Open `https://<your-mac-ip>:5173/ar/demo/` on the phone and accept the certificate warning. If iOS refuses the cert, tunnel instead: `npx cloudflared tunnel --url https://localhost:5173 --no-tls-verify`.

Point the phone at `artworks/demo/trigger.png` opened fullscreen on your monitor (or printed).

## Practical limits

- Keep overlay videos ≲ 10-20 MB (phone memory + mobile data; H.264 MP4, `-movflags +faststart`).
- GitHub limits: 100 MB per file, ~1 GB repo. If a piece outgrows that, host its media on object storage and use absolute URLs in `scene.json` - the viewer resolves both.
- The demo overlay video is a Big Buck Bunny test clip ((c) Blender Foundation, CC-BY 3.0) - replace it with real work.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server + local admin (HTTPS, LAN-visible) |
| `npm run compile [slug…]` | Compile trigger image(s) → `.mind` (batch-capable, `--force` to redo) |
| `npm run build` | Validate → viewer pages → QR codes → static build in `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run placeholder` | Regenerate the demo trigger image |
