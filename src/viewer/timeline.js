/**
 * Per-layer timing engine. Runs the same in the AR viewer (driven by
 * targetFound/targetLost) and in the editor preview (driven by a play button).
 *
 * Layer lifecycle per timing config {delay, fadeIn, fadeOut, duration, onLost}:
 *   found → wait delay → fade in → active (→ fade out after duration, if set)
 *   lost  → fade out, then "pause" (resume where it was on re-found) or
 *           "reset" (start over on re-found)
 */
export class Timeline {
  constructor(handles) {
    this.states = handles.map((handle) => ({
      handle,
      phase: 'idle', // idle | waiting | fadingIn | active | fadingOut | done
      t: 0,          // seconds since (re)start of this layer's clock
      opacity: 0,
      resumeOnFound: false
    }));
    this.tracking = false;
  }

  onFound() {
    this.tracking = true;
    for (const s of this.states) {
      if (s.phase === 'idle') {
        s.phase = 'waiting';
        s.t = 0;
      } else if (s.resumeOnFound) {
        if (s.t >= s.handle.def.timing.delay) {
          s.phase = 'fadingIn';
          s.handle.play();
        } else {
          s.phase = 'waiting';
        }
      }
      s.resumeOnFound = false;
    }
  }

  onLost() {
    this.tracking = false;
    for (const s of this.states) {
      if (s.phase === 'done' || s.phase === 'idle') continue;
      s.handle.pause();
      if (s.handle.def.timing.onLost === 'reset') {
        s.handle.reset();
        s.phase = 'idle';
        s.opacity = 0;
        s.handle.setOpacity(0);
      } else {
        s.phase = 'fadingOut';
        s.resumeOnFound = true;
      }
    }
  }

  /** Call every frame with delta time in seconds. */
  update(dt) {
    for (const s of this.states) {
      const { timing } = s.handle.def;
      if (this.tracking && (s.phase === 'waiting' || s.phase === 'fadingIn' || s.phase === 'active')) {
        s.t += dt;
      }

      switch (s.phase) {
        case 'waiting':
          if (s.t >= timing.delay) {
            s.phase = 'fadingIn';
            s.handle.play();
          }
          break;
        case 'fadingIn':
          s.opacity = timing.fadeIn > 0 ? Math.min(1, s.opacity + dt / timing.fadeIn) : 1;
          if (s.opacity >= 1) s.phase = 'active';
          break;
        case 'active':
          if (timing.duration != null && s.t >= timing.delay + timing.duration) {
            s.phase = 'fadingOut';
            s.resumeOnFound = false;
            s.handle.pause();
          }
          break;
        case 'fadingOut':
          s.opacity = timing.fadeOut > 0 ? Math.max(0, s.opacity - dt / timing.fadeOut) : 0;
          // idle_paused holds at 0 opacity until onFound resumes it.
          if (s.opacity <= 0) s.phase = s.resumeOnFound ? 'idle_paused' : 'done';
          break;
      }

      s.handle.setOpacity(s.opacity);
    }
  }

  /** Editor preview: restart everything from scratch. */
  reset() {
    this.tracking = false;
    for (const s of this.states) {
      s.handle.reset();
      s.phase = 'idle';
      s.t = 0;
      s.opacity = 0;
      s.resumeOnFound = false;
      s.handle.setOpacity(0);
    }
  }
}
