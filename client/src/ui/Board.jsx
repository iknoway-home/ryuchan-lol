import React from "react";
import { zoneRectStyle, zoneCenter } from "../game/zones.js";
import { getAdjacentZones } from "../game/adjacency.js";

const ROLE_ORDER = ["TOP", "JG", "MID", "ADC", "SUP"];

function findZone(zones, id) {
  return zones.find((z) => z.id === id) || null;
}

function unitLabel(side, role) {
  const map = { TOP: "T", MID: "M", JG: "J", ADC: "A", SUP: "S" };
  return map[role] ?? "?";
}

function laneClass(zoneId) {
  if (zoneId.startsWith("T")) return "laneTop";
  if (zoneId.startsWith("M")) return "laneMid";
  if (zoneId.startsWith("B")) return "laneBot";
  if (zoneId.startsWith("RIVER")) return "laneRiver";
  if (zoneId === "JGL_B" || zoneId === "JGL_R") return "laneJgl";
  if (zoneId === "DRAGON" || zoneId === "BARON") return "laneObj";
  if (zoneId.startsWith("NEXUS") || zoneId.startsWith("FOUNTAIN")) return "laneNexus";
  return "";
}

function isUnitDead(unit) {
  return !unit || unit.hp <= 0 || unit.respawnIn > 0;
}

function groupMinionsByZone(minions = []) {
  const map = new Map();

  for (const m of minions) {
    if (m.hp <= 0) continue;
    if (!map.has(m.zone)) {
      map.set(m.zone, { blue: [], red: [] });
    }
    map.get(m.zone)[m.side].push(m);
  }

  return map;
}

