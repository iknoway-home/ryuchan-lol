export const DEFAULT_ZONES = [

  // ===== TOP LANE =====
  { id: "T3_B", x: 0.14, y: 0.57, w: 0.12, h: 0.08 },
  { id: "T2_B", x: 0.17, y: 0.42, w: 0.12, h: 0.08 },
  { id: "T1_B", x: 0.17, y: 0.24, w: 0.12, h: 0.08 },
  { id: "T1_R", x: 0.36, y: 0.11, w: 0.12, h: 0.08 },
  { id: "T2_R", x: 0.50, y: 0.11, w: 0.12, h: 0.08 },
  { id: "T3_R", x: 0.63, y: 0.11, w: 0.12, h: 0.08 },

  // ===== MID LANE =====
  { id: "M3_B", x: 0.27, y: 0.60, w: 0.12, h: 0.08 },
  { id: "M2_B", x: 0.37, y: 0.52, w: 0.12, h: 0.08 },
  { id: "M1_B", x: 0.42, y: 0.43, w: 0.12, h: 0.08 },
  { id: "M1_R", x: 0.55, y: 0.36, w: 0.12, h: 0.08 },
  { id: "M2_R", x: 0.58, y: 0.27, w: 0.12, h: 0.08 },
  { id: "M3_R", x: 0.71, y: 0.23, w: 0.12, h: 0.08 },

  // ===== BOT LANE =====
  { id: "B3_B", x: 0.28, y: 0.74, w: 0.12, h: 0.08 },
  { id: "B2_B", x: 0.50, y: 0.74, w: 0.12, h: 0.08 },
  { id: "B1_B", x: 0.73, y: 0.74, w: 0.12, h: 0.08 },
  { id: "B1_R", x: 0.86, y: 0.54, w: 0.12, h: 0.08 },
  { id: "B2_R", x: 0.82, y: 0.34, w: 0.12, h: 0.08 },
  { id: "B3_R", x: 0.84, y: 0.23, w: 0.12, h: 0.08 },

  // ===== RIVER =====
  { id: "RIVER_TOP", x: 0.32, y: 0.34, w: 0.12, h: 0.07 },
  { id: "RIVER_BOT", x: 0.65, y: 0.46, w: 0.12, h: 0.07 },

  // ===== JUNGLE =====
  { id: "JGL_B", x: 0.50, y: 0.63, w: 0.12, h: 0.08 },
  { id: "JGL_R", x: 0.45, y: 0.22, w: 0.12, h: 0.08 },

  // ===== OBJECTIVES =====
  { id: "BARON", x: 0.32, y: 0.23, w: 0.12, h: 0.07 },
  { id: "DRAGON", x: 0.63, y: 0.55, w: 0.12, h: 0.07 },

  // ===== NEXUS =====
  { id: "NEXUS_B", x: 0.15, y: 0.70, w: 0.12, h: 0.08 },
  { id: "NEXUS_R", x: 0.76, y: 0.15, w: 0.14, h: 0.07 },

  // ===== FOUNTAIN =====
  { id: "FOUNTAIN_B", x: 0.03, y: 0.79, w: 0.12, h: 0.10 },
  { id: "FOUNTAIN_R", x: 0.80, y: 0.07, w: 0.16, h: 0.07 }
];

const LS_KEY = "lol_board_zones_v1";

export function loadZones() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_ZONES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ZONES;
    if (!parsed.every(z => z && typeof z.id === "string")) return DEFAULT_ZONES;
    return parsed;
  } catch {
    return DEFAULT_ZONES;
  }
}

export function saveZones(zones) {
  localStorage.setItem(LS_KEY, JSON.stringify(zones, null, 2));
}

export function resetZones() {
  localStorage.removeItem(LS_KEY);
  return DEFAULT_ZONES;
}

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function clampRect(r) {
  const min = 0.02;
  let x = clamp01(r.x);
  let y = clamp01(r.y);
  let w = Math.max(min, r.w);
  let h = Math.max(min, r.h);
  if (x + w > 1) x = 1 - w;
  if (y + h > 1) y = 1 - h;
  x = clamp01(x);
  y = clamp01(y);
  return { ...r, x, y, w, h };
}

export function zoneRectStyle(zone) {
  return {
    left: `${zone.x * 100}%`,
    top: `${zone.y * 100}%`,
    width: `${zone.w * 100}%`,
    height: `${zone.h * 100}%`
  };
}

export function zoneCenter(zone) {
  return { cx: zone.x + zone.w / 2, cy: zone.y + zone.h / 2 };
}
