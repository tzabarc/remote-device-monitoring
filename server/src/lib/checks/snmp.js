import snmp from "net-snmp";

// Default OID is sysUpTime.0 — a safe, near-universal liveness probe.
const DEFAULT_OID = "1.3.6.1.2.1.1.3.0";

export function checkSnmp(device) {
  return new Promise((resolve) => {
    const cfg = device.snmp || {};
    const version = cfg.version === "1" ? snmp.Version1 : snmp.Version2c;

    const session = snmp.createSession(device.target, cfg.community || "public", {
      port: cfg.port || 161,
      version,
      timeout: cfg.timeoutMs ?? 3000,
      retries: cfg.retries ?? 1,
    });

    const oid = cfg.oid || DEFAULT_OID;
    const start = Date.now();

    const finish = (result) => {
      session.close();
      resolve(result);
    };

    session.on("error", (err) => {
      finish({ status: "down", latencyMs: null, message: err.message });
    });

    session.get([oid], (error, varbinds) => {
      if (error) {
        finish({ status: "down", latencyMs: null, message: error.message });
        return;
      }
      const vb = varbinds[0];
      if (snmp.isVarbindError(vb)) {
        finish({ status: "down", latencyMs: null, message: snmp.varbindError(vb) });
        return;
      }
      finish({
        status: "up",
        latencyMs: Date.now() - start,
        message: `${vb.oid} = ${vb.value}`,
      });
    });
  });
}
