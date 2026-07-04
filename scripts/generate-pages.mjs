/** Generates ar/<slug>/index.html for every artwork - physical files so plain static hosting gets clean URLs. */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export async function generatePages({ basePath }) {
  const template = await readFile('templates/viewer.html', 'utf8');
  await rm('ar', { recursive: true, force: true });

  const slugs = [];
  for (const d of await readdir('artworks', { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const scenePath = path.join('artworks', d.name, 'scene.json');
    if (!existsSync(scenePath)) continue;
    const scene = JSON.parse(await readFile(scenePath, 'utf8'));
    const html = template
      .replaceAll('__SLUG__', d.name)
      .replaceAll('__TITLE__', scene.title || d.name)
      .replaceAll('__BASE__', basePath);
    await mkdir(path.join('ar', d.name), { recursive: true });
    await writeFile(path.join('ar', d.name, 'index.html'), html);
    slugs.push(d.name);
  }
  return slugs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(await readFile('personalar.config.json', 'utf8'));
  const basePath = new URL(config.baseUrl).pathname.replace(/\/?$/, '/');
  const slugs = await generatePages({ basePath });
  console.log(`generated ${slugs.length} viewer page(s): ${slugs.join(', ')}`);
}
