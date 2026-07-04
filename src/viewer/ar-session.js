import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { createLayer } from '../shared/layer-factory.js';
import { Timeline } from './timeline.js';

/**
 * Boots MindAR + Three.js for one artwork and drives the layer timeline from
 * tracking events. Resolves once the camera is running.
 */
export async function startARSession({ container, scene, baseUrl, onFound, onLost }) {
  const mindar = new MindARThree({
    container,
    imageTargetSrc: new URL(scene.trigger.mind, baseUrl).href,
    uiScanning: 'no',
    uiLoading: 'no',
    uiError: 'no'
  });

  const anchor = mindar.addAnchor(0);
  const handles = scene.layers.map((layer) => createLayer(layer, baseUrl));
  for (const h of handles) {
    if (h.object3d) anchor.group.add(h.object3d);
  }

  const timeline = new Timeline(handles);
  anchor.onTargetFound = () => { timeline.onFound(); onFound?.(); };
  anchor.onTargetLost = () => { timeline.onLost(); onLost?.(); };

  await mindar.start(); // rejects if camera permission is denied

  const clock = new THREE.Clock();
  mindar.renderer.setAnimationLoop(() => {
    timeline.update(Math.min(clock.getDelta(), 0.1));
    mindar.renderer.render(mindar.scene, mindar.camera);
  });

  const stop = () => {
    mindar.renderer.setAnimationLoop(null);
    mindar.stop();
    for (const h of handles) h.dispose();
  };
  // Release the camera when the tab is backgrounded/closed.
  window.addEventListener('pagehide', stop, { once: true });

  return { handles, timeline, stop };
}
