import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { readTransform } from '../shared/layer-factory.js';

/** Gizmo + click-to-select on top of the Preview scene. */
export class EditorControls {
  constructor(preview, { onSelect, onTransform }) {
    this.preview = preview;
    this.onSelect = onSelect;
    this.onTransform = onTransform;

    this.gizmo = new TransformControls(preview.camera, preview.renderer.domElement);
    this.gizmo.setSize(0.8);
    preview.three.add(this.gizmo);

    this.gizmo.addEventListener('dragging-changed', (e) => {
      preview.orbit.enabled = !e.value;
      if (!e.value && this.gizmo.object) {
        onTransform(this.gizmo.object.userData.layerId, readTransform(this.gizmo.object));
      }
    });
    // Live-update the inspector while dragging.
    this.gizmo.addEventListener('objectChange', () => {
      if (this.gizmo.object) {
        onTransform(this.gizmo.object.userData.layerId, readTransform(this.gizmo.object), { live: true });
      }
    });

    const raycaster = new THREE.Raycaster();
    preview.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (this.gizmo.dragging) return;
      const rect = preview.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, preview.camera);
      const hits = raycaster.intersectObjects(preview.anchorGroup.children, true);
      for (const hit of hits) {
        let obj = hit.object;
        while (obj && !obj.userData.layerId) obj = obj.parent;
        if (obj?.userData.layerId) return onSelect(obj.userData.layerId);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'g') this.setMode('translate');
      if (e.key === 'r') this.setMode('rotate');
      if (e.key === 's') this.setMode('scale');
    });
  }

  setMode(mode) {
    this.gizmo.setMode(mode);
    document.getElementById('mode-t')?.classList.toggle('active', mode === 'translate');
    document.getElementById('mode-r')?.classList.toggle('active', mode === 'rotate');
    document.getElementById('mode-s')?.classList.toggle('active', mode === 'scale');
  }

  attach(object3d) {
    object3d ? this.gizmo.attach(object3d) : this.gizmo.detach();
  }
}
