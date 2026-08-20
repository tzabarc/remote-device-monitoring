import ping from "ping";

// Uses the system `ping` binary under the hood (works on macOS/Linux/Windows).
export async function checkPing(device) {
  const timeoutMs = device.ping?.timeoutMs ?? 3000;

  const res = await ping.promise.probe(device.target, {
    timeout: timeoutMs / 1000,
    min_reply: 1,
  });

  return {
    status: res.alive ? "up" : "down",
    latencyMs: res.time === "unknown" || res.time == null ? null : Number(res.time),
    message: res.alive ? "reply received" : "no reply",
  };
}
