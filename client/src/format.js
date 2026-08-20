export const METHOD_LABELS = { ping: "PING", snmp: "SNMP", api: "API" };

export const TYPE_LABELS = {
  router: "Router",
  camera: "Camera",
  "ptz-camera": "PTZ Camera",
  sensor: "Sensor",
  power: "Power",
  roip: "ROIP",
  "cellular-bts": "Cellular BTS",
};

export const TYPE_ICONS = {
  router: "🌐",
  camera: "📷",
  "ptz-camera": "🎥",
  sensor: "📟",
  power: "🔋",
  roip: "📻",
  "cellular-bts": "📶",
};

// Devices monitored via the "mock" method are a config/demo implementation
// detail — viewers of the dashboard shouldn't see "MOCK" as a monitoring
// method. Show a plausible method for the device's type instead. This is
// display-only; the admin/config UI still shows the real method.
const TYPE_DEFAULT_METHOD = {
  router: "ping",
  camera: "snmp",
  "ptz-camera": "snmp",
  sensor: "api",
  power: "snmp",
  roip: "ping",
  "cellular-bts": "snmp",
};

export function displayMethod(device) {
  const method = device.method === "mock" ? TYPE_DEFAULT_METHOD[device.type] || "ping" : device.method;
  return METHOD_LABELS[method] || method.toUpperCase();
}

export function formatIsraelTime(iso) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatIsraelDateTime(iso) {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
  });
  return `${datePart} ${formatIsraelTime(iso)}`;
}
