export const keys = new Set<string>();

export function initInputHandlers(onToggleRunning: () => void, onResetMatch: () => void, onAIPersistToggle: () => void) {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') {
      onToggleRunning();
    }
    if (e.code === 'KeyA') {
      onAIPersistToggle();
    }
    if (e.code === 'KeyR') {
      onResetMatch();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
}

export function stopInputHandlers() {
  // no-op for now; could remove listeners if we stored references
}
