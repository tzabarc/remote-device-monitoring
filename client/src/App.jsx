import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import ActivityLog from "./components/ActivityLog.jsx";
import TypeFilter from "./components/TypeFilter.jsx";
import AboutModal from "./components/AboutModal.jsx";
import ReportsPanel from "./components/ReportsPanel.jsx";
import MobileTabBar from "./components/MobileTabBar.jsx";
import { socket } from "./socket.js";
import * as api from "./api.js";
import { playUpSound, playDownSound, unlockAudio } from "./sound.js";
import { displayMethod } from "./format.js";
import { t, localizedName } from "./i18n.js";

const PULSE_DURATION_MS = 8000;
const DEFAULT_SIDEBAR_WIDTH = 400;
const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 640;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deviceStatus(statuses, deviceId) {
  return statuses[deviceId]?.status || "unknown";
}

function siteStatus(site, statuses) {
  const states = site.devices.map((d) => deviceStatus(statuses, d.id));
  if (states.some((s) => s === "down")) return "down";
  if (states.some((s) => s === "unknown")) return "unknown";
  return "up";
}

// A device mid-anti-flapping-hold (failing checks but not yet past
// failThreshold) still reports its old status (usually "up") — this is a
// separate, purely visual signal so it can show a warning cue without
// affecting the up/down/unknown counts and aggregation above.
function sitePending(site, statuses) {
  return site.devices.some((d) => !!statuses[d.id]?.pendingFailures);
}

