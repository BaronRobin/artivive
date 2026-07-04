/** Shown when the camera is unavailable: denied permission, no camera, or unsupported browser. */
export function showFallback({ scene, baseUrl, reason }) {
  const messages = {
    denied: 'Camera access was denied. To view this artwork in AR, allow camera access for this site in your browser settings and reload the page.',
    unsupported: 'This browser can’t run the AR viewer. Open this page in Safari (iPhone) or Chrome (Android) instead.',
    error: 'The AR viewer could not start on this device.'
  };
  const triggerUrl = scene?.trigger?.image ? new URL(scene.trigger.image, baseUrl).href : null;

  document.body.innerHTML = `
    <div style="min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
                gap:1.2rem; padding:2rem; text-align:center; font-family:system-ui,sans-serif; background:#0d0f12; color:#e8e8ea;">
      ${triggerUrl ? `<img src="${triggerUrl}" alt="${scene.title}" style="max-width:min(320px,70vw); border-radius:12px;" />` : ''}
      <h1 style="font-size:1.2rem; margin:0;">${scene?.title ?? 'AR Artwork'}</h1>
      <p style="max-width:34rem; color:#9aa0a8; margin:0;">${messages[reason] ?? messages.error}</p>
      <button onclick="location.reload()" style="border:0; border-radius:999px; padding:0.7rem 1.4rem;
              background:#4a90d9; color:#fff; font-size:0.95rem; font-weight:600; cursor:pointer;">Try again</button>
    </div>`;
}
