import { Preview } from './preview.js';
import { EditorControls } from './controls.js';
import { Inspector } from './inspector.js';
import { LayerList } from './layer-list.js';
import { artworkSlug, loadScene, saveScene } from './persistence.js';
import { applyTransform } from '../shared/layer-factory.js';
import { Timeline } from '../viewer/timeline.js';

const slug = artworkSlug();
const scene = await loadScene(slug);
document.getElementById('artwork-title').textContent = `${scene.title} (${slug})`;

const preview = new Preview(document.getElementById('viewport'), scene, `${location.origin}/artworks/${slug}/`);
const statusEl = document.getElementById('status');
let dirty = false;
const markDirty = () => { dirty = true; statusEl.textContent = 'unsaved changes'; statusEl.className = 'dirty'; };

const inspector = new Inspector(document.getElementById('inspector'), {
  onChange(layer) {
    // Numeric edits → push into the live 3D object (gizmo edits flow the other way).
    const obj = preview.objectForLayer(layer.id);
    if (obj && layer.transform) applyTransform(obj, layer.transform);
    const handle = preview.handles.find((h) => h.def.id === layer.id);
    if (handle) { Object.assign(handle.def, layer); handle.setOpacity(1); }
    markDirty();
    layerList.render();
  }
});

const controls = new EditorControls(preview, {
  onSelect(id) { layerList.select(id); },
  onTransform(id, transform, { live } = {}) {
    const layer = scene.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.transform = transform;
    inspector.syncTransform(transform);
    if (!live) markDirty();
  }
});
controls.setMode('translate');
document.getElementById('mode-t').addEventListener('click', () => controls.setMode('translate'));
document.getElementById('mode-r').addEventListener('click', () => controls.setMode('rotate'));
document.getElementById('mode-s').addEventListener('click', () => controls.setMode('scale'));

const layerList = new LayerList(document.getElementById('layer-list'), scene, {
  onSelect(id) {
    inspector.show(scene.layers.find((l) => l.id === id) ?? null);
    controls.attach(id ? preview.objectForLayer(id) : null);
  },
  onChanged({ rebuild } = {}) {
    markDirty();
    if (rebuild) { preview.rebuild(); controls.attach(null); }
  }
});

preview.rebuild();
layerList.render();

// ▶ Preview runs the real viewer Timeline against the editor scene - timing WYSIWYG.
let timeline = null;
const playBtn = document.getElementById('play');
playBtn.addEventListener('click', () => {
  if (timeline) {
    timeline.reset();
    for (const h of preview.handles) h.setOpacity(1);
    preview.tick = null;
    timeline = null;
    playBtn.textContent = '▶ Preview';
  } else {
    timeline = new Timeline(preview.handles);
    for (const h of preview.handles) { h.enableSound?.(); h.setOpacity(0); }
    timeline.onFound();
    preview.tick = (dt) => timeline.update(dt);
    playBtn.textContent = '■ Stop';
  }
});

async function save() {
  try {
    await saveScene(scene);
    dirty = false;
    statusEl.textContent = 'saved';
    statusEl.className = '';
  } catch (err) {
    statusEl.textContent = `save failed: ${err.message}`;
    statusEl.className = 'dirty';
  }
}
document.getElementById('save').addEventListener('click', save);
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
