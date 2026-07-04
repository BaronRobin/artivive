import { normalizeLayer } from '../shared/scene-schema.js';

/** Numeric/typed editing of the selected layer. Plain DOM, rebuilt on selection. */
export class Inspector {
  constructor(root, { onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.layer = null;
  }

  show(layer) {
    this.layer = layer;
    if (!layer) {
      this.root.innerHTML = '<h2>Inspector</h2><p style="color:#9aa0a8; font-size:0.85rem;">Select a layer.</p>';
      return;
    }
    const l = normalizeLayer(layer);
    Object.assign(layer, l); // ensure edited layer carries full defaults
    const t = l.transform;
    const hasTransform = l.type !== 'audio';

    this.root.innerHTML = `
      <h2>Inspector</h2>
      <fieldset><legend>Layer</legend>
        <label class="f">Name <input type="text" data-k="name" value="${esc(l.name)}" /></label>
        <div style="font-size:0.75rem; color:#9aa0a8;">${l.type} · ${esc(l.src)}</div>
        <label class="f">Opacity <input type="number" data-k="opacity" step="0.05" min="0" max="1" value="${l.opacity}" /></label>
      </fieldset>
      ${hasTransform ? `
      <fieldset><legend>Position (trigger widths)</legend><div class="vec">${vec('transform.position', t.position, 0.01)}</div></fieldset>
      <fieldset><legend>Rotation (degrees)</legend><div class="vec">${vec('transform.rotation', t.rotation, 1)}</div></fieldset>
      <fieldset><legend>Scale</legend><div class="vec">${vec('transform.scale', t.scale, 0.01)}</div></fieldset>` : ''}
      <fieldset><legend>Timing</legend>
        <div class="row2">
          <label class="f">Delay (s) <input type="number" data-k="timing.delay" step="0.1" min="0" value="${l.timing.delay}" /></label>
          <label class="f">Duration (s) <input type="number" data-k="timing.duration" step="0.5" min="0" value="${l.timing.duration ?? ''}" placeholder="∞" /></label>
          <label class="f">Fade in (s) <input type="number" data-k="timing.fadeIn" step="0.1" min="0" value="${l.timing.fadeIn}" /></label>
          <label class="f">Fade out (s) <input type="number" data-k="timing.fadeOut" step="0.1" min="0" value="${l.timing.fadeOut}" /></label>
        </div>
        <label class="f">When tracking is lost
          <select data-k="timing.onLost">
            <option value="pause" ${l.timing.onLost === 'pause' ? 'selected' : ''}>Pause, resume on re-scan</option>
            <option value="reset" ${l.timing.onLost === 'reset' ? 'selected' : ''}>Reset, restart on re-scan</option>
          </select>
        </label>
      </fieldset>
      ${l.type === 'video' ? `
      <fieldset><legend>Video</legend>
        <label class="f"><span><input type="checkbox" data-k="loop" ${l.loop ? 'checked' : ''}/> Loop</span></label>
        <label class="f"><span><input type="checkbox" data-k="muted" ${l.muted ? 'checked' : ''}/> Muted (unmuting adds a sound button in the viewer)</span></label>
      </fieldset>` : ''}
      ${l.type === 'audio' ? `
      <fieldset><legend>Audio</legend>
        <label class="f"><span><input type="checkbox" data-k="loop" ${l.loop ? 'checked' : ''}/> Loop</span></label>
        <label class="f">Volume <input type="number" data-k="volume" step="0.05" min="0" max="1" value="${l.volume}" /></label>
      </fieldset>` : ''}
    `;

    this.root.querySelectorAll('[data-k]').forEach((input) => {
      input.addEventListener('change', () => {
        setPath(this.layer, input.dataset.k, coerce(input));
        this.onChange(this.layer);
      });
    });
  }

  /** Refresh transform fields from gizmo drags without rebuilding the DOM. */
  syncTransform(transform) {
    if (!this.layer) return;
    for (const [key, vals] of Object.entries(transform)) {
      vals.forEach((v, i) => {
        const el = this.root.querySelector(`[data-k="transform.${key}.${i}"]`);
        if (el && document.activeElement !== el) el.value = v;
      });
    }
  }
}

function vec(path, vals, step) {
  return vals.map((v, i) =>
    `<label class="f">${'XYZ'[i]} <input type="number" data-k="${path}.${i}" step="${step}" value="${v}" /></label>`
  ).join('');
}

function coerce(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.type === 'number') {
    if (input.value === '') return input.dataset.k === 'timing.duration' ? null : 0;
    return Number(input.value);
  }
  return input.value;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
