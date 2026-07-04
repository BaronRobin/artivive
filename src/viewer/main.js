import { validateScene } from '../shared/scene-schema.js';
import { showFallback } from './fallback.js';

const { base } = window.__ARTWORK__;
const container = document.getElementById('ar-container');

let scene = null;
try {
  scene = await (await fetch(`${base}scene.json`)).json();
  const errors = validateScene(scene);
  if (errors.length) throw new Error(errors.join('; '));
} catch (err) {
  console.error('scene load failed:', err);
  showFallback({ scene, baseUrl: absBase(), reason: 'error' });
  throw err;
}

if (!navigator.mediaDevices?.getUserMedia || !window.WebGLRenderingContext) {
  showFallback({ scene, baseUrl: absBase(), reason: 'unsupported' });
} else {
  // MindAR (and tfjs inside it) is heavy - load it only after capability checks pass.
  const [{ startARSession }, { createViewerUI }] = await Promise.all([
    import('./ar-session.js'),
    import('./ui.js')
  ]);
  const ui = createViewerUI();
  try {
    const session = await startARSession({
      container,
      scene,
      baseUrl: absBase(),
      onFound: () => ui.setTracking(true),
      onLost: () => ui.setTracking(false)
    });
    ui.setLoaded();
    ui.offerSound(session.handles);
  } catch (err) {
    console.error('AR start failed:', err);
    const denied = /permission|notallowed|denied/i.test(String(err?.name) + String(err?.message));
    showFallback({ scene, baseUrl: absBase(), reason: denied ? 'denied' : 'error' });
  }
}

/** scene asset paths are relative to the artwork folder; resolve against the page origin. */
function absBase() {
  return new URL(base, location.href).href;
}
