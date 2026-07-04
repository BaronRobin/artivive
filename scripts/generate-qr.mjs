/** Generates artworks/<slug>/qr.png pointing at the published viewer URL. */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

export async function generateQRCodes({ baseUrl }) {
  const urls = [];
  for (const d of await readdir('artworks', { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    if (!existsSync(path.join('artworks', d.name, 'scene.json'))) continue;
    const url = `${baseUrl.replace(/\/$/, '')}/ar/${d.name}/`;
    await QRCode.toFile(path.join('artworks', d.name, 'qr.png'), url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    urls.push({ slug: d.name, url });
  }
  return urls;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(await readFile('personalar.config.json', 'utf8'));
  for (const { slug, url } of await generateQRCodes(config)) console.log(`${slug}: qr.png → ${url}`);
}
