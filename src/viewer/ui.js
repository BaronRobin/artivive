/** Viewer chrome: loading state, scanning hint, tap-to-enable-sound button. */

const style = `
  .par-overlay { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1rem; text-align: center; padding: 2rem; z-index: 10;
    background: rgba(0,0,0,0.55); transition: opacity 0.3s; font-family: system-ui, sans-serif; }
  .par-overlay.hidden { opacity: 0; pointer-events: none; }
  .par-overlay .spinner { width: 42px; height: 42px; border: 3px solid rgba(255,255,255,0.25);
    border-top-color: #fff; border-radius: 50%; animation: par-spin 0.9s linear infinite; }
  @keyframes par-spin { to { transform: rotate(360deg); } }
  .par-hint { position: fixed; left: 50%; bottom: 2.2rem; transform: translateX(-50%); z-index: 10;
    background: rgba(0,0,0,0.6); padding: 0.6rem 1.1rem; border-radius: 999px; font-size: 0.9rem;
    white-space: nowrap; transition: opacity 0.3s; font-family: system-ui, sans-serif; }
  .par-hint.hidden { opacity: 0; }
  .par-sound { position: fixed; top: 1rem; right: 1rem; z-index: 11; border: 0; border-radius: 999px;
    padding: 0.6rem 1rem; background: rgba(255,255,255,0.92); color: #111; font-size: 0.9rem;
    font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif; }
`;

export function createViewerUI() {
  const styleEl = document.createElement('style');
  styleEl.textContent = style;
  document.head.appendChild(styleEl);

  const loading = document.createElement('div');
  loading.className = 'par-overlay';
  loading.innerHTML = `<div class="spinner"></div><div>Starting camera…</div>`;
  document.body.appendChild(loading);

  const hint = document.createElement('div');
  hint.className = 'par-hint hidden';
  hint.textContent = 'Point your camera at the artwork';
  document.body.appendChild(hint);

  return {
    setLoaded() {
      loading.classList.add('hidden');
      hint.classList.remove('hidden');
    },
    setTracking(found) {
      hint.classList.toggle('hidden', found);
      if (!found) hint.textContent = 'Tracking lost - point back at the artwork';
    },
    /** Show the sound button iff some layer wants audio; one tap unlocks all. */
    offerSound(handles) {
      const wanting = handles.filter((h) => h.wantsSound);
      if (!wanting.length) return;
      const btn = document.createElement('button');
      btn.className = 'par-sound';
      btn.textContent = '🔊 Enable sound';
      btn.addEventListener('click', () => {
        for (const h of wanting) h.enableSound();
        btn.remove();
      });
      document.body.appendChild(btn);
    }
  };
}
