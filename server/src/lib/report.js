import { queryEvents, lastEventBefore } from "./eventLog.js";

// Buckets are sized to land close to ~24 slices across the requested range,
// snapped to a "nice" unit so a bar chart of event volume stays legible
// whether the report covers an hour or a month.
const NICE_BUCKET_UNITS_MS = [
  60e3,
  5 * 60e3,
  15 * 60e3,
  30 * 60e3,
  3600e3,
  6 * 3600e3,
  12 * 3600e3,
  24 * 3600e3,
  7 * 24 * 3600e3,
];

function bucketEvents(events, fromISO, toISO) {
  const fromMs = new Date(fromISO).getTime();
  const toMs = new Date(toISO).getTime();
  const rangeMs = Math.max(1, toMs - fromMs);
  const rawBucketMs = Math.ceil(rangeMs / 24);
  const bucketMs = NICE_BUCKET_UNITS_MS.find((u) => u >= rawBucketMs) || NICE_BUCKET_UNITS_MS.at(-1);

  const buckets = [];
  for (let t = fromMs; t < toMs; t += bucketMs) {
    buckets.push({ start: new Date(t).toISOString(), end: new Date(Math.min(t + bucketMs, toMs)).toISOString(), up: 0, down: 0 });
  }
  if (buckets.length === 0) buckets.push({ start: fromISO, end: toISO, up: 0, down: 0 });

  for (const e of events) {
    const t = new Date(e.at).getTime();
    let idx = Math.floor((t - fromMs) / bucketMs);
    if (idx < 0) idx = 0;
    if (idx >= buckets.length) idx = buckets.length - 1;
    if (e.to === "up") buckets[idx].up++;
    else if (e.to === "down") buckets[idx].down++;
  }
  return buckets;
}

// Reconstructs each device's up/down/unknown timeline across the report
// window from its baseline status (the last event before the window
// started, if any) plus the events that fall inside it, so uptime% is
// accurate even for devices with zero events in range (e.g. down the whole
// time, or up the whole time).
function buildDeviceTimeline(device, events, rangeFrom, rangeTo, currentStatus) {
  const baseline = lastEventBefore(device.id, rangeFrom);
  const deviceEvents = events.filter((e) => e.deviceId === device.id);

  // No recorded event before the window start: fall back to whatever the
  // device was just before its first in-range change, or — if it never
  // changed at all in recorded history — its current live status, on the
  // assumption a device that's never flapped has been steady the whole
  // time. Only truly unrecorded devices (brand new, no data at all) stay
  // "unknown".
  let status;
  if (baseline) status = baseline.to;
  else if (deviceEvents.length > 0) status = deviceEvents[0].from;
  else status = currentStatus === "up" || currentStatus === "down" ? currentStatus : null;

  const segments = [];
  let cursor = rangeFrom;
  for (const e of deviceEvents) {
    segments.push({ status, from: cursor, to: e.at });
    cursor = e.at;
    status = e.to;
  }
  segments.push({ status, from: cursor, to: rangeTo });

  let upMs = 0;
  let downMs = 0;
  let unknownMs = 0;
  for (const seg of segments) {
    const dur = new Date(seg.to) - new Date(seg.from);
    if (dur <= 0) continue;
    if (seg.status === "up") upMs += dur;
    else if (seg.status === "down") downMs += dur;
    else unknownMs += dur;
  }
  const totalMs = upMs + downMs + unknownMs;
  const knownMs = upMs + downMs;

  return {
    segments,
    upMs,
    downMs,
    unknownMs,
    totalMs,
    uptimePct: knownMs > 0 ? (upMs / knownMs) * 100 : null,
    downEvents: deviceEvents.filter((e) => e.to === "down").length,
    upEvents: deviceEvents.filter((e) => e.to === "up").length,
    events: deviceEvents,
  };
}

export function buildReport({ config, store, siteIds = [], deviceIds = [], from, to }) {
  const now = new Date().toISOString();
  const rangeFrom = from || new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const rangeTo = to || now;

  const siteIdSet = siteIds.length > 0 ? new Set(siteIds) : null;
  const deviceIdSet = deviceIds.length > 0 ? new Set(deviceIds) : null;

  const allDevices = config.sites.flatMap((site) =>
    site.devices.map((device) => ({ ...device, siteId: site.id, siteName: site.name }))
  );
  const selectedDevices = allDevices.filter((d) => {
    if (siteIdSet && !siteIdSet.has(d.siteId)) return false;
    if (deviceIdSet && !deviceIdSet.has(d.id)) return false;
    return true;
  });

  const selectedDeviceIds = new Set(selectedDevices.map((d) => d.id));
  const events = queryEvents({ deviceIds: selectedDeviceIds, from: rangeFrom, to: rangeTo });

  const perDevice = selectedDevices.map((device) => {
    const currentStatus = store.getStatus(device.id)?.status || "unknown";
    const timeline = buildDeviceTimeline(device, events, rangeFrom, rangeTo, currentStatus);
    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      method: device.method,
      siteId: device.siteId,
      siteName: device.siteName,
      currentStatus,
      ...timeline,
    };
  });

  const totalUpMs = perDevice.reduce((sum, d) => sum + d.upMs, 0);
  const totalKnownMs = perDevice.reduce((sum, d) => sum + d.upMs + d.downMs, 0);

  const summary = {
    from: rangeFrom,
    to: rangeTo,
    deviceCount: selectedDevices.length,
    siteCount: new Set(selectedDevices.map((d) => d.siteId)).size,
    totalEvents: events.length,
    downEvents: events.filter((e) => e.to === "down").length,
    upEvents: events.filter((e) => e.to === "up").length,
    overallUptimePct: totalKnownMs > 0 ? (totalUpMs / totalKnownMs) * 100 : null,
  };

  return {
    summary,
    perDevice: perDevice.sort((a, b) => (a.uptimePct ?? 101) - (b.uptimePct ?? 101)),
    events,
    buckets: bucketEvents(events, rangeFrom, rangeTo),
  };
}
