// Newest first. Dates are when the work actually shipped; versions only
// bump for a release that's a meaningful checkpoint, not every commit.
export const CHANGELOG = [
  {
    version: "2.2.0",
    date: "2026-08-25",
    items: [
      "Added Hebrew support: a language toggle (EN/HE) translates the whole interface",
      "Site and device names can now have an English and/or Hebrew value each, with automatic fallback to whichever is set",
      "Resizable map/sidebar split and site-list/device-table split, both remembered across sessions",
      "The event log is now server-authoritative — identical across every open tab, and a freshly opened tab immediately shows the 50 most recent events instead of starting empty",
      "Read/unread state persists across reloads: only events since your last \"Mark all read\" show as unread",
      'Renamed "Activity Log" to "Event Log"',
      "Zoom control moved to bottom-right, made smaller, and hidden on mobile; fixed a mobile layout issue where the map's attribution line overlapped the tab bar",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-08-23",
    items: [
      'Renamed the header to "Tzabtor - C4I NOC"',
      "Added a 12h time frame preset to Reports",
      "Fixed the map: switched to CARTO tiles after Wikimedia blocked external tile usage, so labels and the non-satellite map view work again",
      "Fixed ping and API checks that were stuck permanently \"down\" in production (ICMP needs privileges the host doesn't grant; the demo API target was hitting a rate limit)",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-08-23",
    items: [
      "General Availability release",
      "Added Reports: filter by site/device and time frame for summary stats, an event-volume chart, and per-device uptime timelines",
      "Added a mobile view with a Map / Sites / Events tab bar",
      "Added fullscreen mode and a dark/light theme toggle",
      'Renamed the app to "Tzabtor", removed all Gaza references, added this About screen',
      "Bigger, longer pulse animation on the map for status changes",
      "Fixed the activity log missing devices that were already down before the page connected",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-08-20",
    items: [
      "Initial release: live map of monitored sites and devices (ping, SNMP, API, and simulated checks)",
      "In-app management of sites and devices, with undo",
      "Live activity log of status changes with sound alerts",
      "Production deployment support",
    ],
  },
];
