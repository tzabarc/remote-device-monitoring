// Simulated check: doesn't touch the network at all, and doesn't decide
// on its own when to change status either. It's purely sticky — it just
// keeps returning the last known status, refreshing checkedAt/latency.
// The actual status transitions are driven externally, one at a time, by
// mockEventScheduler.js. On the very first check for a device (no
// `previous` yet), it rolls an initial status using upProbability so the
// system starts near its target up ratio.
export async function checkMock(device, previous) {
  // store.getStatus() returns a default { status: "unknown" } placeholder
  // for devices with no history yet — that's not a "real" previous status,
  // so only treat up/down as already-initialized.
  const hasRealPrevious = previous?.status === "up" || previous?.status === "down";
  if (hasRealPrevious) {
    return {
      status: previous.status,
      latencyMs: previous.status === "up" ? Math.round(4 + Math.random() * 40) : null,
      message: previous.status === "up" ? "simulated: nominal" : "simulated: no response",
      changedAt: previous.changedAt,
    };
  }

  const upProbability = device.mock?.upProbability ?? 0.95;
  const status = Math.random() < upProbability ? "up" : "down";
  return {
    status,
    latencyMs: status === "up" ? Math.round(4 + Math.random() * 40) : null,
    message: status === "up" ? "simulated: nominal" : "simulated: no response",
    changedAt: new Date().toISOString(),
  };
}
