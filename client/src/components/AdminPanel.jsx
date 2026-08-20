import React, { useState } from "react";
import * as api from "../api.js";
import { TYPE_ICONS } from "../format.js";

const EMPTY_SITE_FORM = { id: null, name: "", lat: "", lon: "" };

const EMPTY_METHOD_DEFAULTS = {
  ping: { timeoutMs: 3000 },
  snmp: { community: "public", version: "2c", oid: "1.3.6.1.2.1.1.3.0", port: 161, timeoutMs: 3000 },
  api: { method: "GET", expectedStatus: 200, jsonPath: "", expectedValue: "", timeoutMs: 5000 },
  mock: { upProbability: 0.95 },
};

function emptyDeviceForm() {
  return {
    id: null,
    name: "",
    type: "router",
    method: "ping",
    target: "",
    ping: { ...EMPTY_METHOD_DEFAULTS.ping },
    snmp: { ...EMPTY_METHOD_DEFAULTS.snmp },
    api: { ...EMPTY_METHOD_DEFAULTS.api },
    mock: { ...EMPTY_METHOD_DEFAULTS.mock },
  };
}

export default function AdminPanel({
  sites,
  selectedSite,
  onClose,
  onSelectSite,
  onSiteCreated,
  onRequestPickLocation,
  canUndo,
  undoBusy,
  onUndo,
}) {
  const [siteForm, setSiteForm] = useState(null);
  const [deviceForm, setDeviceForm] = useState(null);
  const [error, setError] = useState("");

  function startAddSite() {
    setSiteForm({ ...EMPTY_SITE_FORM });
    setError("");
  }
  function startEditSite(site) {
    setSiteForm({ id: site.id, name: site.name, lat: site.lat, lon: site.lon });
    setError("");
  }
  async function submitSite(e) {
    e.preventDefault();
    setError("");
    try {
      if (siteForm.id) {
        await api.updateSite(siteForm.id, { name: siteForm.name, lat: siteForm.lat, lon: siteForm.lon });
      } else {
        const created = await api.createSite({ name: siteForm.name, lat: siteForm.lat, lon: siteForm.lon });
        onSiteCreated?.(created.id);
      }
      setSiteForm(null);
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeSite(site) {
    if (!confirm(`Delete site "${site.name}" and its ${site.devices.length} device(s)?`)) return;
    setError("");
    try {
      await api.deleteSite(site.id);
    } catch (err) {
      setError(err.message);
    }
  }

  function startAddDevice() {
    setDeviceForm(emptyDeviceForm());
    setError("");
  }
  function startEditDevice(device) {
    setDeviceForm({
      id: device.id,
      name: device.name,
      type: device.type,
      method: device.method,
      target: device.target,
      ping: { ...EMPTY_METHOD_DEFAULTS.ping, ...device.ping },
      snmp: { ...EMPTY_METHOD_DEFAULTS.snmp, ...device.snmp },
      api: { ...EMPTY_METHOD_DEFAULTS.api, ...device.api },
      mock: { ...EMPTY_METHOD_DEFAULTS.mock, ...device.mock },
    });
    setError("");
  }
  async function submitDevice(e) {
    e.preventDefault();
    setError("");
    const payload = {
      name: deviceForm.name,
      type: deviceForm.type,
      method: deviceForm.method,
      target: deviceForm.target,
      [deviceForm.method]: deviceForm[deviceForm.method],
    };
    try {
      if (deviceForm.id) {
        await api.updateDevice(selectedSite.id, deviceForm.id, payload);
      } else {
        await api.createDevice(selectedSite.id, payload);
      }
      setDeviceForm(null);
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeDevice(device) {
    if (!confirm(`Delete device "${device.name}"?`)) return;
    setError("");
    try {
      await api.deleteDevice(selectedSite.id, device.id);
    } catch (err) {
      setError(err.message);
    }
  }

  function pickLocationFor(setter) {
    onRequestPickLocation((lat, lon) => {
      setter((f) => ({ ...f, lat: lat.toFixed(5), lon: lon.toFixed(5) }));
    });
  }

  return (
    <aside className="sidebar admin-panel">
      <div className="admin-header">
        <h2>Manage inventory</h2>
        <div className="admin-header-actions">
          <button className="btn-undo" onClick={onUndo} disabled={!canUndo || undoBusy}>
            Undo
          </button>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <section>
        <div className="admin-section-header">
          <h3>Sites</h3>
          <button className="btn-small" onClick={startAddSite}>
            + Add site
          </button>
        </div>
        <ul className="admin-list">
          {sites.map((site) => (
            <li key={site.id} className={site.id === selectedSite?.id ? "active" : ""}>
              <span className="admin-list-name" onClick={() => onSelectSite(site.id)}>
                {site.name}
              </span>
              <span className="admin-list-meta">
                {site.lat.toFixed(3)}, {site.lon.toFixed(3)} &middot; {site.devices.length} devices
              </span>
              <span className="admin-list-actions">
                <button onClick={() => startEditSite(site)}>Edit</button>
                <button onClick={() => removeSite(site)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>

        {siteForm && (
          <form className="admin-form" onSubmit={submitSite}>
            <label>
              Name
              <input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} required />
            </label>
            <div className="form-row">
              <label>
                Lat
                <input
                  type="number"
                  step="any"
                  value={siteForm.lat}
                  onChange={(e) => setSiteForm({ ...siteForm, lat: e.target.value })}
                  required
                />
              </label>
              <label>
                Lon
                <input
                  type="number"
                  step="any"
                  value={siteForm.lon}
                  onChange={(e) => setSiteForm({ ...siteForm, lon: e.target.value })}
                  required
                />
              </label>
            </div>
            <button type="button" className="btn-pick" onClick={() => pickLocationFor(setSiteForm)}>
              Pick on map
            </button>
            <div className="form-actions">
              <button type="submit">{siteForm.id ? "Save" : "Add"}</button>
              <button type="button" onClick={() => setSiteForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <div className="admin-section-header">
          <h3>Devices {selectedSite ? `— ${selectedSite.name}` : ""}</h3>
          {selectedSite && (
            <button className="btn-small" onClick={startAddDevice}>
              + Add device
            </button>
          )}
        </div>

        {!selectedSite && <p className="admin-hint">Select a site above to manage its devices.</p>}

        {selectedSite && (
          <ul className="admin-list">
            {selectedSite.devices.map((device) => (
              <li key={device.id}>
                <span className="admin-list-name">
                  {TYPE_ICONS[device.type] || "•"} {device.name}
                </span>
                <span className="admin-list-meta">
                  {device.method.toUpperCase()} &middot; {device.target}
                </span>
                <span className="admin-list-actions">
                  <button onClick={() => startEditDevice(device)}>Edit</button>
                  <button onClick={() => removeDevice(device)}>Delete</button>
                </span>
              </li>
            ))}
            {selectedSite.devices.length === 0 && <li className="admin-hint">No devices yet.</li>}
          </ul>
        )}

        {deviceForm && (
          <form className="admin-form" onSubmit={submitDevice}>
            <label>
              Name
              <input value={deviceForm.name} onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} required />
            </label>
            <label>
              Type
              <input
                value={deviceForm.type}
                onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                placeholder="router, camera, ptz-camera, sensor, power, roip, cellular-bts..."
              />
            </label>
            <label>
              Monitor via
              <select value={deviceForm.method} onChange={(e) => setDeviceForm({ ...deviceForm, method: e.target.value })}>
                <option value="ping">Ping</option>
                <option value="snmp">SNMP</option>
                <option value="api">API</option>
                <option value="mock">Mock (simulated)</option>
              </select>
            </label>
            <label>
              {deviceForm.method === "api" ? "URL" : deviceForm.method === "mock" ? "Reference target (label only)" : "Host / IP"}
              <input
                value={deviceForm.target}
                onChange={(e) => setDeviceForm({ ...deviceForm, target: e.target.value })}
                placeholder={deviceForm.method === "api" ? "https://..." : deviceForm.method === "mock" ? "e.g. simulated" : "192.168.1.10"}
                required
              />
            </label>

            {deviceForm.method === "ping" && (
              <label>
                Timeout (ms)
                <input
                  type="number"
                  value={deviceForm.ping.timeoutMs}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ping: { ...deviceForm.ping, timeoutMs: e.target.value } })}
                />
              </label>
            )}

            {deviceForm.method === "snmp" && (
              <>
                <div className="form-row">
                  <label>
                    Community
                    <input
                      value={deviceForm.snmp.community}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, community: e.target.value } })}
                    />
                  </label>
                  <label>
                    Version
                    <select
                      value={deviceForm.snmp.version}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, version: e.target.value } })}
                    >
                      <option value="2c">v2c</option>
                      <option value="1">v1</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    OID
                    <input
                      value={deviceForm.snmp.oid}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, oid: e.target.value } })}
                    />
                  </label>
                  <label>
                    Port
                    <input
                      type="number"
                      value={deviceForm.snmp.port}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, port: e.target.value } })}
                    />
                  </label>
                </div>
              </>
            )}

            {deviceForm.method === "api" && (
              <>
                <div className="form-row">
                  <label>
                    HTTP method
                    <select
                      value={deviceForm.api.method}
                      onChange={(e) => setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, method: e.target.value } })}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="HEAD">HEAD</option>
                    </select>
                  </label>
                  <label>
                    Expected status
                    <input
                      type="number"
                      value={deviceForm.api.expectedStatus}
                      onChange={(e) =>
                        setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, expectedStatus: e.target.value } })
                      }
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    JSON field (optional)
                    <input
                      value={deviceForm.api.jsonPath}
                      placeholder="e.g. status"
                      onChange={(e) => setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, jsonPath: e.target.value } })}
                    />
                  </label>
                  <label>
                    Expected value
                    <input
                      value={deviceForm.api.expectedValue}
                      placeholder="e.g. ok"
                      onChange={(e) =>
                        setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, expectedValue: e.target.value } })
                      }
                    />
                  </label>
                </div>
              </>
            )}

            {deviceForm.method === "mock" && (
              <label>
                Up probability (0–1)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={deviceForm.mock.upProbability}
                  onChange={(e) => setDeviceForm({ ...deviceForm, mock: { ...deviceForm.mock, upProbability: e.target.value } })}
                />
              </label>
            )}

            <div className="form-actions">
              <button type="submit">{deviceForm.id ? "Save" : "Add"}</button>
              <button type="button" onClick={() => setDeviceForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </aside>
  );
}
