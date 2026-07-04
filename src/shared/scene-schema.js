export const SCHEMA_VERSION = 1;

export const LAYER_TYPES = ['video', 'image', 'model', 'audio'];

export function defaultTransform() {
  return { position: [0, 0, 0.01], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export function defaultTiming() {
  return { delay: 0, fadeIn: 0.4, fadeOut: 0.2, duration: null, onLost: 'pause' };
}

export function defaultLayer(type, src, name) {
  const layer = {
    id: `l_${Math.random().toString(36).slice(2, 9)}`,
    type,
    name: name || src?.split('/').pop() || type,
    src,
    opacity: 1,
    timing: defaultTiming()
  };
  if (type !== 'audio') layer.transform = defaultTransform();
  if (type === 'video') { layer.loop = true; layer.muted = true; }
  if (type === 'audio') { layer.loop = false; layer.volume = 1; }
  return layer;
}

/** Fill any missing fields with defaults so runtime code never branches on absence. */
export function normalizeLayer(layer) {
  const base = defaultLayer(layer.type, layer.src, layer.name);
  const out = { ...base, ...layer };
  if (layer.type !== 'audio') out.transform = { ...defaultTransform(), ...(layer.transform || {}) };
  out.timing = { ...defaultTiming(), ...(layer.timing || {}) };
  return out;
}

export function validateScene(scene) {
  const errors = [];
  if (scene.version !== SCHEMA_VERSION) errors.push(`unsupported scene version ${scene.version}`);
  if (!scene.slug) errors.push('missing slug');
  if (!scene.trigger?.mind) errors.push('missing trigger.mind');
  if (!Array.isArray(scene.layers)) errors.push('layers must be an array');
  for (const l of scene.layers || []) {
    if (!LAYER_TYPES.includes(l.type)) errors.push(`layer ${l.id}: unknown type "${l.type}"`);
    if (!l.src) errors.push(`layer ${l.id}: missing src`);
  }
  return errors;
}
