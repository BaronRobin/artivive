/**
 * Flat audio layer (no spatialization in v1). Browsers block audio until a
 * user gesture, so play() silently no-ops until enableSound() ran - the
 * viewer UI calls it from its tap-to-enable-sound button.
 */
export function createAudioLayer(def, baseUrl) {
  const audio = new Audio(new URL(def.src, baseUrl).href);
  audio.loop = def.loop;
  audio.volume = def.volume ?? 1;
  audio.preload = 'auto';

  let unlocked = false;
  let shouldPlay = false;

  return {
    def,
    object3d: null,
    setOpacity(v) { audio.volume = Math.max(0, Math.min(1, v * (def.volume ?? 1))); },
    play() {
      shouldPlay = true;
      if (unlocked) audio.play().catch(() => {});
    },
    pause() { shouldPlay = false; audio.pause(); },
    reset() { shouldPlay = false; audio.pause(); audio.currentTime = 0; },
    wantsSound: true,
    enableSound() {
      unlocked = true;
      if (shouldPlay) audio.play().catch(() => {});
    },
    dispose() { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  };
}
