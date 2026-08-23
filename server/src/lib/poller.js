import { checkPing } from "./checks/ping.js";
import { checkSnmp } from "./checks/snmp.js";
import { checkApi } from "./checks/api.js";
import { checkMock } from "./checks/mock.js";
import { recordEvent } from "./eventLog.js";

const checkers = { ping: checkPing, snmp: checkSnmp, api: checkApi, mock: checkMock };

export function createPoller({ getConfig, store, intervalMs, onUpdate, onEvent }) {
  let timer = null;
  let inFlight = false;

  async function pollOnce() {
    if (inFlight) return; // avoid overlapping runs if a check is slow
    inFlight = true;
    try {
      const config = getConfig();
      const allDevices = config.sites.flatMap((site) =>
        site.devices.map((device) => ({ ...device, siteId: site.id }))
      );

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
          store.setStatus(device.id, { ...result, checkedAt });

          const hasRealPrevious = previous.status === "up" || previous.status === "down";
          if (hasRealPrevious && previous.status !== result.status) {
            const event = recordEvent({
              deviceId: device.id,
              siteId: device.siteId,
              from: previous.status,
              to: result.status,
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
