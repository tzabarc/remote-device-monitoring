// Drives status *changes* for mock devices: exactly one device flips per
// tick, on a randomly-spaced interval, independent of the regular poll
// cycle. The poller still checks mock devices every tick (via
// checks/mock.js), but that's now purely passive/sticky — this scheduler
// is the only thing that actually changes a mock device's status.
function randomDelayMs(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
}

function collectMockDevices(config) {
  return config.sites.flatMap((site) => site.devices.filter((d) => d.method === "mock"));
}

// Rolls a per-device target status using its upProbability, retrying with
// a different random device until one actually changes state, so every
// tick produces a real, visible event. Falls back to a forced toggle if
// no change turns up within a bounded number of attempts (pathological
// edge case, e.g. a single mock device stuck matching its own bias).
function pickChangeEvent(devices, store) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)];
    const upProbability = device.mock?.upProbability ?? 0.95;
    const target = Math.random() < upProbability ? "up" : "down";
    const current = store.getStatus(device.id)?.status;
    if (current !== target) return { device, target };
  }
  const device = devices[Math.floor(Math.random() * devices.length)];
  const current = store.getStatus(device.id)?.status;
  return { device, target: current === "up" ? "down" : "up" };
}

export function createMockEventScheduler({ getConfig, store, onUpdate, minMs = 4000, maxMs = 50000 }) {
  let timer = null;

  function triggerOne() {
    const devices = collectMockDevices(getConfig());
    if (devices.length === 0) return;

    const { device, target } = pickChangeEvent(devices, store);
    const now = new Date().toISOString();

    store.setStatus(device.id, {
      status: target,
      latencyMs: target === "up" ? Math.round(4 + Math.random() * 40) : null,
      message: target === "up" ? "simulated: nominal" : "simulated: no response",
      changedAt: now,
      checkedAt: now,
    });

    onUpdate?.(store.getAll());
  }

  function scheduleNext() {
    timer = setTimeout(() => {
      triggerOne();
      scheduleNext();
    }, randomDelayMs(minMs, maxMs));
  }

  function start() {
    scheduleNext();
  }

  function stop() {
    if (timer) clearTimeout(timer);
  }

  return { start, stop };
}
