# Gaza-Border Site Monitor

A small NOC-style dashboard: it monitors devices across several sites (via
ping, SNMP, or HTTP API checks) and shows them on a map, color-coded by
status, with a live-updating device list per site.

## Stack

- **Server**: Node.js + Express + Socket.IO. A background poller runs every
  `POLL_INTERVAL_MS` (default 15s), checks every device, stores the latest
  result in memory, and pushes updates to connected browsers over
  WebSockets.
- **Client**: React + Vite + react-leaflet (OpenStreetMap tiles).
- **Inventory**: a single YAML file (`server/src/config/sites.yaml`) — no
  database. Edit it and the server hot-reloads it automatically.

## Setup

Requires Node.js 18+ (needs built-in `fetch`).

```bash
cd gaza-border-monitor
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

The shipped config uses:
- **Placeholder coordinates**: approximate public locations of a few
  communities along the Gaza border (Sderot, Netivot, Kfar Aza, Nahal Oz,
  Kerem Shalom) — swap in your real site list.
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
- WebSocket events: `sites`, `status:full`

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
- Status is in-memory only (resets on server restart). Swap `store.js` for
  SQLite/Postgres if you want history, alerting, or uptime graphs.
- No auth on the API/UI — add something (reverse proxy + basic auth, or a
  real auth layer) before exposing this beyond localhost/LAN.
- Ping requires the host running the server to be able to shell out to the
  system `ping` binary and have raw-socket/ICMP permission (works
  out-of-the-box on macOS/Windows; on some locked-down Linux hosts you may
  need `setcap cap_net_raw+ep $(which ping)` or run as root).
