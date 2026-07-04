import * as THREE from 'three';
import { normalizeLayer } from './scene-schema.js';
import { createVideoLayer } from '../layers/video-layer.js';
import { createImageLayer } from '../layers/image-layer.js';
import { createModelLayer } from '../layers/model-layer.js';
import { createAudioLayer } from '../layers/audio-layer.js';

const creators = {
  video: createVideoLayer,
  image: createImageLayer,
  model: createModelLayer,
  audio: createAudioLayer
};

/**
 * scene.json layer → { def, object3d, setOpacity, play, pause, reset, ... }.
 * Used identically by the AR viewer and the editor preview, which is what
 * guarantees the editor is WYSIWYG: same geometry sizing, same transforms,
 * same materials.
 *
 * Coordinate space is the MindAR anchor: trigger width = 1 unit, origin at
 * the trigger center, +z toward the viewer. Rotations are degrees.
 */
export function createLayer(layerDef, baseUrl) {
  const def = normalizeLayer(layerDef);
  const handle = creators[def.type](def, baseUrl);
  if (handle.object3d) applyTransform(handle.object3d, def.transform);
  handle.setOpacity(0);
  return handle;
}

export function applyTransform(object3d, t) {
  object3d.position.set(...t.position);
  object3d.rotation.set(
    THREE.MathUtils.degToRad(t.rotation[0]),
    THREE.MathUtils.degToRad(t.rotation[1]),
    THREE.MathUtils.degToRad(t.rotation[2])
  );
  object3d.scale.set(...t.scale);
}

/** Inverse of applyTransform - reads an object's transform back into scene.json format. */
export function readTransform(object3d) {
  const round = (v) => Math.round(v * 1000) / 1000;
  return {
    position: object3d.position.toArray().map(round),
    rotation: [
      round(THREE.MathUtils.radToDeg(object3d.rotation.x)),
      round(THREE.MathUtils.radToDeg(object3d.rotation.y)),
      round(THREE.MathUtils.radToDeg(object3d.rotation.z))
    ],
    scale: object3d.scale.toArray().map(round)
  };
}
