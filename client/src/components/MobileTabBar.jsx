import React from "react";
import { t } from "../i18n.js";

export default function MobileTabBar({ active, onChange, unreadCount, lang }) {
  return (
    <nav className="mobile-tabbar">
      <button className={active === "map" ? "active" : ""} onClick={() => onChange("map")}>
        <span className="tab-icon">🗺️</span>
        {t(lang, "tabMap")}
      </button>
      <button className={active === "sites" ? "active" : ""} onClick={() => onChange("sites")}>
        <span className="tab-icon">📍</span>
        {t(lang, "tabSites")}
      </button>
      <button className={active === "events" ? "active" : ""} onClick={() => onChange("events")}>
        <span className="tab-icon">
          🔔
          {unreadCount > 0 && <span className="tab-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </span>
        {t(lang, "tabEvents")}
      </button>
    </nav>
  );
}
