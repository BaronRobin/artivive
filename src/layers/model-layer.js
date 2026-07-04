import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** glTF/GLB layer, normalized so its largest dimension spans 1 trigger-width unit. */
export function createModelLayer(def, baseUrl) {
  const group = new THREE.Group();
  const materials = [];
  let currentOpacity = 0;

  new GLTFLoader().load(new URL(def.src, baseUrl).href, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1 / (Math.max(size.x, size.y, size.z) || 1);
    model.scale.setScalar(scale);
    box.getCenter(model.position).multiplyScalar(-scale);
    model.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone(); // per-layer opacity without cross-talk
        node.material.transparent = true;
        materials.push(node.material);
      }
    });
    for (const m of materials) m.opacity = currentOpacity * def.opacity;
    group.add(model);
  });

  return {
    def,
    object3d: group,
    setOpacity(v) {
      currentOpacity = v;
      for (const m of materials) m.opacity = v * def.opacity;
      group.visible = v > 0.001;
    },
    play() {}, pause() {}, reset() {},
    dispose() { for (const m of materials) m.dispose(); }
  };
}
