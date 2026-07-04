import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

const slugSel = document.getElementById('slug');
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const progressBar = document.querySelector('#progress > div');
const progressWrap = document.getElementById('progress');
const statusEl = document.getElementById('status');
const preview = document.getElementById('preview');

async function refreshArtworks(selected) {
  const artworks = await (await fetch('/__admin/api/artworks')).json();
  slugSel.innerHTML = artworks
    .map((a) => `<option value="${a.slug}" ${a.slug === selected ? 'selected' : ''}>${a.slug}${a.hasMind ? ' ✓' : ''}</option>`)
    .join('');
  if (!artworks.length) statusEl.textContent = 'No artworks yet - create one first.';
}
await refreshArtworks(new URLSearchParams(location.search).get('slug'));

document.getElementById('new').addEventListener('click', async () => {
  const slug = prompt('Slug for the new artwork (lowercase letters, digits, hyphens):');
  if (!slug) return;
  const res = await fetch('/__admin/api/artworks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, title: slug })
  });
  if (!res.ok) return alert((await res.json()).error);
  await refreshArtworks(slug);
});

drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('armed'); });
drop.addEventListener('dragleave', () => drop.classList.remove('armed'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('armed');
  const file = e.dataTransfer.files[0];
  if (file) compile(file);
});
fileInput.addEventListener('change', () => fileInput.files[0] && compile(fileInput.files[0]));

async function compile(file) {
  const slug = slugSel.value;
  if (!slug) return alert('Create/select an artwork first.');

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  progressWrap.style.display = 'block';
  statusEl.textContent = 'Compiling image target… (this takes ~10-60s)';

  const compiler = new Compiler();
  const [data] = await compiler.compileImageTargets([img], (p) => {
    progressBar.style.width = `${p.toFixed(0)}%`;
  });
  const buffer = await compiler.exportData();

  statusEl.textContent = 'Saving…';
  const up = (url, body, headers = {}) => fetch(url, { method: 'POST', body, headers });
  await up(`/__admin/api/artworks/${slug}/mind`, buffer);
  await up(`/__admin/api/artworks/${slug}/trigger?name=trigger${extOf(file.name)}`, file);

  // Record trigger image + dimensions in scene.json so viewer/editor know the aspect.
  const scene = await (await fetch(`/artworks/${slug}/scene.json`)).json();
  scene.trigger = { ...scene.trigger, image: `trigger${extOf(file.name)}`, mind: 'targets.mind', width: img.naturalWidth, height: img.naturalHeight };
  await up(`/__admin/api/artworks/${slug}/scene`, JSON.stringify(scene), { 'Content-Type': 'application/json' });

  drawFeaturePoints(img, data);
  const nPoints = countPoints(data);
  statusEl.textContent = `Done - targets.mind saved (${nPoints} feature points). ` +
    (nPoints < 100 ? '⚠️ Few features: this image may track poorly.' : 'Dots below = trackable features; they should cover the whole image.');
  await refreshArtworks(slug);
  URL.revokeObjectURL(img.src);
}

function extOf(name) {
  const e = name.slice(name.lastIndexOf('.')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(e) ? e : '.png';
}

function collectPoints(data) {
  const sets = [];
  for (const list of [data.trackingData, data.matchingData]) {
    for (const level of list || []) {
      const pts = level.points || level.maximaPoints || [];
      if (pts.length) sets.push({ pts, w: level.width, h: level.height });
    }
  }
  return sets;
}

function countPoints(data) {
  return collectPoints(data).reduce((n, s) => n + s.pts.length, 0);
}

/** Draw detected feature points over the image - the practical tracking-quality check. */
function drawFeaturePoints(img, data) {
  preview.width = img.naturalWidth;
  preview.height = img.naturalHeight;
  preview.style.display = 'block';
  const ctx = preview.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = 'rgba(255,40,40,0.9)';
  for (const { pts, w } of collectPoints(data)) {
    const scale = img.naturalWidth / (w || img.naturalWidth);
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x * scale, p.y * scale, Math.max(3, 3 * scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
