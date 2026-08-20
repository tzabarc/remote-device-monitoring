import React from "react";
import StatusDot from "./StatusDot.jsx";
import TypeFilter from "./TypeFilter.jsx";
import { TYPE_ICONS, displayMethod, formatIsraelTime } from "../format.js";

function SiteDeviceCount({ site, statuses }) {
  const total = site.devices.length;
  const downCount = site.devices.filter((d) => (statuses[d.id]?.status || "unknown") === "down").length;
  if (downCount > 0) {
    return (
      <span className="device-count">
        <span className="site-down-count">{downCount}</span>/{total} down
      </span>
    );
  }
  return <span className="device-count">{total} devices</span>;
}

export default function Sidebar({
  sites,
  statuses,
  selectedSite,
  onSelectSite,
  deviceTypes,
  typeFilter,
  onToggleType,
  onClearTypeFilter,
}) {
  return (
    <aside className="sidebar">
      <TypeFilter types={deviceTypes} selected={typeFilter} onToggle={onToggleType} onClear={onClearTypeFilter} />

      <section className="site-list">
        <h2>Sites</h2>
        <ul>
          {sites.map((site) => (
            <li
              key={site.id}
              className={site.id === selectedSite?.id ? "active" : ""}
              onClick={() => onSelectSite(site.id)}
            >
              <StatusDot status={site.status} hideLabel />
              <span className="site-name">{site.name}</span>
              <SiteDeviceCount site={site} statuses={statuses} />
            </li>
          ))}
        </ul>
      </section>

      <section className="device-list">
        <h2>{selectedSite ? selectedSite.name : "Select a site"}</h2>
        {selectedSite && (
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Method</th>
                <th>Status</th>
                <th>Last check</th>
              </tr>
            </thead>
            <tbody>
              {selectedSite.devices.map((device) => {
                const s = statuses[device.id] || {};
                return (
                  <tr key={device.id}>
                    <td>
                      <span className="device-icon">{TYPE_ICONS[device.type] || "•"}</span>
                      {device.name}
                      <div className="device-target">{device.target}</div>
                    </td>
                    <td>{displayMethod(device)}</td>
                    <td>
                      <StatusDot status={s.status || "unknown"} />
                    </td>
                    <td>{s.checkedAt ? formatIsraelTime(s.checkedAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </aside>
  );
}
