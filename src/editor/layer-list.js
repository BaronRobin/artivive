import { defaultLayer } from '../shared/scene-schema.js';
import { uploadAsset, typeForFile } from './persistence.js';

/** Left panel: layer rows + add-from-file. */
export class LayerList {
  constructor(root, scene, { onSelect, onChanged }) {
    this.root = root;
    this.scene = scene;
    this.onSelect = onSelect;
    this.onChanged = onChanged;
    this.selectedId = null;

    const fileInput = document.getElementById('asset-file');
    document.getElementById('add-layer').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const type = typeForFile(file.name);
      if (!type) return alert('Unsupported file type.');
      try {
        const src = await uploadAsset(this.scene.slug, file);
        const layer = defaultLayer(type, src, file.name);
        // Stack new visual layers slightly in front of existing ones to avoid z-fighting.
        if (layer.transform) layer.transform.position[2] = 0.01 + 0.005 * this.scene.layers.length;
        this.scene.layers.push(layer);
        this.onChanged({ rebuild: true });
        this.select(layer.id);
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
      }
    });
  }

  select(id) {
    this.selectedId = id;
    this.render();
    this.onSelect(id);
  }

  render() {
    this.root.innerHTML = '';
    if (!this.scene.layers.length) {
      this.root.innerHTML = '<p style="color:#9aa0a8; font-size:0.85rem;">No layers yet - add a video, image, 3D model or audio file.</p>';
      return;
    }
    this.scene.layers.forEach((layer, i) => {
      const row = document.createElement('div');
      row.className = 'layer-row' + (layer.id === this.selectedId ? ' selected' : '');
      row.innerHTML = `
        <span class="type">${layer.type}</span>
        <span class="name">${layer.name || layer.src}</span>
        <button data-a="up" title="Move up">▲</button>
        <button data-a="down" title="Move down">▼</button>
        <button data-a="del" title="Delete layer">✕</button>`;
      row.addEventListener('click', (e) => {
        const action = e.target.dataset?.a;
        if (action === 'del') {
          if (!confirm(`Delete layer "${layer.name}"? (The uploaded file stays in assets/.)`)) return;
          this.scene.layers.splice(i, 1);
          if (this.selectedId === layer.id) this.selectedId = null;
          this.onChanged({ rebuild: true });
          this.render();
          this.onSelect(this.selectedId);
        } else if (action === 'up' && i > 0) {
          [this.scene.layers[i - 1], this.scene.layers[i]] = [this.scene.layers[i], this.scene.layers[i - 1]];
          this.onChanged({ rebuild: true });
          this.render();
        } else if (action === 'down' && i < this.scene.layers.length - 1) {
          [this.scene.layers[i + 1], this.scene.layers[i]] = [this.scene.layers[i], this.scene.layers[i + 1]];
          this.onChanged({ rebuild: true });
          this.render();
        } else {
          this.select(layer.id);
        }
      });
      this.root.appendChild(row);
    });
  }
}
