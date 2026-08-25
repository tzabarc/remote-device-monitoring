import { checkPing } from "./checks/ping.js";
import { checkSnmp } from "./checks/snmp.js";
import { checkApi } from "./checks/api.js";
import { checkMock } from "./checks/mock.js";
import { recordEvent } from "./eventLog.js";

const checkers = { ping: checkPing, snmp: checkSnmp, api: checkApi, mock: checkMock };

function failThresholdFor(device, defaultFailThreshold) {
  const configured = device[device.method]?.failThreshold;
  return Number.isFinite(configured) && configured >= 1 ? configured : defaultFailThreshold;
}

export function createPoller({ getConfig, store, intervalMs, onUpdate, onEvent, defaultFailThreshold = 3 }) {
  let timer = null;
  let inFlight = false;

  // Consecutive-failure counts per device, for anti-flapping: a real check
  // (ping/snmp/api — mock is exempt, its transitions are scheduler-driven)
  // only flips the *visible* status to "down" after `failThreshold`
  // consecutive failed checks, so a single dropped packet or transient
  // blip doesn't trigger a false alert. Recovery is immediate on the first
  // successful check — slow to alarm, fast to clear, per standard
  // monitoring convention. Resets on server restart, same as live status.
  const failureCounts = new Map();

  async function pollOnce() {
    if (inFlight) return; // avoid overlapping runs if a check is slow
    inFlight = true;
    try {
      const config = getConfig();
      const allDevices = config.sites.flatMap((site) =>
        site.devices.map((device) => ({ ...device, siteId: site.id }))
      );

      // Prune counts for devices that no longer exist — otherwise a
      // deleted-then-recreated device (same id, e.g. same site + name)
      // would inherit a stale failure count instead of starting fresh.
      const validIds = new Set(allDevices.map((d) => d.id));
      for (const id of failureCounts.keys()) {
        if (!validIds.has(id)) failureCounts.delete(id);
      }

      await Promise.all(
        allDevices.map(async (device) => {
          const checker = checkers[device.method];
          const checkedAt = new Date().toISOString();

          if (!checker) {
            store.setStatus(device.id, {
              status: "unknown",
              latencyMs: null,
              message: `unknown method "${device.method}"`,
              checkedAt,
            });
            return;
          }

          const previous = store.getStatus(device.id);
          let result;
          try {
            result = await checker(device, previous);
          } catch (err) {
            result = { status: "down", latencyMs: null, message: err.message };
          }

          let effectiveStatus = result.status;
          let effectiveMessage = result.message;

          if (device.method !== "mock") {
            if (result.status === "down") {
              const threshold = failThresholdFor(device, defaultFailThreshold);
              const failCount = (failureCounts.get(device.id) || 0) + 1;
              failureCounts.set(device.id, failCount);
              if (failCount < threshold) {
                effectiveStatus = previous.status; // hold — not enough consecutive failures yet
                effectiveMessage = `${result.message} (pending: ${failCount}/${threshold})`;
              }
            } else {
              failureCounts.set(device.id, 0);
            }
          }

          store.setStatus(device.id, { status: effectiveStatus, latencyMs: result.latencyMs, message: effectiveMessage, checkedAt });

          const hasRealPrevious = previous.status === "up" || previous.status === "down";
          if (hasRealPrevious && previous.status !== effectiveStatus) {
            const event = recordEvent({
              deviceId: device.id,
              siteId: device.siteId,
              from: previous.status,
              to: effectiveStatus,
              at: checkedAt,
            });
            onEvent?.(event);
          }
        })
      );

      onUpdate?.(store.getAll());
    } finally {
      inFlight = false;
    }
  }

  function start() {
    pollOnce();
    timer = setInterval(pollOnce, intervalMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
  }

  return { start, stop, pollOnce };
}
