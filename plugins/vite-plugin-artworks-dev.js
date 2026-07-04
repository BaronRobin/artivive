/**
 * Dev-only middleware. Gives the local admin/editor pages a filesystem API so
 * artworks/<slug>/ folders stay the single source of truth. Never part of the
 * production build - the deployed site is fully static.
 */
import { promises as fs } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ARTWORKS = path.join(ROOT, 'artworks');

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ASSET_EXTS = new Set(['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.glb', '.gltf', '.mp3', '.m4a', '.ogg', '.wav']);
const TRIGGER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, data, type = 'application/json') {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}

function safeName(name, allowedExts) {
  const base = path.basename(name || '');
  const ext = path.extname(base).toLowerCase();
  if (!base || base.startsWith('.') || !allowedExts.has(ext)) return null;
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function listArtworks() {
  if (!existsSync(ARTWORKS)) return [];
  const out = [];
  for (const d of await fs.readdir(ARTWORKS, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(ARTWORKS, d.name);
    let scene = null;
    try { scene = JSON.parse(await fs.readFile(path.join(dir, 'scene.json'), 'utf8')); } catch { /* not yet configured */ }
    out.push({
      slug: d.name,
      title: scene?.title ?? d.name,
      layers: scene?.layers?.length ?? 0,
      trigger: scene?.trigger?.image ?? null,
      hasMind: existsSync(path.join(dir, 'targets.mind')),
      hasQr: existsSync(path.join(dir, 'qr.png'))
    });
  }
  return out;
}

function defaultScene(slug, title) {
  return {
    version: 1,
    slug,
    title: title || slug,
    trigger: { image: null, mind: 'targets.mind', width: null, height: null },
    layers: []
  };
}

export default function artworksDev() {
  return {
    name: 'personalar-artworks-dev',
    apply: 'serve',
    configureServer(server) {
      // In dev, /ar/<slug>/ is rendered straight from the template - no
      // generation step needed while iterating.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/artworks-index.json' && req.method === 'GET') {
          return send(res, 200, await listArtworks());
        }
        const viewerMatch = url.pathname.match(/^\/ar\/([a-z0-9-]+)\/?$/);
        if (viewerMatch && req.method === 'GET') {
          const slug = viewerMatch[1];
          if (!existsSync(path.join(ARTWORKS, slug))) return next();
          let title = slug;
          try { title = JSON.parse(readFileSync(path.join(ARTWORKS, slug, 'scene.json'), 'utf8')).title || slug; } catch {}
          let html = readFileSync(path.join(ROOT, 'templates/viewer.html'), 'utf8')
            .replaceAll('__SLUG__', slug)
            .replaceAll('__TITLE__', title)
            .replaceAll('__BASE__', '/');
          html = await server.transformIndexHtml(`/ar/${slug}/index.html`, html);
          return send(res, 200, html, 'text/html');
        }

        if (!url.pathname.startsWith('/__admin/api/')) return next();

        try {
          // POST /__admin/api/artworks  {slug, title} - create artwork
          if (url.pathname === '/__admin/api/artworks' && req.method === 'POST') {
            const { slug, title } = JSON.parse((await readBody(req)).toString('utf8'));
            if (!SLUG_RE.test(slug || '')) return send(res, 400, { error: 'invalid slug (lowercase letters, digits, hyphens)' });
            const dir = path.join(ARTWORKS, slug);
            if (existsSync(dir)) return send(res, 409, { error: 'artwork already exists' });
            await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
            await fs.writeFile(path.join(dir, 'scene.json'), JSON.stringify(defaultScene(slug, title), null, 2));
            return send(res, 201, { ok: true, slug });
          }

          if (url.pathname === '/__admin/api/artworks' && req.method === 'GET') {
            return send(res, 200, await listArtworks());
          }

          const m = url.pathname.match(/^\/__admin\/api\/artworks\/([^/]+)(?:\/([a-z]+))?$/);
          if (!m) return send(res, 404, { error: 'not found' });
          const [, slug, action] = m;
          if (!SLUG_RE.test(slug)) return send(res, 400, { error: 'invalid slug' });
          const dir = path.join(ARTWORKS, slug);
          if (!existsSync(dir)) return send(res, 404, { error: 'unknown artwork' });

          if (!action && req.method === 'DELETE') {
            await fs.rm(dir, { recursive: true, force: true });
            return send(res, 200, { ok: true });
          }

          if (action === 'scene' && req.method === 'POST') {
            const scene = JSON.parse((await readBody(req)).toString('utf8'));
            if (scene.slug !== slug || !Array.isArray(scene.layers)) {
              return send(res, 400, { error: 'scene.slug mismatch or missing layers array' });
            }
            await fs.writeFile(path.join(dir, 'scene.json'), JSON.stringify(scene, null, 2));
            return send(res, 200, { ok: true });
          }

          if (action === 'mind' && req.method === 'POST') {
            await fs.writeFile(path.join(dir, 'targets.mind'), await readBody(req));
            return send(res, 200, { ok: true });
          }

          if (action === 'trigger' && req.method === 'POST') {
            const name = safeName(url.searchParams.get('name'), TRIGGER_EXTS);
            if (!name) return send(res, 400, { error: 'invalid trigger filename' });
            await fs.writeFile(path.join(dir, name), await readBody(req));
            return send(res, 200, { ok: true, name });
          }

          if (action === 'asset' && req.method === 'POST') {
            const name = safeName(url.searchParams.get('name'), ASSET_EXTS);
            if (!name) return send(res, 400, { error: 'invalid asset filename/extension' });
            await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
            await fs.writeFile(path.join(dir, 'assets', name), await readBody(req));
            return send(res, 200, { ok: true, path: `assets/${name}` });
          }

          return send(res, 404, { error: 'not found' });
        } catch (err) {
          return send(res, 500, { error: String(err?.message || err) });
        }
      });
    }
  };
}
