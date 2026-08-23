import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import ActivityLog from "./components/ActivityLog.jsx";
import TypeFilter from "./components/TypeFilter.jsx";
import AboutModal from "./components/AboutModal.jsx";
import { socket } from "./socket.js";
import * as api from "./api.js";
import { playUpSound, playDownSound, unlockAudio } from "./sound.js";
import { displayMethod } from "./format.js";

const PULSE_DURATION_MS = 3000;

function deviceStatus(statuses, deviceId) {
  return statuses[deviceId]?.status || "unknown";
}

function siteStatus(site, statuses) {
  const states = site.devices.map((d) => deviceStatus(statuses, d.id));
  if (states.some((s) => s === "down")) return "down";
  if (states.some((s) => s === "unknown")) return "unknown";
  return "up";
}

export default function App() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [locationPicker, setLocationPicker] = useState(null); // (lat, lon) => void, or null
  const [canUndo, setCanUndo] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("soundMuted") === "1";
    } catch {
      return false;
    }
  });
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // localStorage unavailable — fall through to system preference.
    }
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  const [pulsingSites, setPulsingSites] = useState(() => new Set());

  const deviceIndex = useMemo(() => {
    const idx = {};
    for (const site of sites) {
      for (const device of site.devices) {
        idx[device.id] = {
          deviceName: device.name,
          siteName: site.name,
          deviceType: device.type,
          siteId: site.id,
          method: displayMethod(device),
        };
      }
    }
    return idx;
  }, [sites]);

  // Refs so the socket handlers (registered once, below) always see the
  // latest values without re-subscribing on every sites/status change.
  const deviceIndexRef = useRef(deviceIndex);
  useEffect(() => {
    deviceIndexRef.current = deviceIndex;
  }, [deviceIndex]);

  const prevStatusesRef = useRef(null); // null until the first snapshot loads

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  // Unlock the AudioContext on the very first user interaction anywhere on
  // the page, since status-change sounds are triggered later from a socket
  // event, not a click, and browsers won't let audio play otherwise.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const pulseSite = useCallback((siteId) => {
    setPulsingSites((cur) => {
      const next = new Set(cur);
      next.add(siteId);
      return next;
    });
    setTimeout(() => {
      setPulsingSites((cur) => {
        const next = new Set(cur);
        next.delete(siteId);
        return next;
      });
    }, PULSE_DURATION_MS);
  }, []);

  function toggleMuted() {
    setMuted((cur) => {
      const next = !cur;
      try {
        localStorage.setItem("soundMuted", next ? "1" : "0");
      } catch {
        // localStorage unavailable (e.g. private browsing) — mute still works this session.
      }
      return next;
    });
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((cur) => {
      const next = cur === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", next);
      } catch {
        // localStorage unavailable (e.g. private browsing) — theme still works this session.
      }
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then(setSites);
    fetch("/api/status")
      .then((r) => r.json())
      .then((initial) => {
        prevStatusesRef.current = initial;
        setStatuses(initial);
      });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onStatusFull = (newStatuses) => {
      const prev = prevStatusesRef.current;
      if (prev) {
        const changes = [];
        for (const [deviceId, s] of Object.entries(newStatuses)) {
          const prevStatus = prev[deviceId]?.status;
          if (prevStatus && prevStatus !== s.status) {
            const info = deviceIndexRef.current[deviceId] || {};
            changes.push({
              id: `${deviceId}-${s.checkedAt}`,
              deviceId,
              deviceName: info.deviceName || deviceId,
              siteName: info.siteName || "",
              deviceType: info.deviceType,
              siteId: info.siteId,
              method: info.method,
              from: prevStatus,
              to: s.status,
              checkedAt: s.checkedAt,
              read: false,
            });
          }
        }
        if (changes.length > 0) {
          setNotifications((cur) => [...changes, ...cur].slice(0, 50));
          for (const siteId of new Set(changes.map((c) => c.siteId).filter(Boolean))) {
            pulseSite(siteId);
          }
          if (!mutedRef.current) {
            const hasDown = changes.some((c) => c.to === "down");
            const hasUp = changes.some((c) => c.to === "up");
            if (hasDown) playDownSound();
            if (hasUp) playUpSound(hasDown ? 0.5 : 0);
          }
        }
      }
      prevStatusesRef.current = newStatuses;
      setStatuses(newStatuses);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sites", setSites);
    socket.on("status:full", onStatusFull);
    socket.on("undo:available", setCanUndo);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sites", setSites);
      socket.off("status:full", onStatusFull);
      socket.off("undo:available", setCanUndo);
    };
  }, []);

  const sitesWithStatus = useMemo(
    () => sites.map((site) => ({ ...site, status: siteStatus(site, statuses) })),
    [sites, statuses]
  );

  const deviceTypes = useMemo(() => {
    const set = new Set();
    for (const site of sites) {
      for (const device of site.devices) set.add(device.type);
    }
    return [...set].sort();
  }, [sites]);

  // The view (map + sidebar) respects the type filter; Manage mode always
  // operates on the full, unfiltered inventory so it's never hindered by
  // an active view filter.
  const filteredSites = useMemo(() => {
    if (typeFilter.size === 0) return sitesWithStatus;
    return sitesWithStatus
      .map((site) => {
        const devices = site.devices.filter((d) => typeFilter.has(d.type));
        return { ...site, devices, status: siteStatus({ devices }, statuses) };
      })
      .filter((site) => site.devices.length > 0);
  }, [sitesWithStatus, typeFilter, statuses]);

  function toggleTypeFilter(type) {
    setTypeFilter((cur) => {
      const next = new Set(cur);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function clearTypeFilter() {
    setTypeFilter(new Set());
  }

  const selectedSite = sitesWithStatus.find((s) => s.id === selectedSiteId) || null;
  const selectedSiteFiltered = filteredSites.find((s) => s.id === selectedSiteId) || null;

  function handleMapClick(lat, lon) {
    if (locationPicker) {
      locationPicker(lat, lon);
      setLocationPicker(null);
    }
  }

  function requestPickLocation(callback) {
    setLocationPicker(() => callback);
  }

  async function handleUndo() {
    if (!canUndo || undoBusy) return;
    setUndoBusy(true);
    try {
      await api.undo();
    } catch (err) {
      console.error("Undo failed:", err.message);
    } finally {
      setUndoBusy(false);
    }
  }

  return (
    <div className="app">
      <ActivityLog
        notifications={notifications}
        statuses={statuses}
        typeFilter={typeFilter}
        onMarkAllRead={markAllNotificationsRead}
        onMarkRead={markNotificationRead}
      />
      <header className="app-header">
        <h1>Tzabtor - Remote devices monitoring</h1>
        <div className="app-header-right">
          <span className={`conn-pill ${connected ? "conn-up" : "conn-down"}`}>
            {connected ? "live" : "disconnected"}
          </span>
          <button
            className="btn-mute"
            onClick={toggleMuted}
            title={muted ? "Unmute status-change sounds" : "Mute status-change sounds"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            className="btn-theme"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            className="btn-manage"
            onClick={() => {
              setAdminOpen((v) => !v);
              setLocationPicker(null);
            }}
          >
            {adminOpen ? "Close manage" : "Manage"}
          </button>
          <button className="btn-about" onClick={() => setAboutOpen(true)} title="About" aria-label="About">
            ℹ️
          </button>
        </div>
      </header>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <div className="app-body">
        <MapView
          sites={filteredSites}
          statuses={statuses}
          selectedSiteId={selectedSiteId}
          onSelectSite={setSelectedSiteId}
          onSiteCreated={(id) => setSelectedSiteId(id)}
          pickingActive={!!locationPicker}
          onMapClick={handleMapClick}
          adminOpen={adminOpen}
          pulsingSites={pulsingSites}
        />
        {adminOpen ? (
          <AdminPanel
            sites={sitesWithStatus}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSiteId}
            onSiteCreated={(id) => setSelectedSiteId(id)}
            onRequestPickLocation={requestPickLocation}
            canUndo={canUndo}
            undoBusy={undoBusy}
            onUndo={handleUndo}
            onClose={() => {
              setAdminOpen(false);
              setLocationPicker(null);
            }}
          />
        ) : (
          <Sidebar
            sites={filteredSites}
            statuses={statuses}
            selectedSite={selectedSiteFiltered}
            onSelectSite={setSelectedSiteId}
            deviceTypes={deviceTypes}
            typeFilter={typeFilter}
            onToggleType={toggleTypeFilter}
            onClearTypeFilter={clearTypeFilter}
          />
        )}
      </div>
    </div>
  );
}
