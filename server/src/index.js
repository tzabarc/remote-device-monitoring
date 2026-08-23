import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import { getConfig, loadConfig, saveConfig, watchConfig } from "./config/configLoader.js";
import { store } from "./store.js";
import { createPoller } from "./lib/poller.js";
import { createMockEventScheduler } from "./lib/mockEventScheduler.js";
import { addSite, updateSite, deleteSite, addDevice, updateDevice, deleteDevice } from "./config/configService.js";
import { buildReport } from "./lib/report.js";
import { recentEvents } from "./lib/eventLog.js";

const PORT = process.env.PORT || 4000;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);
const MOCK_EVENT_MIN_MS = Number(process.env.MOCK_EVENT_MIN_MS || 4000);
const MOCK_EVENT_MAX_MS = Number(process.env.MOCK_EVENT_MAX_MS || 50000);

loadConfig();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const poller = createPoller({
  getConfig,
  store,
  intervalMs: POLL_INTERVAL_MS,
  onUpdate: (all) => io.emit("status:full", all),
  onEvent: (event) => io.emit("event:new", event),
});

const mockEvents = createMockEventScheduler({
  getConfig,
  store,
  onUpdate: (all) => io.emit("status:full", all),
  onEvent: (event) => io.emit("event:new", event),
  minMs: MOCK_EVENT_MIN_MS,
  maxMs: MOCK_EVENT_MAX_MS,
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, pollIntervalMs: POLL_INTERVAL_MS });
});

app.get("/api/sites", (req, res) => {
  res.json(getConfig().sites);
});

app.get("/api/status", (req, res) => {
  res.json(store.getAll());
});

app.post("/api/poll-now", async (req, res) => {
  await poller.pollOnce();
  res.json({ ok: true });
});

app.get("/api/report", (req, res) => {
  try {
    const siteIds = req.query.siteIds ? String(req.query.siteIds).split(",").filter(Boolean) : [];
    const deviceIds = req.query.deviceIds ? String(req.query.deviceIds).split(",").filter(Boolean) : [];
    const from = req.query.from ? new Date(String(req.query.from)).toISOString() : undefined;
    const to = req.query.to ? new Date(String(req.query.to)).toISOString() : undefined;
    const report = buildReport({ config: getConfig(), store, siteIds, deviceIds, from, to });
    res.json({ ok: true, result: report });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

function persistAndBroadcast() {
  const config = getConfig();
  saveConfig(config);
  io.emit("sites", config.sites);
}

const MAX_HISTORY = 20;
const history = [];

function pushHistory(snapshot) {
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  io.emit("undo:available", history.length > 0);
}

// Wraps a synchronous config mutation: snapshots the pre-mutation config
// (for undo), persists + broadcasts the new inventory, then kicks an
// async poll cycle so the UI gets fresh status for the changed device(s)
// without waiting for the next scheduled tick.
function mutation(fn) {
  return (req, res) => {
    try {
      const before = JSON.parse(JSON.stringify(getConfig()));
      const result = fn(req);
      pushHistory(before);
      persistAndBroadcast();
      res.json({ ok: true, result });
      poller.pollOnce();
    } catch (err) {
      res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  };
}

app.post("/api/sites", mutation((req) => addSite(getConfig(), req.body)));

app.put("/api/sites/:siteId", mutation((req) => updateSite(getConfig(), req.params.siteId, req.body)));

app.delete(
  "/api/sites/:siteId",
  mutation((req) => {
    const removed = deleteSite(getConfig(), req.params.siteId);
    removed.devices.forEach((d) => store.deleteStatus(d.id));
    return removed;
  })
);

app.post(
  "/api/sites/:siteId/devices",
  mutation((req) => addDevice(getConfig(), req.params.siteId, req.body))
);

app.put(
  "/api/sites/:siteId/devices/:deviceId",
  mutation((req) => updateDevice(getConfig(), req.params.siteId, req.params.deviceId, req.body))
);

app.delete(
  "/api/sites/:siteId/devices/:deviceId",
  mutation((req) => {
    const removed = deleteDevice(getConfig(), req.params.siteId, req.params.deviceId);
    store.deleteStatus(removed.id);
    return removed;
  })
);

app.post("/api/undo", (req, res) => {
  if (history.length === 0) {
    res.status(400).json({ ok: false, error: "nothing to undo" });
    return;
  }
  const previous = history.pop();
  const validDeviceIds = new Set(previous.sites.flatMap((s) => s.devices.map((d) => d.id)));
  store.deleteMissing(validDeviceIds);
  saveConfig(previous);
  io.emit("sites", previous.sites);
  io.emit("undo:available", history.length > 0);
  res.json({ ok: true, result: previous.sites });
  poller.pollOnce();
});

io.on("connection", (socket) => {
  socket.emit("sites", getConfig().sites);
  socket.emit("status:full", store.getAll());
  socket.emit("undo:available", history.length > 0);
  socket.emit("events:recent", recentEvents(50));
});

watchConfig((config) => {
  io.emit("sites", config.sites);
});

// In production, serve the built client so this single process handles
// both the API/WebSocket and the web UI. In dev, the client runs
// separately under Vite (see README), and client/dist won't exist yet.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "../../client/dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

poller.start();
mockEvents.start();

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Polling every ${POLL_INTERVAL_MS}ms`);
  console.log(`Mock status-change events every ${MOCK_EVENT_MIN_MS}-${MOCK_EVENT_MAX_MS}ms`);
});
