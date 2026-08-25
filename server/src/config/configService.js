const ALLOWED_METHODS = ["ping", "snmp", "api", "mock"];

function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "item";
}

function uniqueId(base, taken) {
  let id = base;
  let n = 2;
  while (taken.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function allSiteIds(config) {
  return new Set(config.sites.map((s) => s.id));
}

function allDeviceIds(config) {
  return new Set(config.sites.flatMap((s) => s.devices.map((d) => d.id)));
}

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFoundError(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function findSite(config, siteId) {
  const site = config.sites.find((s) => s.id === siteId);
  if (!site) throw notFoundError(`site "${siteId}" not found`);
  return site;
}

function parseLat(value) {
  const lat = Number(value);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw validationError("lat must be a number between -90 and 90");
  }
  return lat;
}

function parseLon(value) {
  const lon = Number(value);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw validationError("lon must be a number between -180 and 180");
  }
  return lon;
}

// name is { en?, he? } — at least one language is required, the other is
// optional (the client falls back to whichever is set when displaying).
function normalizeName(input) {
  const name = {};
  if (typeof input?.en === "string" && input.en.trim()) name.en = input.en.trim();
  if (typeof input?.he === "string" && input.he.trim()) name.he = input.he.trim();
  if (!name.en && !name.he) throw validationError("name (English or Hebrew) is required");
  return name;
}

function nameSlugBase(name) {
  return name.en || name.he || "";
}

// Consecutive failed checks required before a device flips to "down" —
// anti-flapping for real checks (ping/snmp/api). Omitted/blank falls back
// to the server's global default (FAIL_THRESHOLD env var). Not applicable
// to mock, whose transitions are driven by the event scheduler, not by
// repeated checker calls.
function parseFailThreshold(src, cfg) {
  if (src.failThreshold !== undefined && src.failThreshold !== "") {
    const n = Math.round(Number(src.failThreshold));
    if (Number.isFinite(n) && n >= 1) cfg.failThreshold = n;
  }
}

function buildMethodConfig(method, input) {
  if (method === "ping") {
    const src = input.ping || {};
    const cfg = {};
    if (src.timeoutMs !== undefined && src.timeoutMs !== "") cfg.timeoutMs = Number(src.timeoutMs);
    parseFailThreshold(src, cfg);
    return { ping: cfg };
  }
  if (method === "snmp") {
    const src = input.snmp || {};
    const cfg = {
      community: src.community || "public",
      version: src.version === "1" ? "1" : "2c",
      oid: src.oid || "1.3.6.1.2.1.1.3.0",
      port: src.port !== undefined && src.port !== "" ? Number(src.port) : 161,
    };
    if (src.timeoutMs !== undefined && src.timeoutMs !== "") cfg.timeoutMs = Number(src.timeoutMs);
    parseFailThreshold(src, cfg);
    return { snmp: cfg };
  }
  if (method === "api") {
    const src = input.api || {};
    const cfg = {
      method: src.method || "GET",
      expectedStatus: src.expectedStatus !== undefined && src.expectedStatus !== "" ? Number(src.expectedStatus) : 200,
    };
    if (src.jsonPath) cfg.jsonPath = src.jsonPath;
    if (src.expectedValue !== undefined && src.expectedValue !== "") cfg.expectedValue = src.expectedValue;
    if (src.timeoutMs !== undefined && src.timeoutMs !== "") cfg.timeoutMs = Number(src.timeoutMs);
    parseFailThreshold(src, cfg);
    return { api: cfg };
  }
  if (method === "mock") {
    const src = input.mock || {};
    const cfg = {};
    if (src.upProbability !== undefined && src.upProbability !== "") {
      cfg.upProbability = Math.min(1, Math.max(0, Number(src.upProbability)));
    }
    return { mock: cfg };
  }
  return {};
}

export function addSite(config, input) {
  const name = normalizeName(input.name);
  const lat = parseLat(input.lat);
  const lon = parseLon(input.lon);

  const id = uniqueId(input.id ? slugify(input.id) : slugify(nameSlugBase(name)), allSiteIds(config));
  const site = { id, name, lat, lon, devices: [] };
  config.sites.push(site);
  return site;
}

export function updateSite(config, siteId, input) {
  const site = findSite(config, siteId);
  if (input.name !== undefined) {
    site.name = normalizeName(input.name);
  }
  if (input.lat !== undefined) site.lat = parseLat(input.lat);
  if (input.lon !== undefined) site.lon = parseLon(input.lon);
  return site;
}

export function deleteSite(config, siteId) {
  const idx = config.sites.findIndex((s) => s.id === siteId);
  if (idx === -1) throw notFoundError(`site "${siteId}" not found`);
  const [removed] = config.sites.splice(idx, 1);
  return removed;
}

export function addDevice(config, siteId, input) {
  const site = findSite(config, siteId);
  const name = normalizeName(input.name);
  const method = input.method;
  if (!ALLOWED_METHODS.includes(method)) {
    throw validationError(`method must be one of ${ALLOWED_METHODS.join(", ")}`);
  }
  const target = (input.target || "").trim();
  if (!target) throw validationError("target is required");

  const id = uniqueId(input.id ? slugify(input.id) : slugify(`${siteId}-${nameSlugBase(name)}`), allDeviceIds(config));
  const device = {
    id,
    name,
    type: (input.type || "device").trim() || "device",
    method,
    target,
    ...buildMethodConfig(method, input),
  };
  site.devices.push(device);
  return device;
}

export function updateDevice(config, siteId, deviceId, input) {
  const site = findSite(config, siteId);
  const device = site.devices.find((d) => d.id === deviceId);
  if (!device) throw notFoundError(`device "${deviceId}" not found in site "${siteId}"`);

  const name = input.name !== undefined ? normalizeName(input.name) : device.name;

  const type = input.type !== undefined ? input.type.trim() || "device" : device.type;

  const target = input.target !== undefined ? input.target.trim() : device.target;
  if (!target) throw validationError("target cannot be empty");

  const method = input.method !== undefined ? input.method : device.method;
  if (!ALLOWED_METHODS.includes(method)) {
    throw validationError(`method must be one of ${ALLOWED_METHODS.join(", ")}`);
  }

  // Fall back to the device's existing method config when the request
  // doesn't include one (e.g. a plain rename), so it isn't reset to defaults.
  const methodInput = { [method]: input[method] ?? (method === device.method ? device[method] : undefined) };

  device.name = name;
  device.type = type;
  device.target = target;
  device.method = method;
  delete device.ping;
  delete device.snmp;
  delete device.api;
  Object.assign(device, buildMethodConfig(method, methodInput));

  return device;
}

export function deleteDevice(config, siteId, deviceId) {
  const site = findSite(config, siteId);
  const idx = site.devices.findIndex((d) => d.id === deviceId);
  if (idx === -1) throw notFoundError(`device "${deviceId}" not found in site "${siteId}"`);
  const [removed] = site.devices.splice(idx, 1);
  return removed;
}
