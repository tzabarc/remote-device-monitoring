import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Persists the status-change history used by the Reports feature. Kept as a
// flat JSON file (mirroring how sites.yaml is handled) rather than a real
// database, since this is a demo app — durable across restarts on the same
// disk, reset on a fresh deploy. Capped so it can't grow unbounded.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, "../../data/events.json");
const MAX_EVENTS = 20000;

let events = [];
let seq = 0;

function load() {
  try {
    const raw = fs.readFileSync(EVENTS_FILE, "utf8");
    events = JSON.parse(raw);
    seq = events.length;
  } catch {
    events = [];
  }
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdir(path.dirname(EVENTS_FILE), { recursive: true }, () => {
      fs.writeFile(EVENTS_FILE, JSON.stringify(events), () => {});
    });
  }, 2000);
}

load();

// Only call this for a *real* observed transition (previous status was
// definitively "up" or "down", not the initial "unknown" placeholder) —
// callers are responsible for that check so a device's very first-ever
// check doesn't get logged as a spurious "unknown -> up" event. Returns
// the stored event so the caller can broadcast it to connected clients —
// the event log is the single source of truth for "what happened", and
// every client (current tabs via broadcast, new tabs via recentEvents)
// sees the exact same data instead of each reconstructing its own view
// from status snapshots.
export function recordEvent({ deviceId, siteId, from, to, at }) {
  const event = { id: `${at}-${deviceId}-${seq++}`, deviceId, siteId, from, to, at };
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  scheduleSave();
  return event;
}

// The most recent `limit` events, oldest first (same order as queryEvents).
export function recentEvents(limit = 50) {
  return events.slice(-limit);
}

export function queryEvents({ deviceIds, siteIds, from, to } = {}) {
  return events
    .filter((e) => {
      if (deviceIds && deviceIds.size > 0 && !deviceIds.has(e.deviceId)) return false;
      if (siteIds && siteIds.size > 0 && !siteIds.has(e.siteId)) return false;
      if (from && e.at < from) return false;
      if (to && e.at > to) return false;
      return true;
    })
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

// The most recent event for a device at or before `at`, used to reconstruct
// what status a device was already in when a report window starts.
export function lastEventBefore(deviceId, at) {
  let best = null;
  for (const e of events) {
    if (e.deviceId !== deviceId || e.at > at) continue;
    if (!best || e.at > best.at) best = e;
  }
  return best;
}