export default function Board({
  state,
  zones,
  selectedZoneId,
  setSelectedZoneId,
  selectedRole,
  mySide = "blue"
}) {
  const units = state?.units;
  const minionMap = groupMinionsByZone(state?.minions || []);

  const selectedUnit =
    selectedRole && units?.[mySide]?.[selectedRole]
      ? units[mySide][selectedRole]
      : null;

  const moveCandidates =
    selectedUnit && !isUnitDead(selectedUnit)
      ? getAdjacentZones(selectedUnit.zone)
      : [];

  return (
    <div className="boardWrap">
      <div className="board">
        <img className="map" src="/map.png" alt="Summoner's Rift" />

        {zones.map((z) => (
          <div
            key={z.id}
            className={
              "zoneRect " +
              laneClass(z.id) +
              " " +
              (selectedZoneId === z.id ? "zoneSelected " : "") +
              (moveCandidates.includes(z.id) ? "zoneMoveCandidate " : "")
            }
            style={zoneRectStyle(z)}
            onClick={() => setSelectedZoneId(z.id)}
            title={z.id}
          >
            <div className="zoneId">{z.id}</div>
          </div>
        ))}

        {units &&
          (() => {
            const byZone = new Map();

            for (const side of ["blue", "red"]) {
              for (const role of ROLE_ORDER) {
                const u = units[side]?.[role];
                if (!u) continue;
                if (!byZone.has(u.zone)) byZone.set(u.zone, []);
                byZone.get(u.zone).push({ side, role });
              }
            }

            const blueOffsets = [
              { dx: -0.043, dy: -0.009 },
              { dx: -0.043, dy: 0.008 },
              { dx: -0.043, dy: 0.025 },
              { dx: -0.020, dy: -0.009 },
              { dx: -0.020, dy: 0.025 }
            ];

            const redOffsets = [
              { dx: 0.043, dy: -0.009 },
              { dx: 0.043, dy: 0.008 },
              { dx: 0.043, dy: 0.025 },
              { dx: 0.020, dy: -0.009 },
              { dx: 0.020, dy: 0.025 }
            ];

            const nodes = [];

            for (const [zoneId, list] of byZone.entries()) {
              const z = findZone(zones, zoneId);
              if (!z) continue;

              const { cx, cy } = zoneCenter(z);

              const blueList = list.filter((p) => p.side === "blue");
              const redList = list.filter((p) => p.side === "red");

              blueList.forEach((p, idx) => {
                const u = units[p.side][p.role];
                const off = blueOffsets[idx] || blueOffsets[blueOffsets.length - 1];
                const dead = isUnitDead(u);
                const isSelected = p.side === mySide && p.role === selectedRole;

                nodes.push(
                  <div
                    key={`${p.side}-${p.role}`}
                    className={
                      "unit " +
                      (p.side === "blue" ? "unitBlue " : "unitRed ") +
                      (dead ? "unitDead " : "") +
                      (isSelected ? "unitSelected " : "")
                    }
                    style={{
                      left: `${(cx + off.dx) * 100}%`,
                      top: `${(cy + off.dy) * 100}%`
                    }}
                    title={
                      dead
                        ? `${p.side}.${p.role} DEAD respawnIn:${u.respawnIn ?? 0}`
                        : `${p.side}.${p.role} HP:${u.hp}/${u.maxHp ?? u.hp} ATK:${u.atk ?? 1} G:${u.gold ?? 0}`
                    }
                  >
                    <div className="unitInitial">{unitLabel(p.side, p.role)}</div>
                  </div>
                );
              });

              redList.forEach((p, idx) => {
                const u = units[p.side][p.role];
                const off = redOffsets[idx] || redOffsets[redOffsets.length - 1];
                const dead = isUnitDead(u);
                const isSelected = p.side === mySide && p.role === selectedRole;

                nodes.push(
                  <div
                    key={`${p.side}-${p.role}`}
                    className={
                      "unit " +
                      (p.side === "blue" ? "unitBlue " : "unitRed ") +
                      (dead ? "unitDead " : "") +
                      (isSelected ? "unitSelected " : "")
                    }
                    style={{
                      left: `${(cx + off.dx) * 100}%`,
                      top: `${(cy + off.dy) * 100}%`
                    }}
                    title={
                      dead
                        ? `${p.side}.${p.role} DEAD respawnIn:${u.respawnIn ?? 0}`
                        : `${p.side}.${p.role} HP:${u.hp}/${u.maxHp ?? u.hp} ATK:${u.atk ?? 1} G:${u.gold ?? 0}`
                    }
                  >
                    <div className="unitInitial">{unitLabel(p.side, p.role)}</div>
                  </div>
                );
              });
            }

            return nodes;
          })()}

        {zones.map((z) => {
          const grouped = minionMap.get(z.id);
          if (!grouped) return null;

          const { cx, cy } = zoneCenter(z);

          const blueHpText = grouped.blue.map((m) => m.hp).join("/");
          const redHpText = grouped.red.map((m) => m.hp).join("/");

          return (
            <React.Fragment key={`minions-${z.id}`}>
              {grouped.blue.length > 0 && (
                <div
                  className="minionCluster minionClusterBlue"
                  style={{
                    left: `${(cx - 0.01) * 100}%`,
                    top: `${(cy + 0.055) * 100}%`
                  }}
                  title={grouped.blue.map((m) => `${m.id} HP:${m.hp}`).join("\n")}
                >
                  <span className="minionDot">m</span>
                  <span className="minionCount">{grouped.blue.length}</span>
                  <span className="minionHpText">HP {blueHpText}</span>
                </div>
              )}

              {grouped.red.length > 0 && (
                <div
                  className="minionCluster minionClusterRed"
                  style={{
                    left: `${(cx + 0.01) * 100}%`,
                    top: `${(cy + 0.055) * 100}%`
                  }}
                  title={grouped.red.map((m) => `${m.id} HP:${m.hp}`).join("\n")}
                >
                  <span className="minionDot">m</span>
                  <span className="minionCount">{grouped.red.length}</span>
                  <span className="minionHpText">HP {redHpText}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {state?.structures &&
          Object.values(state.structures).map((st) => {
            const z = findZone(zones, st.zone);
            if (!z) return null;

            const { cx, cy } = zoneCenter(z);

            const isTower = st.kind === "tower";
            const isNexus = st.kind === "nexus";
            const isInhib = st.kind === "inhib";

            return (
              <div
                key={st.id}
                className={
                  "structureIcon " +
                  (isTower ? "towerIcon " : "") +
                  (isInhib ? "inhibIcon " : "") +
                  (isNexus ? "nexusIcon " : "") +
                  (st.owner === "blue" ? "structureBlue " : "structureRed ") +
                  (st.hp <= 0 ? "structureDead" : "")
                }
                style={{
                  left: `${cx * 100}%`,
                  top: `${cy * 100}%`
                }}
                title={`${st.id} HP:${st.hp}/${st.maxHp}`}
              >
                <div className="structureKind">
                  {isNexus ? "NX" : isTower ? "TW" : "IN"}
                </div>

                {!isNexus && (
                  <div className="structureHpMini">{st.hp}</div>
                )}

                {isInhib && st.respawnIn > 0 && (
                  <div className="structureRespawnMini">⏳{st.respawnIn}</div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}