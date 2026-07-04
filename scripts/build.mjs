/**
 * Publish pipeline: validate artworks → generate viewer pages + QR codes →
 * vite build → copy artwork data into dist/. Output: dist/ ready for any
 * static host. There is deliberately no view counting or gating anywhere.
 */
import { readFile, writeFile, readdir, cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { generatePages } from './generate-pages.mjs';
import { generateQRCodes } from './generate-qr.mjs';

const config = JSON.parse(await readFile('personalar.config.json', 'utf8'));
const basePath = new URL(config.baseUrl).pathname.replace(/\/?$/, '/');

// 1. Validate: every artwork needs a compiled target.
const index = [];
for (const d of await readdir('artworks', { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const dir = path.join('artworks', d.name);
  if (!existsSync(path.join(dir, 'scene.json'))) continue;
  const scene = JSON.parse(await readFile(path.join(dir, 'scene.json'), 'utf8'));
  if (!existsSync(path.join(dir, scene.trigger?.mind || 'targets.mind'))) {
    console.error(`✗ ${d.name}: missing targets.mind - compile it first:\n    npm run compile ${d.name}\n  (or use the admin compiler page in dev)`);
    process.exit(1);
  }
  index.push({ slug: d.name, title: scene.title || d.name, trigger: scene.trigger?.image || null });
}
if (!index.length) { console.error('no artworks found'); process.exit(1); }

// 2. Viewer pages + QR codes.
await generatePages({ basePath });
const urls = await generateQRCodes(config);

// 3. Vite build.
const vite = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit' });
if (vite.status !== 0) process.exit(vite.status ?? 1);

// 4. Artwork data + landing-page index into dist/.
await cp('artworks', 'dist/artworks', { recursive: true });
await writeFile('dist/artworks-index.json', JSON.stringify(index, null, 2));

console.log('\n✓ build complete - deploy the dist/ folder to your static host\n');
for (const { slug, url } of urls) console.log(`  ${slug}: ${url}  (QR: artworks/${slug}/qr.png)`);
