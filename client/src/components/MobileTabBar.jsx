import React from "react";

export default function MobileTabBar({ active, onChange, unreadCount }) {
  return (
    <nav className="mobile-tabbar">
      <button className={active === "map" ? "active" : ""} onClick={() => onChange("map")}>
        <span className="tab-icon">🗺️</span>
        Map
      </button>
      <button className={active === "sites" ? "active" : ""} onClick={() => onChange("sites")}>
        <span className="tab-icon">📍</span>
        Sites
      </button>
      <button className={active === "events" ? "active" : ""} onClick={() => onChange("events")}>
        <span className="tab-icon">
          🔔
          {unreadCount > 0 && <span className="tab-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </span>
        Events
      </button>
    </nav>
  );
}
