import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, LayersControl, Marker, Tooltip, Popup, useMap, useMapEvents } from "react-leaflet";
import * as api from "../api.js";
import { TYPE_ICONS } from "../format.js";

const MAX_HOVER_DEVICES = 10;

const STATUS_COLORS = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#95a5a6",
};

function siteIcon(status, selected, pulsing) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const size = selected ? 24 : 16;
  const pulseRing = pulsing ? `<span class="site-marker-pulse" style="border-color:${color};"></span>` : "";
  return L.divIcon({
    className: "site-marker-icon",
    html: `<span class="site-marker-wrap">${pulseRing}<span class="site-marker-dot${
      selected ? " selected" : ""
    }" style="background:${color};width:${size}px;height:${size}px;"></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function countDeviceStatuses(devices, statuses) {
  const counts = { up: 0, down: 0, unknown: 0 };
  for (const d of devices) {
    const s = statuses[d.id]?.status || "unknown";
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

function SiteHoverCard({ site, statuses }) {
  const counts = countDeviceStatuses(site.devices, statuses);
  const shown = site.devices.slice(0, MAX_HOVER_DEVICES);
  const hiddenCount = site.devices.length - shown.length;

  return (
    <div className="site-hover">
      <div className="site-hover-title">{site.name}</div>
      <div className="site-hover-counts">
        <span className="count-up">● {counts.up} up</span>
        <span className="count-down">● {counts.down} down</span>
        {counts.unknown > 0 && <span className="count-unknown">● {counts.unknown} unknown</span>}
      </div>
      <ul className="site-hover-device-list">
        {shown.map((d) => {
          const status = statuses[d.id]?.status || "unknown";
          return (
            <li key={d.id}>
              <span className={`site-hover-device-dot status-${status}`} />
              <span className="site-hover-device-icon">{TYPE_ICONS[d.type] || "•"}</span>
              <span className="site-hover-device-name">{d.name}</span>
            </li>
          );
        })}
        {hiddenCount > 0 && <li className="site-hover-more">+{hiddenCount} more</li>}
      </ul>
    </div>
  );
}

function FitBounds({ sites }) {
  const map = useMap();
  useEffect(() => {
    if (!sites.length) return;
    const bounds = sites.map((s) => [s.lat, s.lon]);
    map.fitBounds(bounds, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.length]);
  return null;
}

function ClickCapture({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Right-click on empty map (Manage mode only): add a new site here, or
// relocate the currently selected site here.
function ContextMenu({ selectedSite, onSiteCreated, active }) {
  const [at, setAt] = useState(null); // {lat, lon} or null
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useMapEvents({
    contextmenu(e) {
      if (!active) return;
      setAt({ lat: e.latlng.lat, lon: e.latlng.lng });
      setName("");
      setError("");
    },
  });

  // Keep the array reference stable across re-renders (e.g. while typing)
  // so react-leaflet's Popup doesn't see a "new" position and reopen —
  // which would fire eventHandlers.remove and wipe the form mid-type.
  const position = useMemo(() => (at ? [at.lat, at.lon] : null), [at?.lat, at?.lon]);

  if (!at) return null;

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await api.createSite({ name: name.trim(), lat: at.lat, lon: at.lon });
      onSiteCreated?.(created.id);
      setAt(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove() {
    setBusy(true);
    setError("");
    try {
      await api.updateSite(selectedSite.id, { lat: at.lat, lon: at.lon });
      setAt(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popup position={position} eventHandlers={{ remove: () => setAt(null) }}>
      <div className="map-context-menu">
        <div className="map-context-coords">
          {at.lat.toFixed(5)}, {at.lon.toFixed(5)}
        </div>
        {error && <div className="map-context-error">{error}</div>}

        <form onSubmit={handleCreate} className="map-context-add">
          <input
            autoFocus
            placeholder="New site name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !name.trim()}>
            Add site here
          </button>
        </form>

        {selectedSite && (
          <button type="button" className="map-context-move" onClick={handleMove} disabled={busy}>
            Move "{selectedSite.name}" here
          </button>
        )}
      </div>
    </Popup>
  );
}

export default function MapView({
  sites,
  statuses,
  selectedSiteId,
  onSelectSite,
  onSiteCreated,
  pickingActive,
  onMapClick,
  adminOpen,
  pulsingSites,
}) {
  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;

  async function handleDragEnd(site, e) {
    const { lat, lng } = e.target.getLatLng();
    try {
      await api.updateSite(site.id, { lat, lon: lng });
    } catch (err) {
      e.target.setLatLng([site.lat, site.lon]); // snap back on failure
      console.error("Failed to relocate site:", err.message);
    }
  }

  return (
    <div className={`map-container${pickingActive ? " picking" : ""}`}>
      {pickingActive && <div className="map-hint">Click on the map to set the location</div>}
      {!pickingActive && adminOpen && (
        <div className="map-hint">Drag a site to relocate it, or right-click to add one</div>
      )}
      <MapContainer center={[31.4, 34.45]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Map (Hebrew labels)">
            <TileLayer
              attribution='Map: <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png?lang=he"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          {/*
            Esri's "World_Boundaries_and_Places" overlay was tried here for
            satellite place labels, but it renders local-language labels
            (including Arabic for Gaza-side places) with no way to force
            Hebrew via the free REST tile API. Using the same Hebrew-forced
            Wikimedia layer as a semi-transparent overlay instead, so
            satellite imagery still shows through underneath.
          */}
          <LayersControl.Overlay checked name="Place labels (Hebrew)">
            <TileLayer
              attribution='Map: <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png?lang=he"
              maxZoom={19}
              opacity={0.55}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <ClickCapture active={!!pickingActive} onPick={onMapClick} />
        <ContextMenu selectedSite={selectedSite} onSiteCreated={onSiteCreated} active={!!adminOpen} />
        <FitBounds sites={sites} />
        {sites.map((site) => (
          <Marker
            key={site.id}
            position={[site.lat, site.lon]}
            icon={siteIcon(site.status, site.id === selectedSiteId, pulsingSites?.has(site.id))}
            draggable={!!adminOpen}
            eventHandlers={{
              click: () => onSelectSite(site.id),
              dragend: (e) => handleDragEnd(site, e),
              mouseover: (e) => e.target.openPopup(),
              mouseout: (e) => e.target.closePopup(),
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="site-label" opacity={1}>
              {site.name}
            </Tooltip>
            <Popup className="site-hover-popup" closeButton={false} autoPan={false}>
              <SiteHoverCard site={site} statuses={statuses} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