export default function App() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationPicker, setLocationPicker] = useState(null); // (lat, lon) => void, or null
  const [canUndo, setCanUndo] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [settings, setSettings] = useState(null); // { failThreshold, failThresholdIsDefault, envDefault } | null until loaded
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

  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem("lang");
      if (stored === "en" || stored === "he") return stored;
    } catch {
      // localStorage unavailable — default to English.
    }
    return "en";
  });

  const [pulsingSites, setPulsingSites] = useState(() => new Set());
  const [mobileTab, setMobileTab] = useState("map"); // "map" | "sites" | "events" — mobile only

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebarWidth");
      // Number(null) is 0, not NaN — an explicit null check is needed or a
      // never-set value would silently clamp to MIN_SIDEBAR_WIDTH instead
      // of falling through to the real default below.
      if (raw != null) {
        const stored = Number(raw);
        if (Number.isFinite(stored)) return clamp(stored, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
      }
    } catch {
      // localStorage unavailable — use default.
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const sidebarWidthRef = useRef(sidebarWidth);
  const resizingRef = useRef(false);

  const startSidebarResize = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.classList.add("resizing-sidebar");
  }, []);

  useEffect(() => {
    function onMove(e) {
      if (!resizingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const next = clamp(window.innerWidth - clientX, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
      sidebarWidthRef.current = next;
      setSidebarWidth(next);
    }
    function onUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.classList.remove("resizing-sidebar");
      try {
        localStorage.setItem("sidebarWidth", String(sidebarWidthRef.current));
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

  const deviceIndex = useMemo(() => {
    const idx = {};
    for (const site of sites) {
      for (const device of site.devices) {
        idx[device.id] = {
          deviceName: device.name,
          siteName: site.name,
          deviceType: device.type,
          siteId: site.id,
          method: displayMethod(device, lang),
        };
      }
    }
    return idx;
  }, [sites, lang]);

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const markAllNotificationsRead = useCallback(() => {
    try {
      localStorage.setItem("markAllReadAt", new Date().toISOString());
    } catch {
      // localStorage unavailable (e.g. private browsing) — read state still updates this session.
    }
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

  // Deliberately NOT setting dir="rtl" here: Unicode's own bidi algorithm
  // already shapes Hebrew text correctly character-by-character regardless
  // of container direction, but dir="rtl" on <html> also reverses every
  // flex container's layout order app-wide (map/sidebar swap sides, the
  // fixed-position event log panel ends up overlapping the sidebar) —
  // mirroring the whole layout for RTL is a much bigger, separate design
  // task than translating the UI text. lang is still updated for
  // accessibility/spell-check/font selection.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function toggleLang() {
    setLang((cur) => {
      const next = cur === "en" ? "he" : "en";
      try {
        localStorage.setItem("lang", next);
      } catch {
        // localStorage unavailable (e.g. private browsing) — language still switches this session.
      }
      return next;
    });
  }

  // Fullscreen can also be exited via Escape or the browser's own UI, not
  // just our button, so track real state via the event rather than a
  // simple toggle flag.
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.error("Failed to enter fullscreen:", err.message);
      });
    } else {
      document.exitFullscreen?.();
    }
  }

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then(setSites);
    fetch("/api/status").then((r) => r.json()).then(setStatuses);
    api.getSettings().then(setSettings).catch(() => {});

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    // The server is the source of truth for event history — every tab
    // starts from the same "recent events" snapshot on connect (so a
    // freshly opened tab isn't blank), and every subsequent event is
    // broadcast to all tabs identically, instead of each tab guessing at
    // history by diffing its own status snapshots.
    const onEventsRecent = (events) => {
      let markAllReadAt = null;
      try {
        markAllReadAt = localStorage.getItem("markAllReadAt");
      } catch {
        // localStorage unavailable — treat as if "mark all read" was never used.
      }
      setNotifications(
        events
          .slice()
          .reverse()
          .map((e) => ({ ...e, read: markAllReadAt ? e.at <= markAllReadAt : false }))
      );
    };

    const onEventNew = (event) => {
      setNotifications((cur) => [{ ...event, read: false }, ...cur].slice(0, 50));
      if (event.siteId) pulseSite(event.siteId);
      if (!mutedRef.current) {
        if (event.to === "down") playDownSound();
        else if (event.to === "up") playUpSound();
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sites", setSites);
    socket.on("status:full", setStatuses);
    socket.on("undo:available", setCanUndo);
    socket.on("events:recent", onEventsRecent);
    socket.on("event:new", onEventNew);
    socket.on("settings", setSettings);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sites", setSites);
      socket.off("status:full", setStatuses);
      socket.off("undo:available", setCanUndo);
      socket.off("events:recent", onEventsRecent);
      socket.off("event:new", onEventNew);
      socket.off("settings", setSettings);
    };
  }, []);

  const sitesWithStatus = useMemo(
    () => sites.map((site) => ({ ...site, status: siteStatus(site, statuses), pending: sitePending(site, statuses) })),
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
        return { ...site, devices, status: siteStatus({ devices }, statuses), pending: sitePending({ devices }, statuses) };
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

  // Notifications from the server carry only ids (deviceId/siteId); resolve
  // display info from the current inventory at render time rather than
  // baking it in on receipt, so it's correct regardless of whether `sites`
  // has loaded yet by the time an event arrives.
  const enrichedNotifications = useMemo(() => {
    return notifications.map((n) => {
      const info = deviceIndex[n.deviceId] || {};
      return {
        id: n.id,
        deviceId: n.deviceId,
        siteId: n.siteId || info.siteId,
        deviceName: localizedName(info.deviceName, lang, n.deviceId),
        siteName: localizedName(info.siteName, lang),
        deviceType: info.deviceType,
        method: info.method,
        from: n.from,
        to: n.to,
        checkedAt: n.at,
        read: n.read,
      };
    });
  }, [notifications, deviceIndex, lang]);

  // A device that was already down before the event log's most-recent-50
  // window (e.g. it's been down for a long time and churn pushed its
  // original down-event out) has no matching entry, so it would otherwise
  // be missing from the log entirely — including "Unresolved" mode — even
  // though it's actively down right now. Synthesize a stand-in entry for
  // any such device so the log always reflects live state.
  const notificationsForLog = useMemo(() => {
    const latestByDevice = new Map();
    for (const n of enrichedNotifications) {
      if (n.deviceId && !latestByDevice.has(n.deviceId)) latestByDevice.set(n.deviceId, n);
    }
    const ghosts = [];
    for (const [deviceId, s] of Object.entries(statuses)) {
      if (s.status !== "down") continue;
      const latest = latestByDevice.get(deviceId);
      if (latest && latest.to === "down") continue;
      const info = deviceIndex[deviceId];
      if (!info) continue;
      ghosts.push({
        id: `ghost-${deviceId}`,
        deviceId,
        deviceName: localizedName(info.deviceName, lang, deviceId),
        siteName: localizedName(info.siteName, lang),
        deviceType: info.deviceType,
        siteId: info.siteId,
        method: info.method,
        from: latest?.to,
        to: "down",
        checkedAt: s.checkedAt,
        read: true,
      });
    }
    if (ghosts.length === 0) return enrichedNotifications;
    return [...enrichedNotifications, ...ghosts].sort((a, b) => (a.checkedAt < b.checkedAt ? 1 : -1));
  }, [enrichedNotifications, statuses, deviceIndex, lang]);

  const selectedSite = sitesWithStatus.find((s) => s.id === selectedSiteId) || null;
  const selectedSiteFiltered = filteredSites.find((s) => s.id === selectedSiteId) || null;
  const unreadCount = notifications.filter((n) => !n.read).length;

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

  async function handleUpdateSettings(payload) {
    const result = await api.updateSettings(payload);
    setSettings(result);
    return result;
  }

  return (
    <div className="app" data-mobile-tab={mobileTab}>
      <ActivityLog
        notifications={notificationsForLog}
        statuses={statuses}
        typeFilter={typeFilter}
        onMarkAllRead={markAllNotificationsRead}
        onMarkRead={markNotificationRead}
        lang={lang}
      />
      <header className="app-header">
        <h1>{t(lang, "appTitle")}</h1>
        <div className="app-header-right">
          <span className={`conn-pill ${connected ? "conn-up" : "conn-down"}`}>
            {connected ? t(lang, "live") : t(lang, "disconnected")}
          </span>
          <button
            className="btn-mute"
            onClick={toggleMuted}
            title={muted ? t(lang, "unmuteTitle") : t(lang, "muteTitle")}
            aria-label={muted ? t(lang, "unmute") : t(lang, "mute")}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            className="btn-theme"
            onClick={toggleTheme}
            title={theme === "dark" ? t(lang, "themeToLight") : t(lang, "themeToDark")}
            aria-label={theme === "dark" ? t(lang, "themeToLight") : t(lang, "themeToDark")}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="btn-lang" onClick={toggleLang} title={t(lang, "langToggleTitle")} aria-label={t(lang, "langToggleTitle")}>
            {lang === "en" ? "HE" : "EN"}
          </button>
          <button className="btn-reports" onClick={() => setReportsOpen(true)} title={t(lang, "reports")} aria-label={t(lang, "reports")}>
            📊
          </button>
          <button className="btn-about" onClick={() => setAboutOpen(true)} title={t(lang, "about")} aria-label={t(lang, "about")}>
            ℹ️
          </button>
          <button
            className="btn-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? t(lang, "exitFullscreen") : t(lang, "enterFullscreen")}
            aria-label={isFullscreen ? t(lang, "exitFullscreen") : t(lang, "enterFullscreen")}
          >
            ⛶
          </button>
          <button
            className="btn-manage"
            onClick={() => {
              setAdminOpen((v) => !v);
              setLocationPicker(null);
            }}
          >
            {adminOpen ? t(lang, "closeManage") : t(lang, "manage")}
          </button>
        </div>
      </header>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} lang={lang} />}
      {reportsOpen && <ReportsPanel sites={sites} onClose={() => setReportsOpen(false)} lang={lang} />}
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
          lang={lang}
        />
        <div
          className="resize-handle"
          onMouseDown={startSidebarResize}
          onTouchStart={startSidebarResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
        {adminOpen ? (
          <AdminPanel
            style={{ "--sidebar-width": `${sidebarWidth}px` }}
            sites={sitesWithStatus}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSiteId}
            onSiteCreated={(id) => setSelectedSiteId(id)}
            onRequestPickLocation={requestPickLocation}
            lang={lang}
            canUndo={canUndo}
            undoBusy={undoBusy}
            onUndo={handleUndo}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => {
              setAdminOpen(false);
              setLocationPicker(null);
            }}
          />
        ) : (
          <Sidebar
            style={{ "--sidebar-width": `${sidebarWidth}px` }}
            sites={filteredSites}
            statuses={statuses}
            selectedSite={selectedSiteFiltered}
            onSelectSite={setSelectedSiteId}
            deviceTypes={deviceTypes}
            typeFilter={typeFilter}
            onToggleType={toggleTypeFilter}
            onClearTypeFilter={clearTypeFilter}
            lang={lang}
          />
        )}
      </div>
      <MobileTabBar active={mobileTab} onChange={setMobileTab} unreadCount={unreadCount} lang={lang} />
    </div>
  );
}
