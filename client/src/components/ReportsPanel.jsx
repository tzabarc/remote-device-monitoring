import React, { useEffect, useState } from "react";
import { getReport } from "../api.js";
import { TYPE_ICONS, formatIsraelDateTime } from "../format.js";

const PRESETS = [
  { key: "1h", label: "1h", hours: 1 },
  { key: "6h", label: "6h", hours: 6 },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
];

function computeRange(preset, customFrom, customTo) {
  if (preset === "custom") {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(customTo).toISOString() : undefined,
    };
  }
  const p = PRESETS.find((p) => p.key === preset) || PRESETS[2];
  return { from: new Date(Date.now() - p.hours * 3600 * 1000).toISOString(), to: new Date().toISOString() };
}

function pct(n) {
  return n == null ? "—" : `${n.toFixed(1)}%`;
}

function uptimeClass(pctVal) {
  if (pctVal == null) return "unknown";
  if (pctVal >= 99) return "up";
  if (pctVal >= 95) return "warn";
  return "down";
}

function EventVolumeChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.up + b.down));
  return (
    <div className="report-chart">
      {buckets.map((b, i) => (
        <div
          className="report-chart-col"
          key={i}
          title={`${formatIsraelDateTime(b.start)} — ${b.up} up, ${b.down} down`}
        >
          <div className="report-chart-bars">
            <div className="report-bar report-bar-up" style={{ height: `${(b.up / max) * 100}%` }} />
            <div className="report-bar report-bar-down" style={{ height: `${(b.down / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DeviceTimeline({ device, rangeFrom, rangeTo }) {
  const totalMs = new Date(rangeTo) - new Date(rangeFrom);
  return (
    <div className="report-timeline-row">
      <div className="report-timeline-info">
        <span className="report-timeline-icon">{TYPE_ICONS[device.deviceType] || "•"}</span>
        <div className="report-timeline-names">
          <div className="report-timeline-device">{device.deviceName}</div>
          <div className="report-timeline-site">{device.siteName}</div>
        </div>
      </div>
      <div className="report-timeline-bar">
        {device.segments.map((seg, i) => {
          const dur = new Date(seg.to) - new Date(seg.from);
          const widthPct = totalMs > 0 ? (dur / totalMs) * 100 : 0;
          if (widthPct <= 0) return null;
          return (
            <div
              key={i}
              className={`report-segment report-segment-${seg.status || "unknown"}`}
              style={{ width: `${widthPct}%` }}
              title={`${seg.status || "unknown"}: ${formatIsraelDateTime(seg.from)} – ${formatIsraelDateTime(seg.to)}`}
            />
          );
        })}
      </div>
      <div className={`report-timeline-pct report-pct-${uptimeClass(device.uptimePct)}`}>{pct(device.uptimePct)}</div>
    </div>
  );
}

export default function ReportsPanel({ sites, onClose }) {
  const [selectedSiteIds, setSelectedSiteIds] = useState(() => new Set());
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(() => new Set());
  const [preset, setPreset] = useState("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = computeRange(preset, customFrom, customTo);
      const result = await getReport({
        siteIds: [...selectedSiteIds],
        deviceIds: [...selectedDeviceIds],
        from,
        to,
      });
      setReport(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSite(id) {
    setSelectedSiteIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDevice(id) {
    setSelectedDeviceIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    if (!report) return;
    const rows = [["Time", "Site", "Device", "From", "To"]];
    for (const e of report.events) {
      const device = report.perDevice.find((d) => d.deviceId === e.deviceId);
      rows.push([formatIsraelDateTime(e.at), device?.siteName || e.siteId, device?.deviceName || e.deviceId, e.from, e.to]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tzabtor-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="reports-backdrop" onClick={onClose}>
      <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reports-header">
          <h2>Reports</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="reports-body">
          <div className="reports-filters">
            <div className="reports-filter-group">
              <div className="reports-filter-label">Time frame</div>
              <div className="reports-preset-row">
                {PRESETS.map((p) => (
                  <button key={p.key} className={preset === p.key ? "active" : ""} onClick={() => setPreset(p.key)}>
                    {p.label}
                  </button>
                ))}
                <button className={preset === "custom" ? "active" : ""} onClick={() => setPreset("custom")}>
                  Custom
                </button>
              </div>
              {preset === "custom" && (
                <div className="reports-custom-range">
                  <label>
                    From
                    <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  </label>
                  <label>
                    To
                    <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                  </label>
                </div>
              )}
            </div>

            <div className="reports-filter-group">
              <div className="reports-filter-label">
                Sites <span className="reports-filter-hint">(none = all)</span>
              </div>
              <div className="reports-chip-row">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    className={`reports-chip${selectedSiteIds.has(site.id) ? " active" : ""}`}
                    onClick={() => toggleSite(site.id)}
                  >
                    {site.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="reports-filter-group">
              <div className="reports-filter-label">
                Devices <span className="reports-filter-hint">(none = all)</span>
              </div>
              <div className="reports-device-list">
                {sites.map((site) => (
                  <div key={site.id} className="reports-device-site-group">
                    <div className="reports-device-site-name">{site.name}</div>
                    {site.devices.map((device) => (
                      <label key={device.id} className="reports-device-checkbox">
                        <input type="checkbox" checked={selectedDeviceIds.has(device.id)} onChange={() => toggleDevice(device.id)} />
                        <span className="reports-device-icon">{TYPE_ICONS[device.type] || "•"}</span>
                        {device.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button className="reports-generate-btn" onClick={generate} disabled={loading}>
              {loading ? "Generating…" : "Generate report"}
            </button>
          </div>

          <div className="reports-results">
            {error && <div className="admin-error">{error}</div>}
            {!report && !error && <div className="reports-empty">Generating report…</div>}
            {report && (
              <>
                <div className="reports-summary-cards">
                  <div className="reports-card">
                    <div className="reports-card-value">{report.summary.deviceCount}</div>
                    <div className="reports-card-label">Devices</div>
                  </div>
                  <div className="reports-card">
                    <div className="reports-card-value">{report.summary.siteCount}</div>
                    <div className="reports-card-label">Sites</div>
                  </div>
                  <div className="reports-card">
                    <div className="reports-card-value">{report.summary.totalEvents}</div>
                    <div className="reports-card-label">Events</div>
                  </div>
                  <div className="reports-card">
                    <div className="reports-card-value report-pct-down">{report.summary.downEvents}</div>
                    <div className="reports-card-label">Down events</div>
                  </div>
                  <div className={`reports-card reports-card-${uptimeClass(report.summary.overallUptimePct)}`}>
                    <div className="reports-card-value">{pct(report.summary.overallUptimePct)}</div>
                    <div className="reports-card-label">Overall uptime</div>
                  </div>
                </div>

                <div className="reports-section">
                  <div className="reports-section-header">
                    <h3>Event volume</h3>
                    <span className="reports-range-caption">
                      {formatIsraelDateTime(report.summary.from)} → {formatIsraelDateTime(report.summary.to)}
                    </span>
                  </div>
                  <EventVolumeChart buckets={report.buckets} />
                  <div className="reports-legend">
                    <span className="reports-legend-item">
                      <span className="reports-legend-dot report-segment-up" /> Up
                    </span>
                    <span className="reports-legend-item">
                      <span className="reports-legend-dot report-segment-down" /> Down
                    </span>
                  </div>
                </div>

                <div className="reports-section">
                  <h3>Device timelines</h3>
                  <div className="reports-timeline-list">
                    {report.perDevice.map((d) => (
                      <DeviceTimeline key={d.deviceId} device={d} rangeFrom={report.summary.from} rangeTo={report.summary.to} />
                    ))}
                    {report.perDevice.length === 0 && <div className="reports-empty">No devices match the current filters.</div>}
                  </div>
                </div>

                <div className="reports-section">
                  <div className="reports-section-header">
                    <h3>Events ({report.events.length})</h3>
                    {report.events.length > 0 && (
                      <button className="reports-export-btn" onClick={exportCsv}>
                        Export CSV
                      </button>
                    )}
                  </div>
                  <div className="reports-events-table">
                    <div className="reports-events-row reports-events-head">
                      <span>Time</span>
                      <span>Site</span>
                      <span>Device</span>
                      <span>Change</span>
                    </div>
                    {[...report.events]
                      .reverse()
                      .slice(0, 200)
                      .map((e) => {
                        const device = report.perDevice.find((d) => d.deviceId === e.deviceId);
                        return (
                          <div className="reports-events-row" key={e.id}>
                            <span>{formatIsraelDateTime(e.at)}</span>
                            <span>{device?.siteName || e.siteId}</span>
                            <span>{device?.deviceName || e.deviceId}</span>
                            <span className={`reports-events-change report-pct-${e.to === "up" ? "up" : "down"}`}>
                              {e.from} → {e.to}
                            </span>
                          </div>
                        );
                      })}
                    {report.events.length === 0 && <div className="reports-empty">No events in this range.</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
