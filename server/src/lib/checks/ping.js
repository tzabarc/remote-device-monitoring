import net from "net";

// Real ICMP echo needs raw-socket permission, which managed platforms like
// Render don't grant to app processes — the OS `ping` binary reliably fails
// there with "Check the path or permissions" and every ping-checked device
// shows down forever. A plain TCP connect attempt needs no special
// privileges and works identically in any sandboxed environment, so
// "ping" here means reachability via TCP connect to a port, not a literal
// ICMP echo. Defaults to 443 since that's open on almost anything with a
// network stack (including the public DNS resolvers this demo points at);
// override per-device with `ping: { port: ... }` in sites.yaml if needed.
export async function checkPing(device) {
  const timeoutMs = device.ping?.timeoutMs ?? 3000;
  const port = device.ping?.port ?? 443;
  const start = Date.now();

  try {
    await tcpConnect(device.target, port, timeoutMs);
    return { status: "up", latencyMs: Date.now() - start, message: `tcp:${port} reachable` };
  } catch (err) {
    return { status: "down", latencyMs: null, message: err.message };
  }
}

function tcpConnect(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish());
    socket.once("timeout", () => finish(new Error(`connection to ${host}:${port} timed out`)));
    socket.once("error", (err) => finish(err));
    socket.connect(port, host);
  });
}
