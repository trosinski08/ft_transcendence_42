// Lightweight performance HUD for optional use
// Tracks FPS and exposes a small DOM overlay

let el: HTMLDivElement | null = null;
let last = performance.now();
let frames = 0;
let fps = 0;
let enabled = false;

export function enablePerfOverlay() {
  if (enabled) return;
  enabled = true;
  if (!el) {
    el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = '8px';
    el.style.bottom = '8px';
    el.style.background = 'rgba(0,0,0,0.65)';
    el.style.border = '1px solid rgba(0,255,106,0.45)';
    el.style.color = '#9fdc9f';
    el.style.fontSize = '12px';
    el.style.padding = '6px 8px';
    el.style.borderRadius = '6px';
    el.style.zIndex = '9999';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
}

export function disablePerfOverlay() {
  enabled = false;
  if (el && el.parentNode) el.parentNode.removeChild(el);
  el = null;
}

export function tick(now = performance.now()) {
  if (!enabled) return;
  frames++;
  if (now - last >= 1000) {
    fps = Math.round((frames * 1000) / (now - last));
    frames = 0;
    last = now;
    if (el) el.textContent = `FPS: ${fps}`;
  }
}
