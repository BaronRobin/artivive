/**
 * Generates artworks/demo/trigger.png - a feature-dense placeholder trigger
 * image. Image tracking needs many well-distributed, non-repetitive corners:
 * asymmetric polygons at varied scales, multi-size text, an irregular border.
 * Seeded RNG so the output (and its compiled .mind file) is reproducible.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 1200, H = 1600;

// Mulberry32 seeded PRNG - reproducible output.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260704);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const palette = ['#0d0f12', '#f4f1ea', '#e0452c', '#2456a8', '#e8b820', '#1a7a4a', '#7a3fa0'];
const parts = [];

// Paper background + irregular thick border (strong edge features).
parts.push(`<rect width="${W}" height="${H}" fill="#f4f1ea"/>`);
{
  const pts = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const t = i / n, m = 26 + rand() * 34;
    let x, y;
    if (t < 0.25) { x = (t / 0.25) * W; y = m; }
    else if (t < 0.5) { x = W - m; y = ((t - 0.25) / 0.25) * H; }
    else if (t < 0.75) { x = W - ((t - 0.5) / 0.25) * W; y = H - m; }
    else { x = m; y = H - ((t - 0.75) / 0.25) * H; }
    pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
  }
  parts.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="#0d0f12" stroke-width="14"/>`);
}

// Scatter asymmetric polygons on a jittered grid so features cover the whole
// image (clustered features = weak tracking at the sparse edges).
const cols = 5, rows = 7;
for (let gy = 0; gy < rows; gy++) {
  for (let gx = 0; gx < cols; gx++) {
    const cx = (gx + 0.5 + (rand() - 0.5) * 0.7) * (W / cols);
    const cy = (gy + 0.5 + (rand() - 0.5) * 0.7) * (H / rows);
    const r = 30 + rand() * 90;
    const sides = 3 + Math.floor(rand() * 5);
    const rot = rand() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const rr = r * (0.5 + rand() * 0.6);
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(0)},${(cy + Math.sin(a) * rr).toFixed(0)}`);
    }
    const fill = pick(palette.slice(1 + Math.floor(rand() * 2)));
    const stroke = rand() > 0.5 ? ` stroke="#0d0f12" stroke-width="${(3 + rand() * 6).toFixed(0)}"` : '';
    parts.push(`<polygon points="${pts.join(' ')}" fill="${fill}"${stroke} opacity="${(0.75 + rand() * 0.25).toFixed(2)}"/>`);
  }
}

// Text blocks at several scales/rotations - letterforms are corner goldmines.
const words = ['PERSONAL', 'AR', 'DEMO', 'TRIGGER', 'SCAN ME', 'K7', 'X39', 'NO. 42', 'ATELIER', 'PROOF'];
for (let i = 0; i < 14; i++) {
  const x = 90 + rand() * (W - 260);
  const y = 120 + rand() * (H - 220);
  const size = 26 + rand() * 74;
  const rot = (rand() - 0.5) * 70;
  parts.push(
    `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="Helvetica, Arial, sans-serif" ` +
    `font-weight="bold" font-size="${size.toFixed(0)}" fill="#0d0f12" ` +
    `transform="rotate(${rot.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})">${pick(words)}</text>`
  );
}

// A few crosshair/registration marks near corners (classic tracking anchors).
for (const [x, y] of [[130, 140], [W - 140, 150], [150, H - 150], [W - 130, H - 140], [W / 2, H / 2]]) {
  const r = 24 + rand() * 14;
  parts.push(
    `<circle cx="${x}" cy="${y}" r="${r.toFixed(0)}" fill="none" stroke="#0d0f12" stroke-width="7"/>` +
    `<line x1="${x - r * 1.6}" y1="${y}" x2="${x + r * 1.6}" y2="${y}" stroke="#0d0f12" stroke-width="7"/>` +
    `<line x1="${x}" y1="${y - r * 1.6}" x2="${x}" y2="${y + r * 1.6}" stroke="#0d0f12" stroke-width="7"/>`
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`;

mkdirSync('artworks/demo/assets', { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('artworks/demo/trigger.png');
console.log(`wrote artworks/demo/trigger.png (${W}x${H})`);
