import React, { useState } from "react";
import { TYPE_ICONS, formatIsraelDateTime } from "../format.js";

function Row({ n, onMarkRead }) {
  return (
    <div className={`activity-log-row log-${n.to}${n.read ? "" : " unread"}`} onClick={() => onMarkRead(n.id)}>
      <span className="log-time">{n.checkedAt ? formatIsraelDateTime(n.checkedAt) : ""}</span>
      <span className="log-icon">{TYPE_ICONS[n.deviceType] || "•"}</span>
      <span className="log-text">
        <strong>{n.siteName}</strong> · {n.deviceName}
        {n.method && <span className="log-method">&nbsp;({n.method})</span>}
      </span>
      <span className="log-direction">{n.to === "up" ? "UP" : n.to === "down" ? "DOWN" : n.to.toUpperCase()}</span>
    </div>
  );
}

export default function ActivityLog({ notifications, statuses, typeFilter, onMarkAllRead, onMarkRead }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState("all"); // "all" | "unread" | "unresolved"

  const typed = typeFilter && typeFilter.size > 0 ? notifications.filter((n) => typeFilter.has(n.deviceType)) : notifications;

  // The single most-recent "down" entry for each device that is still
  // currently down (typed is newest-first, so the first match per device
  // is its latest). Once the device recovers, a newer "up" entry takes
  // over as its latest, so the old "down" entry stops counting as
  // unresolved automatically.
  const unresolvedIds = new Set();
  const seenDevice = new Set();
  for (const n of typed) {
    if (n.deviceId && !seenDevice.has(n.deviceId)) {
      seenDevice.add(n.deviceId);
      if (n.to === "down" && statuses?.[n.deviceId]?.status === "down") {
        unresolvedIds.add(n.id);
      }
    }
  }

  const unreadCount = typed.filter((n) => !n.read).length;
  const unresolvedCount = unresolvedIds.size;

  let visible;
  if (mode === "unread") visible = typed.filter((n) => !n.read);
  else if (mode === "unresolved") visible = typed.filter((n) => unresolvedIds.has(n.id));
  else visible = typed;

  const pinned = visible.filter((n) => unresolvedIds.has(n.id));
  const rest = visible.filter((n) => !unresolvedIds.has(n.id));

  const emptyMessage =
    mode === "unread" ? "Nothing unread." : mode === "unresolved" ? "Nothing unresolved." : "No status changes yet.";

  return (
    <div className={`activity-log${collapsed ? " collapsed" : ""}`}>
      <div className="activity-log-header" onClick={() => setCollapsed((v) => !v)}>
        <span>Event Log{typed.length > 0 ? ` (${typed.length})` : ""}</span>
        <span className="activity-log-toggle">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <div className="activity-log-toolbar">
            <div className="activity-log-modes">
              <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>
                All
              </button>
              <button className={mode === "unread" ? "active" : ""} onClick={() => setMode("unread")}>
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
              <button className={mode === "unresolved" ? "active" : ""} onClick={() => setMode("unresolved")}>
                Unresolved{unresolvedCount > 0 ? ` (${unresolvedCount})` : ""}
              </button>
            </div>
            {unreadCount > 0 && (
              <button className="activity-log-mark-all" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="activity-log-body">
            {visible.length === 0 ? (
              <div className="activity-log-empty">{emptyMessage}</div>
            ) : (
              <>
                {pinned.map((n) => (
                  <Row key={n.id} n={n} onMarkRead={onMarkRead} />
                ))}
                {pinned.length > 0 && rest.length > 0 && <div className="activity-log-divider" />}
                {rest.map((n) => (
                  <Row key={n.id} n={n} onMarkRead={onMarkRead} />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
