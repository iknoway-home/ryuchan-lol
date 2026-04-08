export const ADJACENCY = {
  FOUNTAIN_B: ["NEXUS_B"],
  NEXUS_B: ["FOUNTAIN_B", "T3_B", "M3_B", "B3_B"],

  T3_B: ["NEXUS_B", "T2_B"],
  T2_B: ["T3_B", "T1_B"],
  T1_B: ["T2_B", "RIVER_TOP", "T1_R"],

  RIVER_TOP: ["T1_B", "M1_B", "M1_R", "T1_R", "BARON"],
  BARON: ["RIVER_TOP"],

  T1_R: ["RIVER_TOP", "T2_R", "T1_B", "JGL_R"],
  T2_R: ["T1_R", "T3_R", "JGL_R"],
  T3_R: ["T2_R", "NEXUS_R"],

  M3_B: ["NEXUS_B", "M2_B"],
  M2_B: ["M3_B", "M1_B", "JGL_B"],
  M1_B: ["M2_B", "RIVER_TOP", "RIVER_BOT", "M1_R", "JGL_B"],

  M1_R: ["M2_R", "RIVER_TOP", "RIVER_BOT", "M1_B", "JGL_R"],
  M2_R: ["M3_R", "M1_R", "JGL_R"],
  M3_R: ["M2_R", "NEXUS_R"],

  B3_B: ["NEXUS_B", "B2_B"],
  B2_B: ["B3_B", "B1_B", "JGL_B"],
  B1_B: ["B2_B", "RIVER_BOT", "B1_R", "JGL_B"],

  RIVER_BOT: ["B1_B", "M1_B", "M1_R", "B1_R", "DRAGON"],
  DRAGON: ["RIVER_BOT"],

  B1_R: ["RIVER_BOT", "B2_R", "B1_B"],
  B2_R: ["B1_R", "B3_R"],
  B3_R: ["B2_R", "NEXUS_R"],

  NEXUS_R: ["FOUNTAIN_R", "T3_R", "M3_R", "B3_R"],
  FOUNTAIN_R: ["NEXUS_R"],

  JGL_B: ["M2_B", "M1_B", "B2_B", "B1_B"],
  JGL_R: ["M2_R", "M1_R", "T1_R", "T2_R"]
};

export function getAdjacentZones(zoneId) {
  return ADJACENCY[zoneId] || [];
}