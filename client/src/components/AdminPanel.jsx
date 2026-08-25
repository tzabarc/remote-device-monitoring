import React, { useEffect, useState } from "react";
import * as api from "../api.js";
import { TYPE_ICONS } from "../format.js";
import { t, localizedName } from "../i18n.js";

const EMPTY_SITE_FORM = { id: null, name: { en: "", he: "" }, lat: "", lon: "" };

const EMPTY_METHOD_DEFAULTS = {
  ping: { timeoutMs: 3000, failThreshold: "" },
  snmp: { community: "public", version: "2c", oid: "1.3.6.1.2.1.1.3.0", port: 161, timeoutMs: 3000, failThreshold: "" },
  api: { method: "GET", expectedStatus: 200, jsonPath: "", expectedValue: "", timeoutMs: 5000, failThreshold: "" },
  mock: { upProbability: 0.95 },
};

function emptyDeviceForm() {
  return {
    id: null,
    name: { en: "", he: "" },
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
  style,
  lang,
  settings,
  onUpdateSettings,
}) {
  const [siteForm, setSiteForm] = useState(null);
  const [deviceForm, setDeviceForm] = useState(null);
  const [error, setError] = useState("");
  const [failThresholdInput, setFailThresholdInput] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (settings) setFailThresholdInput(String(settings.failThreshold));
  }, [settings]);

  async function submitSettings(e) {
    e.preventDefault();
    setError("");
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      await onUpdateSettings({ failThreshold: failThresholdInput });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  function startAddSite() {
    setSiteForm({ ...EMPTY_SITE_FORM, name: { en: "", he: "" } });
    setError("");
  }
  function startEditSite(site) {
    setSiteForm({ id: site.id, name: { en: site.name?.en || "", he: site.name?.he || "" }, lat: site.lat, lon: site.lon });
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
    const name = localizedName(site.name, lang, site.id);
    if (!confirm(t(lang, "confirmDeleteSite", { name, count: site.devices.length }))) return;
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
      name: { en: device.name?.en || "", he: device.name?.he || "" },
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
    const name = localizedName(device.name, lang, device.id);
    if (!confirm(t(lang, "confirmDeleteDevice", { name }))) return;
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
    <aside className="sidebar admin-panel" style={style}>
      <div className="admin-header">
        <h2>{t(lang, "manageInventory")}</h2>
        <div className="admin-header-actions">
          <button className="btn-undo" onClick={onUndo} disabled={!canUndo || undoBusy}>
            {t(lang, "undo")}
          </button>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <section>
        <div className="admin-section-header">
          <h3>{t(lang, "globalSettings")}</h3>
        </div>
        <form className="admin-form admin-settings-form" onSubmit={submitSettings}>
          <label>
            {t(lang, "defaultFailThreshold")}
            <input
              type="number"
              min="1"
              value={failThresholdInput}
              onChange={(e) => setFailThresholdInput(e.target.value)}
              disabled={!settings}
            />
          </label>
          <p className="admin-hint">
            {settings?.failThresholdIsDefault
              ? t(lang, "usingEnvDefault", { value: settings.envDefault })
              : t(lang, "usingCustomDefault")}
          </p>
          <div className="form-actions">
            <button type="submit" disabled={!settings || settingsSaving}>
              {settingsSaving ? t(lang, "saving") : t(lang, "save")}
            </button>
            {settingsSaved && <span className="admin-settings-saved">{t(lang, "saved")}</span>}
          </div>
        </form>
      </section>

      <section>
        <div className="admin-section-header">
          <h3>{t(lang, "sites")}</h3>
          <button className="btn-small" onClick={startAddSite}>
            {t(lang, "addSite")}
          </button>
        </div>
        <ul className="admin-list">
          {sites.map((site) => (
            <li key={site.id} className={site.id === selectedSite?.id ? "active" : ""}>
              <span className="admin-list-name" onClick={() => onSelectSite(site.id)}>
                {localizedName(site.name, lang, site.id)}
              </span>
              <span className="admin-list-meta">
                {site.lat.toFixed(3)}, {site.lon.toFixed(3)} &middot; {t(lang, "deviceCount", { count: site.devices.length })}
              </span>
              <span className="admin-list-actions">
                <button onClick={() => startEditSite(site)}>{t(lang, "edit")}</button>
                <button onClick={() => removeSite(site)}>{t(lang, "delete")}</button>
              </span>
            </li>
          ))}
        </ul>

        {siteForm && (
          <form className="admin-form" onSubmit={submitSite}>
            <label>
              {t(lang, "nameEn")}
              <input
                value={siteForm.name.en}
                onChange={(e) => setSiteForm({ ...siteForm, name: { ...siteForm.name, en: e.target.value } })}
              />
            </label>
            <label>
              {t(lang, "nameHe")}
              <input
                dir="rtl"
                value={siteForm.name.he}
                onChange={(e) => setSiteForm({ ...siteForm, name: { ...siteForm.name, he: e.target.value } })}
              />
            </label>
            <div className="form-row">
              <label>
                {t(lang, "lat")}
                <input
                  type="number"
                  step="any"
                  value={siteForm.lat}
                  onChange={(e) => setSiteForm({ ...siteForm, lat: e.target.value })}
                  required
                />
              </label>
              <label>
                {t(lang, "lon")}
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
              {t(lang, "pickOnMap")}
            </button>
            <div className="form-actions">
              <button type="submit">{siteForm.id ? t(lang, "save") : t(lang, "add")}</button>
              <button type="button" onClick={() => setSiteForm(null)}>
                {t(lang, "cancel")}
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <div className="admin-section-header">
          <h3>{t(lang, "devicesForSite", { site: selectedSite ? localizedName(selectedSite.name, lang, selectedSite.id) : "" })}</h3>
          {selectedSite && (
            <button className="btn-small" onClick={startAddDevice}>
              {t(lang, "addDevice")}
            </button>
          )}
        </div>

        {!selectedSite && <p className="admin-hint">{t(lang, "selectSiteHint")}</p>}

        {selectedSite && (
          <ul className="admin-list">
            {selectedSite.devices.map((device) => (
              <li key={device.id}>
                <span className="admin-list-name">
                  {TYPE_ICONS[device.type] || "•"} {localizedName(device.name, lang, device.id)}
                </span>
                <span className="admin-list-meta">
                  {device.method.toUpperCase()} &middot; {device.target}
                </span>
                <span className="admin-list-actions">
                  <button onClick={() => startEditDevice(device)}>{t(lang, "edit")}</button>
                  <button onClick={() => removeDevice(device)}>{t(lang, "delete")}</button>
                </span>
              </li>
            ))}
            {selectedSite.devices.length === 0 && <li className="admin-hint">{t(lang, "noDevicesYet")}</li>}
          </ul>
        )}

        {deviceForm && (
          <form className="admin-form" onSubmit={submitDevice}>
            <label>
              {t(lang, "nameEn")}
              <input
                value={deviceForm.name.en}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: { ...deviceForm.name, en: e.target.value } })}
              />
            </label>
            <label>
              {t(lang, "nameHe")}
              <input
                dir="rtl"
                value={deviceForm.name.he}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: { ...deviceForm.name, he: e.target.value } })}
              />
            </label>
            <label>
              {t(lang, "type")}
              <input
                value={deviceForm.type}
                onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                placeholder="router, camera, ptz-camera, sensor, power, roip, cellular-bts..."
              />
            </label>
            <label>
              {t(lang, "monitorVia")}
              <select value={deviceForm.method} onChange={(e) => setDeviceForm({ ...deviceForm, method: e.target.value })}>
                <option value="ping">{t(lang, "methodPing")}</option>
                <option value="snmp">{t(lang, "methodSnmp")}</option>
                <option value="api">{t(lang, "methodApi")}</option>
                <option value="mock">{t(lang, "methodMock")}</option>
              </select>
            </label>
            <label>
              {deviceForm.method === "api" ? t(lang, "targetUrl") : deviceForm.method === "mock" ? t(lang, "targetMockLabel") : t(lang, "targetHostIp")}
              <input
                value={deviceForm.target}
                onChange={(e) => setDeviceForm({ ...deviceForm, target: e.target.value })}
                placeholder={deviceForm.method === "api" ? "https://..." : deviceForm.method === "mock" ? "e.g. simulated" : "192.168.1.10"}
                required
              />
            </label>

            {deviceForm.method === "ping" && (
              <div className="form-row">
                <label>
                  {t(lang, "timeoutMs")}
                  <input
                    type="number"
                    value={deviceForm.ping.timeoutMs}
                    onChange={(e) => setDeviceForm({ ...deviceForm, ping: { ...deviceForm.ping, timeoutMs: e.target.value } })}
                  />
                </label>
                <label>
                  {t(lang, "failThreshold")}
                  <input
                    type="number"
                    min="1"
                    placeholder={t(lang, "failThresholdPlaceholder")}
                    value={deviceForm.ping.failThreshold}
                    onChange={(e) => setDeviceForm({ ...deviceForm, ping: { ...deviceForm.ping, failThreshold: e.target.value } })}
                  />
                </label>
              </div>
            )}

            {deviceForm.method === "snmp" && (
              <>
                <div className="form-row">
                  <label>
                    {t(lang, "community")}
                    <input
                      value={deviceForm.snmp.community}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, community: e.target.value } })}
                    />
                  </label>
                  <label>
                    {t(lang, "version")}
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
                    {t(lang, "oid")}
                    <input
                      value={deviceForm.snmp.oid}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, oid: e.target.value } })}
                    />
                  </label>
                  <label>
                    {t(lang, "port")}
                    <input
                      type="number"
                      value={deviceForm.snmp.port}
                      onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, port: e.target.value } })}
                    />
                  </label>
                </div>
                <label>
                  {t(lang, "failThreshold")}
                  <input
                    type="number"
                    min="1"
                    placeholder={t(lang, "failThresholdPlaceholder")}
                    value={deviceForm.snmp.failThreshold}
                    onChange={(e) => setDeviceForm({ ...deviceForm, snmp: { ...deviceForm.snmp, failThreshold: e.target.value } })}
                  />
                </label>
              </>
            )}

            {deviceForm.method === "api" && (
              <>
                <div className="form-row">
                  <label>
                    {t(lang, "httpMethod")}
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
                    {t(lang, "expectedStatus")}
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
                    {t(lang, "jsonFieldOptional")}
                    <input
                      value={deviceForm.api.jsonPath}
                      placeholder="e.g. status"
                      onChange={(e) => setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, jsonPath: e.target.value } })}
                    />
                  </label>
                  <label>
                    {t(lang, "expectedValue")}
                    <input
                      value={deviceForm.api.expectedValue}
                      placeholder="e.g. ok"
                      onChange={(e) =>
                        setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, expectedValue: e.target.value } })
                      }
                    />
                  </label>
                </div>
                <label>
                  {t(lang, "failThreshold")}
                  <input
                    type="number"
                    min="1"
                    placeholder={t(lang, "failThresholdPlaceholder")}
                    value={deviceForm.api.failThreshold}
                    onChange={(e) => setDeviceForm({ ...deviceForm, api: { ...deviceForm.api, failThreshold: e.target.value } })}
                  />
                </label>
              </>
            )}

            {deviceForm.method === "mock" && (
              <label>
                {t(lang, "upProbability")}
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
              <button type="submit">{deviceForm.id ? t(lang, "save") : t(lang, "add")}</button>
              <button type="button" onClick={() => setDeviceForm(null)}>
                {t(lang, "cancel")}
              </button>
            </div>
          </form>
        )}
      </section>
    </aside>
  );
}
