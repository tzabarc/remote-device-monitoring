# Tzabtor

A NOC-style dashboard: it monitors devices across several sites (via ping,
SNMP, or HTTP API checks), shows them on a satellite map color-coded by
status, keeps a live activity log of status changes, and can generate
visual uptime reports over any time frame and device/site selection.

**Live demo**: https://remote-device-monitoring.onrender.com (free-tier
instance — may take a few seconds to wake up if idle).

## Features

- **Live map** — satellite imagery with Hebrew place labels, sites
  color-coded by worst device status, pulse animation on status changes,
  hover card listing a site's devices.
- **Activity log** — a running log of status changes with All/Unread/
  Unresolved modes, still-down devices pinned to the top, sounds (mutable)
  for up/down events, and per-row read tracking.
- **Reports** — pick any combination of sites/devices and a time frame
  (presets or custom range) to get summary stats, an event-volume chart,
  per-device uptime timelines, and a filterable/exportable events table.
- **Manage mode** — add/edit/delete sites and devices from the UI, with
  undo for the last 20 changes.
- **Dark/light theme**, **fullscreen**, and a **mobile view** with a
  Map/Sites/Events tab bar.
- **English/Hebrew UI** — a language toggle translates the whole interface;
  site and device names can have an English and/or Hebrew value each, with
  the other language used as a fallback when one is left blank.

## Stack

- **Server**: Node.js + Express + Socket.IO. A background poller runs every
  `POLL_INTERVAL_MS` (default 15s), checks every device, stores the latest
  result in memory, and pushes updates to connected browsers over
  WebSockets. Every real status transition is also appended to a small
  persisted event log (`server/data/events.json`) that powers Reports.
- **Client**: React + Vite + react-leaflet (Esri satellite tiles + Hebrew
  label overlay).
- **Inventory**: a single YAML file (`server/src/config/sites.yaml`) — no
  database. Edit it and the server hot-reloads it automatically.

## Setup

Requires Node.js 18+ (needs built-in `fetch`).

```bash
cd tzabtor
npm install          # installs both workspaces (server + client)
npm run dev           # runs server on :4000 and client on :5173
```

Open http://localhost:5173.

Run them separately if you prefer:

```bash
npm run dev -w server   # http://localhost:4000
npm run dev -w client   # http://localhost:5173 (proxies /api and /socket.io to :4000)
```

## Managing sites & devices from the UI

Click **Manage** in the header to add/edit/delete sites and devices without
touching any files:

- **Sites**: add a site (name + lat/lon, or click "Pick on map" and then
  click anywhere on the map to set the coordinates), edit, or delete —
  deleting a site removes its devices too.
- **Devices**: select a site, then add/edit/delete its devices — name,
  type, monitoring method (ping/SNMP/API), target, and all the
  method-specific fields (SNMP community/version/OID/port, API
  method/expected status/JSON field check, timeouts).

Changes are written straight to `server/src/config/sites.yaml`, broadcast
live to every connected browser, and trigger an immediate status check for
the whole inventory so you see results right away instead of waiting for
the next poll cycle.

**Caveat**: saving from the UI rewrites the entire YAML file, which strips
any hand-written comments in it (including the ones in the shipped
example). Fine for day-to-day use — just don't rely on comments in this
file surviving a UI edit.

## Configuring sites & devices by hand

You can also edit `server/src/config/sites.yaml` directly — the server
hot-reloads it on save. Each site has `id`, `name`, `lat`, `lon`, and a
list of `devices`. Each device needs:

- `id`, `name`, `type` (free text, e.g. `router`, `camera`, `sensor`)
- `method`: `ping` | `snmp` | `api`
- `target`: hostname/IP (ping, snmp) or full URL (api)
- an optional block matching the method (`ping:`, `snmp:`, `api:`) for
  timeouts, SNMP community/OID/version, or API expected status/JSON field.

`name` (on both sites and devices) is `{ en: "...", he: "..." }` — at least
one language is required, the other is optional and falls back to whichever
is set when the UI's selected language doesn't have a value.

