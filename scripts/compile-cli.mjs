/**
 * Compiles trigger images into MindAR .mind target files from the terminal.
 * Uses mind-ar's OfflineCompiler (tfjs CPU + node-canvas) - same output as
 * the in-browser compiler page, just headless and batchable.
 *
 *   node scripts/compile-cli.mjs             # compile artworks missing targets.mind
 *   node scripts/compile-cli.mjs --force     # recompile everything
 *   node scripts/compile-cli.mjs demo other  # compile specific slugs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadImage } from 'canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const requested = args.filter((a) => !a.startsWith('--'));

const all = (await readdir('artworks', { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const slugs = requested.length ? requested : all;

let compiled = 0;
for (const slug of slugs) {
  const dir = path.join('artworks', slug);
  const scenePath = path.join(dir, 'scene.json');
  if (!existsSync(scenePath)) { console.warn(`skip ${slug}: no scene.json`); continue; }
  const scene = JSON.parse(await readFile(scenePath, 'utf8'));

  const triggerName = scene.trigger?.image
    || (await readdir(dir)).find((f) => /^trigger\.(png|jpe?g|webp)$/i.test(f));
  if (!triggerName) { console.warn(`skip ${slug}: no trigger image`); continue; }
  const mindPath = path.join(dir, scene.trigger?.mind || 'targets.mind');
  if (existsSync(mindPath) && !force && !requested.includes(slug)) {
    console.log(`skip ${slug}: targets.mind exists (use --force to recompile)`);
    continue;
  }

  console.log(`compiling ${slug}/${triggerName} … (takes a minute or two on CPU)`);
  const img = await loadImage(path.join(dir, triggerName));
  const compiler = new OfflineCompiler();
  let lastPct = -10;
  await compiler.compileImageTargets([img], (pct) => {
    if (pct - lastPct >= 10) { process.stdout.write(`  ${pct.toFixed(0)}%\n`); lastPct = pct; }
  });
  await writeFile(mindPath, Buffer.from(compiler.exportData()));

  scene.trigger = { ...scene.trigger, image: triggerName, mind: path.basename(mindPath), width: img.width, height: img.height };
  await writeFile(scenePath, JSON.stringify(scene, null, 2));
  console.log(`  ✓ wrote ${mindPath}`);
  compiled++;
}
console.log(`done - ${compiled} target(s) compiled.`);
