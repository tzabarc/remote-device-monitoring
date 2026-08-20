let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Browsers block audio from ever making sound until it's created/resumed
// inside a real user-gesture handler (click, keydown, etc). Status-change
// sounds are triggered from a socket event, not a gesture, so without
// this the AudioContext stays permanently "suspended" and every beep()
// call below silently does nothing — indistinguishable from being muted.
// Call this once from a page-wide click/keydown listener on first
// interaction so the context is already unlocked by the time a real
// status-change event needs to play.
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

function beep({ frequency, duration = 0.15, type = "sine", gain = 0.15, delay = 0 }) {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {
    // Autoplay restrictions or no audio support — fail silently.
  }
}

export function playUpSound(startDelay = 0) {
  beep({ frequency: 880, duration: 0.12, delay: startDelay });
  beep({ frequency: 1180, duration: 0.14, delay: startDelay + 0.1 });
}

export function playDownSound(startDelay = 0) {
  beep({ frequency: 330, duration: 0.25, type: "square", gain: 0.12, delay: startDelay });
  beep({ frequency: 220, duration: 0.3, type: "square", gain: 0.12, delay: startDelay + 0.15 });
}
