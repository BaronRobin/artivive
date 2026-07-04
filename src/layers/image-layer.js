import * as THREE from 'three';

export function createImageLayer(def, baseUrl) {
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);

  new THREE.TextureLoader().load(new URL(def.src, baseUrl).href, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
    const aspect = texture.image.width / texture.image.height;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(1, 1 / aspect);
  });

  return {
    def,
    object3d: mesh,
    setOpacity(v) { material.opacity = v * def.opacity; },
    play() {}, pause() {}, reset() {},
    dispose() { material.map?.dispose(); material.dispose(); mesh.geometry.dispose(); }
  };
}
