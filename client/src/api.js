async function apiCall(url, options) {
  const res = await fetch(url, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `request failed (${res.status})`);
  }
  return data.result;
}

export function createSite(payload) {
  return apiCall("/api/sites", { method: "POST", body: payload });
}
export function updateSite(id, payload) {
  return apiCall(`/api/sites/${id}`, { method: "PUT", body: payload });
}
export function deleteSite(id) {
  return apiCall(`/api/sites/${id}`, { method: "DELETE" });
}
export function createDevice(siteId, payload) {
  return apiCall(`/api/sites/${siteId}/devices`, { method: "POST", body: payload });
}
export function updateDevice(siteId, deviceId, payload) {
  return apiCall(`/api/sites/${siteId}/devices/${deviceId}`, { method: "PUT", body: payload });
}
export function deleteDevice(siteId, deviceId) {
  return apiCall(`/api/sites/${siteId}/devices/${deviceId}`, { method: "DELETE" });
}
export function undo() {
  return apiCall("/api/undo", { method: "POST" });
}

export async function getSettings() {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error(`settings request failed (${res.status})`);
  return res.json();
}
export function updateSettings(payload) {
  return apiCall("/api/settings", { method: "PUT", body: payload });
}

export async function getReport({ siteIds, deviceIds, from, to }) {
  const params = new URLSearchParams();
  if (siteIds?.length) params.set("siteIds", siteIds.join(","));
  if (deviceIds?.length) params.set("deviceIds", deviceIds.join(","));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`/api/report?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `report request failed (${res.status})`);
  }
  return data.result;
}
