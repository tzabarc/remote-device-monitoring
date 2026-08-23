import React, { useEffect, useRef, useState } from "react";
import StatusDot from "./StatusDot.jsx";
import TypeFilter from "./TypeFilter.jsx";
import { TYPE_ICONS, displayMethod, formatIsraelTime } from "../format.js";

const DEFAULT_SITE_LIST_HEIGHT = 240;
const MIN_SITE_LIST_HEIGHT = 80;
const MIN_DEVICE_LIST_HEIGHT = 120;
const HANDLE_HEIGHT = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
  style,
}) {
  const [siteListHeight, setSiteListHeight] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebarSiteListHeight");
      // Number(null) is 0, not NaN — an explicit null check is needed or a
      // never-set value would silently clamp to MIN_SITE_LIST_HEIGHT instead
      // of falling through to the real default below.
      if (raw != null) {
        const stored = Number(raw);
        if (Number.isFinite(stored)) return Math.max(stored, MIN_SITE_LIST_HEIGHT);
      }
    } catch {
      // localStorage unavailable — use default.
    }
    return DEFAULT_SITE_LIST_HEIGHT;
  });
  const siteListHeightRef = useRef(siteListHeight);
  const siteListRef = useRef(null);
  const asideRef = useRef(null);
  const resizingRef = useRef(false);

  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    document.body.classList.add("resizing-sidebar-height");
  }

  useEffect(() => {
    function onMove(e) {
      if (!resizingRef.current || !siteListRef.current || !asideRef.current) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const top = siteListRef.current.getBoundingClientRect().top;
      const asideBottom = asideRef.current.getBoundingClientRect().bottom;
      const maxHeight = asideBottom - top - HANDLE_HEIGHT - MIN_DEVICE_LIST_HEIGHT;
      const next = clamp(clientY - top, MIN_SITE_LIST_HEIGHT, Math.max(MIN_SITE_LIST_HEIGHT, maxHeight));
      siteListHeightRef.current = next;
      setSiteListHeight(next);
    }
    function onUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.classList.remove("resizing-sidebar-height");
      try {
        localStorage.setItem("sidebarSiteListHeight", String(siteListHeightRef.current));
      } catch {
        // localStorage unavailable — resize still works this session.
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <aside className="sidebar" style={style} ref={asideRef}>
      <TypeFilter types={deviceTypes} selected={typeFilter} onToggle={onToggleType} onClear={onClearTypeFilter} />

      <section className="site-list" style={{ height: siteListHeight }} ref={siteListRef}>
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

      <div
        className="resize-handle-h"
        onMouseDown={startResize}
        onTouchStart={startResize}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize site list"
      />

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
