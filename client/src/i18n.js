export const LANGS = ["en", "he"];

// Site/device `name` fields are { en?, he? } — at least one is required.
// Falls back to whichever language is actually filled in, then the id.
export function localizedName(name, lang, fallbackId) {
  if (!name) return fallbackId || "";
  if (typeof name === "string") return name; // defensive: tolerate legacy plain-string data
  return name[lang] || name.en || name.he || fallbackId || "";
}

const STRINGS = {
  en: {
    appTitle: "Tzabtor - C4I NOC",
    live: "live",
    disconnected: "disconnected",
    muteTitle: "Mute status-change sounds",
    unmuteTitle: "Unmute status-change sounds",
    mute: "Mute",
    unmute: "Unmute",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    langToggleTitle: "Switch to Hebrew",
    reports: "Reports",
    about: "About",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    manage: "Manage",
    closeManage: "Close manage",

    // Map
    mapHintPick: "Click on the map to set the location",
    mapHintManage: "Drag a site to relocate it, or right-click to add one",
    layerSatellite: "Satellite",
    layerMap: "Map",
    layerLabels: "Place labels",
    newSiteNamePlaceholder: "New site name",
    addSiteHere: "Add site here",
    moveSiteHere: (p) => `Move "${p.name}" here`,
    moreCount: (p) => `+${p.count} more`,
    statusUp: "up",
    statusDown: "down",
    statusUnknown: "unknown",

    // Sidebar
    sites: "Sites",
    selectASite: "Select a site",
    deviceCount: (p) => `${p.count} devices`,
    pendingCount: (p) => `${p.count} pending`,
    colDevice: "Device",
    colMethod: "Method",
    colStatus: "Status",
    colLastCheck: "Last check",

    // Admin panel
    manageInventory: "Manage inventory",
    undo: "Undo",
    globalSettings: "Global settings",
    defaultFailThreshold: "Default fail threshold (consecutive)",
    usingEnvDefault: (p) => `Using server default (${p.value}) — no override set`,
    usingCustomDefault: "Custom value set",
    saving: "Saving…",
    saved: "Saved",
    addSite: "+ Add site",
    edit: "Edit",
    delete: "Delete",
    nameEn: "Name (English)",
    nameHe: "Name (Hebrew)",
    lat: "Lat",
    lon: "Lon",
    pickOnMap: "Pick on map",
    save: "Save",
    add: "Add",
    cancel: "Cancel",
    devicesForSite: (p) => (p.site ? `Devices — ${p.site}` : "Devices"),
    addDevice: "+ Add device",
    selectSiteHint: "Select a site above to manage its devices.",
    noDevicesYet: "No devices yet.",
    type: "Type",
    monitorVia: "Monitor via",
    methodPing: "Ping",
    methodSnmp: "SNMP",
    methodApi: "API",
    methodMock: "Mock (simulated)",
    targetUrl: "URL",
    targetMockLabel: "Reference target (label only)",
    targetHostIp: "Host / IP",
    timeoutMs: "Timeout (ms)",
    failThreshold: "Fail threshold (consecutive)",
    failThresholdPlaceholder: "default",
    community: "Community",
    version: "Version",
    oid: "OID",
    port: "Port",
    httpMethod: "HTTP method",
    expectedStatus: "Expected status",
    jsonFieldOptional: "JSON field (optional)",
    expectedValue: "Expected value",
    upProbability: "Up probability (0–1)",
    confirmDeleteSite: (p) => `Delete site "${p.name}" and its ${p.count} device(s)?`,
    confirmDeleteDevice: (p) => `Delete device "${p.name}"?`,

    // Event log
    eventLog: "Event Log",
    all: "All",
    unread: "Unread",
    unresolved: "Unresolved",
    markAllRead: "Mark all read",
    nothingUnread: "Nothing unread.",
    nothingUnresolved: "Nothing unresolved.",
    noStatusChangesYet: "No status changes yet.",
    directionUp: "UP",
    directionDown: "DOWN",

    // Type filter
    filterByType: "Filter by type",
    clear: "Clear",

    // Status labels
    statusLabelUp: "Up",
    statusLabelDown: "Down",
    statusLabelUnknown: "Unknown",
    statusLabelPending: "Pending",

    // Mobile tabs
    tabMap: "Map",
    tabSites: "Sites",
    tabEvents: "Events",

    // About
    by: (p) => `By ${p.author}`,
    whatsNew: "What's new",

    // Reports
    timeFrame: "Time frame",
    preset1h: "1h",
    preset6h: "6h",
    preset12h: "12h",
    preset24h: "24h",
    preset7d: "7d",
    preset30d: "30d",
    custom: "Custom",
    from: "From",
    to: "To",
    noneEqualsAll: "(none = all)",
    generateReport: "Generate report",
    generating: "Generating…",
    generatingReport: "Generating report…",
    cardDevices: "Devices",
    cardSites: "Sites",
    cardEvents: "Events",
    cardDownEvents: "Down events",
    cardOverallUptime: "Overall uptime",
    eventVolume: "Event volume",
    legendUp: "Up",
    legendDown: "Down",
    deviceTimelines: "Device timelines",
    noDevicesMatchFilters: "No devices match the current filters.",
    eventsCount: (p) => `Events (${p.count})`,
    exportCsv: "Export CSV",
    colTime: "Time",
    colSite: "Site",
    colChange: "Change",
    noEventsInRange: "No events in this range.",
  },
  he: {
    appTitle: "Tzabtor - מוקד C4I",
    live: "פעיל",
    disconnected: "מנותק",
    muteTitle: "השתק צלילי שינוי סטטוס",
    unmuteTitle: "בטל השתקת צלילי שינוי סטטוס",
    mute: "השתק",
    unmute: "בטל השתקה",
    themeToLight: "עבור למצב בהיר",
    themeToDark: "עבור למצב כהה",
    langToggleTitle: "עבור לאנגלית",
    reports: "דוחות",
    about: "אודות",
    enterFullscreen: "מסך מלא",
    exitFullscreen: "צא ממסך מלא",
    manage: "ניהול",
    closeManage: "סגור ניהול",

    // Map
    mapHintPick: "לחץ על המפה כדי לקבוע את המיקום",
    mapHintManage: "גרור אתר כדי להעביר אותו, או לחץ קליק ימני כדי להוסיף אחד",
    layerSatellite: "לוויין",
    layerMap: "מפה",
    layerLabels: "תוויות מקומות",
    newSiteNamePlaceholder: "שם אתר חדש",
    addSiteHere: "הוסף אתר כאן",
    moveSiteHere: (p) => `העבר את "${p.name}" לכאן`,
    moreCount: (p) => `+${p.count} נוספים`,
    statusUp: "פעיל",
    statusDown: "מושבת",
    statusUnknown: "לא ידוע",

    // Sidebar
    sites: "אתרים",
    selectASite: "בחר אתר",
    deviceCount: (p) => `${p.count} התקנים`,
    pendingCount: (p) => `${p.count} בהמתנה`,
    colDevice: "התקן",
    colMethod: "שיטה",
    colStatus: "סטטוס",
    colLastCheck: "בדיקה אחרונה",

    // Admin panel
    manageInventory: "ניהול מלאי",
    undo: "בטל",
    globalSettings: "הגדרות כלליות",
    defaultFailThreshold: "סף כשלים כללי (רצופים)",
    usingEnvDefault: (p) => `נעשה שימוש בברירת המחדל של השרת (${p.value}) — לא הוגדר ערך מותאם`,
    usingCustomDefault: "הוגדר ערך מותאם אישית",
    saving: "שומר…",
    saved: "נשמר",
    addSite: "+ הוסף אתר",
    edit: "ערוך",
    delete: "מחק",
    nameEn: "שם (אנגלית)",
    nameHe: "שם (עברית)",
    lat: "קו רוחב",
    lon: "קו אורך",
    pickOnMap: "בחר במפה",
    save: "שמור",
    add: "הוסף",
    cancel: "ביטול",
    devicesForSite: (p) => (p.site ? `התקנים — ${p.site}` : "התקנים"),
    addDevice: "+ הוסף התקן",
    selectSiteHint: "בחר אתר למעלה כדי לנהל את ההתקנים שלו.",
    noDevicesYet: "אין עדיין התקנים.",
    type: "סוג",
    monitorVia: "ניטור באמצעות",
    methodPing: "פינג",
    methodSnmp: "SNMP",
    methodApi: "API",
    methodMock: "מדומה (סימולציה)",
    targetUrl: "כתובת URL",
    targetMockLabel: "יעד לדוגמה (תווית בלבד)",
    targetHostIp: "מארח / IP",
    timeoutMs: 'זמן קצוב (מ"ש)',
    failThreshold: "סף כשלים (רצופים)",
    failThresholdPlaceholder: "ברירת מחדל",
    community: "קהילה",
    version: "גרסה",
    oid: "OID",
    port: "פורט",
    httpMethod: "שיטת HTTP",
    expectedStatus: "סטטוס צפוי",
    jsonFieldOptional: "שדה JSON (אופציונלי)",
    expectedValue: "ערך צפוי",
    upProbability: "הסתברות לפעיל (0–1)",
    confirmDeleteSite: (p) => `למחוק את האתר "${p.name}" ואת ${p.count} ההתקנים שבו?`,
    confirmDeleteDevice: (p) => `למחוק את ההתקן "${p.name}"?`,

    // Event log
    eventLog: "יומן אירועים",
    all: "הכול",
    unread: "לא נקרא",
    unresolved: "לא טופל",
    markAllRead: "סמן הכול כנקרא",
    nothingUnread: "אין הודעות שלא נקראו.",
    nothingUnresolved: "אין פריטים שלא טופלו.",
    noStatusChangesYet: "אין שינויי סטטוס עדיין.",
    directionUp: "פעיל",
    directionDown: "מושבת",

    // Type filter
    filterByType: "סינון לפי סוג",
    clear: "נקה",

    // Status labels
    statusLabelUp: "פעיל",
    statusLabelDown: "מושבת",
    statusLabelUnknown: "לא ידוע",
    statusLabelPending: "בהמתנה",

    // Mobile tabs
    tabMap: "מפה",
    tabSites: "אתרים",
    tabEvents: "אירועים",

    // About
    by: (p) => `מאת ${p.author}`,
    whatsNew: "מה חדש",

    // Reports
    timeFrame: "טווח זמן",
    preset1h: "1ש",
    preset6h: "6ש",
    preset12h: "12ש",
    preset24h: "24ש",
    preset7d: "7י",
    preset30d: "30י",
    custom: "מותאם אישית",
    from: "מ-",
    to: "עד",
    noneEqualsAll: "(ללא בחירה = הכול)",
    generateReport: "צור דוח",
    generating: "מייצר…",
    generatingReport: "מייצר דוח…",
    cardDevices: "התקנים",
    cardSites: "אתרים",
    cardEvents: "אירועים",
    cardDownEvents: "אירועי השבתה",
    cardOverallUptime: "זמן פעילות כולל",
    eventVolume: "נפח אירועים",
    legendUp: "פעיל",
    legendDown: "מושבת",
    deviceTimelines: "ציר זמן להתקנים",
    noDevicesMatchFilters: "אין התקנים התואמים את הסינון הנוכחי.",
    eventsCount: (p) => `אירועים (${p.count})`,
    exportCsv: "ייצוא CSV",
    colTime: "זמן",
    colSite: "אתר",
    colChange: "שינוי",
    noEventsInRange: "אין אירועים בטווח זה.",
  },
};

const TYPE_LABELS = {
  en: {
    router: "Router",
    camera: "Camera",
    "ptz-camera": "PTZ Camera",
    sensor: "Sensor",
    power: "Power",
    roip: "ROIP",
    "cellular-bts": "Cellular BTS",
  },
  he: {
    router: "נתב",
    camera: "מצלמה",
    "ptz-camera": "מצלמת PTZ",
    sensor: "חיישן",
    power: "מתח",
    roip: "ROIP",
    "cellular-bts": "אנטנה סלולרית",
  },
};

const METHOD_LABELS = {
  en: { ping: "PING", snmp: "SNMP", api: "API" },
  he: { ping: "פינג", snmp: "SNMP", api: "API" },
};

export function t(lang, key, params) {
  const entry = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return typeof entry === "function" ? entry(params || {}) : entry;
}

export function typeLabel(lang, type) {
  return TYPE_LABELS[lang]?.[type] ?? TYPE_LABELS.en[type] ?? type;
}

export function methodLabelFor(lang, method) {
  return METHOD_LABELS[lang]?.[method] ?? METHOD_LABELS.en[method] ?? String(method).toUpperCase();
}
