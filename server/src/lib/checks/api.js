// Uses Node's built-in global fetch (Node >= 18).
export async function checkApi(device) {
  const cfg = device.api || {};
  const controller = new AbortController();
  const timeoutMs = cfg.timeoutMs ?? 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(device.target, {
      method: cfg.method || "GET",
      headers: cfg.headers || {},
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    const expectedStatus = cfg.expectedStatus ?? 200;

    if (res.status !== expectedStatus) {
      return {
        status: "down",
        latencyMs,
        message: `expected HTTP ${expectedStatus}, got ${res.status}`,
      };
    }

    if (cfg.jsonPath) {
      const body = await res.json();
      const value = cfg.jsonPath
        .split(".")
        .reduce((obj, key) => (obj == null ? undefined : obj[key]), body);

      if (cfg.expectedValue !== undefined && value !== cfg.expectedValue) {
        return {
          status: "down",
          latencyMs,
          message: `${cfg.jsonPath} = ${JSON.stringify(value)}, expected ${JSON.stringify(cfg.expectedValue)}`,
        };
      }
      return { status: "up", latencyMs, message: `${cfg.jsonPath} = ${JSON.stringify(value)}` };
    }

    return { status: "up", latencyMs, message: `HTTP ${res.status}` };
  } catch (err) {
    return {
      status: "down",
      latencyMs: null,
      message: err.name === "AbortError" ? `timed out after ${timeoutMs}ms` : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
