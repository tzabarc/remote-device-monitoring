import React, { useEffect, useRef, useState } from "react";
import StatusDot from "./StatusDot.jsx";
import TypeFilter from "./TypeFilter.jsx";
import { TYPE_ICONS, displayMethod, formatIsraelTime } from "../format.js";
import { t, localizedName } from "../i18n.js";

const DEFAULT_SITE_LIST_HEIGHT = 240;
const MIN_SITE_LIST_HEIGHT = 80;
const MIN_DEVICE_LIST_HEIGHT = 120;
const HANDLE_HEIGHT = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function SiteDeviceCount({ site, statuses, lang }) {
  const total = site.devices.length;
  const downCount = site.devices.filter((d) => (statuses[d.id]?.status || "unknown") === "down").length;
  const pendingCount = site.devices.filter((d) => !!statuses[d.id]?.pendingFailures).length;
  const pendingSuffix = pendingCount > 0 && (
    <span className="site-pending-count"> · {t(lang, "pendingCount", { count: pendingCount })}</span>
  );
  if (downCount > 0) {
    return (
      <span className="device-count">
        <span className="site-down-count">{downCount}</span>/{total} {t(lang, "statusDown")}
        {pendingSuffix}
      </span>
    );
  }
  return (
    <span className="device-count">
      {t(lang, "deviceCount", { count: total })}
      {pendingSuffix}
    </span>
  );
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
  lang,
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
      <TypeFilter types={deviceTypes} selected={typeFilter} onToggle={onToggleType} onClear={onClearTypeFilter} lang={lang} />

      <section className="site-list" style={{ height: siteListHeight }} ref={siteListRef}>
        <h2>{t(lang, "sites")}</h2>
        <ul>
          {sites.map((site) => (
            <li
              key={site.id}
              className={site.id === selectedSite?.id ? "active" : ""}
              onClick={() => onSelectSite(site.id)}
            >
              <StatusDot status={site.status} hideLabel lang={lang} pending={site.pending && site.status !== "down"} />
              <span className="site-name">{localizedName(site.name, lang, site.id)}</span>
              <SiteDeviceCount site={site} statuses={statuses} lang={lang} />
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
        <h2>{selectedSite ? localizedName(selectedSite.name, lang, selectedSite.id) : t(lang, "selectASite")}</h2>
        {selectedSite && (
          <table>
            <thead>
              <tr>
                <th>{t(lang, "colDevice")}</th>
                <th>{t(lang, "colMethod")}</th>
                <th>{t(lang, "colStatus")}</th>
                <th>{t(lang, "colLastCheck")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedSite.devices.map((device) => {
                const s = statuses[device.id] || {};
                return (
                  <tr key={device.id}>
                    <td>
                      <span className="device-icon">{TYPE_ICONS[device.type] || "•"}</span>
                      {localizedName(device.name, lang, device.id)}
                      <div className="device-target">{device.target}</div>
                    </td>
                    <td>{displayMethod(device, lang)}</td>
                    <td>
                      <StatusDot status={s.status || "unknown"} lang={lang} pending={!!s.pendingFailures} />
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
