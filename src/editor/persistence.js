/** Editor ↔ dev-middleware IO. Only exists locally; the deployed site is static. */

export function artworkSlug() {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) {
    document.body.innerHTML = '<p style="padding:2rem">Missing ?slug= - open the editor from the <a href="/admin/">gallery</a>.</p>';
    throw new Error('no slug');
  }
  return slug;
}

export async function loadScene(slug) {
  const res = await fetch(`/artworks/${slug}/scene.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`scene.json for "${slug}" not found`);
  return res.json();
}

export async function saveScene(scene) {
  const res = await fetch(`/__admin/api/artworks/${scene.slug}/scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'save failed');
}

/** Upload a media file into the artwork's assets/ folder; returns its scene-relative path. */
export async function uploadAsset(slug, file) {
  const res = await fetch(`/__admin/api/artworks/${slug}/asset?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    body: file
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'upload failed');
  return json.path;
}

export function typeForFile(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (['.mp4', '.webm'].includes(ext)) return 'video';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image';
  if (['.glb', '.gltf'].includes(ext)) return 'model';
  if (['.mp3', '.m4a', '.ogg', '.wav'].includes(ext)) return 'audio';
  return null;
}