`ping`/`snmp`/`api` devices also accept an optional `failThreshold` (e.g.
`ping: { failThreshold: 3 }`) — the number of *consecutive* failed checks
required before the device flips to "down", to absorb transient packet loss
or network jitter instead of alerting on a single bad check. Omitted falls
back to the server's `FAIL_THRESHOLD` env var (default `3`). Recovery is
always immediate on the first successful check. Not applicable to `mock`
devices, whose transitions are driven by the simulated event scheduler.

The shipped config uses:
- **Placeholder coordinates**: approximate public locations of a few
  Israeli towns (Sderot, Netivot, Kfar Aza, Nahal Oz, Kerem Shalom) —
  swap in your real site list.
- **Placeholder targets**: the `192.0.2.0/24` documentation range (RFC
  5737), which is unroutable, so those devices will correctly show as
  "down" until you replace them with real hosts.

The server watches the file and pushes the new inventory to all connected
clients without a restart.

## API

- `GET /api/sites` — site + device inventory
- `GET /api/status` — latest status per device id
- `POST /api/poll-now` — trigger an immediate check cycle
- `GET /api/health` — liveness + configured poll interval
- `POST /api/sites` — create a site `{ name, lat, lon }`
- `PUT /api/sites/:siteId` — update a site (any of `name`, `lat`, `lon`)
- `DELETE /api/sites/:siteId` — delete a site and its devices
- `POST /api/sites/:siteId/devices` — add a device `{ name, type, method, target, ping|snmp|api }`
- `PUT /api/sites/:siteId/devices/:deviceId` — update a device
- `DELETE /api/sites/:siteId/devices/:deviceId` — delete a device
- `GET /api/report?siteIds=&deviceIds=&from=&to=` — report for the given
  filters (comma-separated ids, ISO timestamps; all optional): summary
  stats, per-device uptime timelines, and the matching events
- `POST /api/undo` — revert the last config change
- WebSocket events: `sites`, `status:full`, `undo:available`

## Deploying

This is a single Node process: in production it builds the React client
and serves it (plus the API and WebSocket) from the same Express server,
so it deploys as one service — no separate static host needed.

```bash
npm install
npm run build   # builds client/dist
npm start        # serves the API, WebSocket, and built client on $PORT
```

**Render** (recommended — free tier, no card required, handles
WebSockets): this repo includes a `render.yaml` blueprint.

1. Push your fork/clone to GitHub (already done if you're reading this
   from the repo).
2. On [render.com](https://render.com), sign in with GitHub, then
   **New → Blueprint**, pick this repo. Render reads `render.yaml` and
   sets the build/start commands automatically.
3. Deploy. Render gives you a public `https://<name>.onrender.com` URL.

No environment variables are required (`PORT` is set automatically by
Render). Optional overrides: `POLL_INTERVAL_MS`, `MOCK_EVENT_MIN_MS`,
`MOCK_EVENT_MAX_MS`, `FAIL_THRESHOLD` (see `server/src/index.js`).

**Note**: the free Render tier spins the service down after ~15 minutes
of inactivity and takes a few seconds to wake back up on the next
request — fine for a demo, not for a real monitoring deployment.

Any other platform that runs a persistent Node process with WebSocket
support works too (Railway, Fly.io, a VPS, etc.) — just run the same
`npm install && npm run build && npm start`.

## Status logic

- A device is `up`, `down`, or `unknown` (unrecognized method / no check
  run yet).
- A site's map color is the worst of its devices: `down` if any device is
  down, else `unknown` if any is unknown, else `up`.

## Notes / next steps

- **SNMP v1/v2c community strings are plaintext on the wire.** Fine on a
  trusted management VLAN; for anything internet-facing, use SNMPv3
  (`net-snmp` supports it) or tunnel over a VPN. This starter only wires
  up v1/v2c for simplicity.
- Live status is in-memory only (resets on server restart); the status-change
  history used by Reports is a flat JSON file (`server/data/events.json`),
  durable across restarts but reset on a fresh deploy. Swap it for
  SQLite/Postgres if you need real durability or alerting.
- No auth on the API/UI — add something (reverse proxy + basic auth, or a
  real auth layer) before exposing this beyond localhost/LAN.
- Ping requires the host running the server to be able to shell out to the
  system `ping` binary and have raw-socket/ICMP permission (works
  out-of-the-box on macOS/Windows; on some locked-down Linux hosts you may
  need `setcap cap_net_raw+ep $(which ping)` or run as root).
