import * as THREE from 'three';

/**
 * Video plane layer. iOS Safari rules shape everything here: autoplay is only
 * allowed muted+playsinline, and unmuting requires a user gesture (handled by
 * the shared audio-unlock flow in the viewer UI).
 */
export function createVideoLayer(def, baseUrl) {
  const video = document.createElement('video');
  video.src = new URL(def.src, baseUrl).href;
  video.crossOrigin = 'anonymous';
  video.loop = def.loop;
  video.muted = true; // always start muted; unmute only via user gesture
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 });
  // Placeholder aspect until metadata arrives; plane width = trigger width (1 unit).
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 9 / 16), material);
  video.addEventListener('loadedmetadata', () => {
    const aspect = video.videoWidth / video.videoHeight || 16 / 9;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(1, 1 / aspect);
  }, { once: true });

  return {
    def,
    object3d: mesh,
    setOpacity(v) { material.opacity = v * def.opacity; },
    play() { video.play().catch(() => {}); },
    pause() { video.pause(); },
    reset() { video.pause(); video.currentTime = 0; },
    wantsSound: !def.muted,
    enableSound() { video.muted = false; },
    dispose() {
      video.pause(); video.removeAttribute('src'); video.load();
      texture.dispose(); material.dispose(); mesh.geometry.dispose();
    }
  };
}
