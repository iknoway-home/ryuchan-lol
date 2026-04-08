import React from "react";

const ROLE_ORDER = ["TOP", "JG", "MID", "ADC", "SUP"];

function roleInitial(role) {
  const map = { TOP: "T", MID: "M", JG: "J", ADC: "A", SUP: "S" };
  return map[role] ?? "?";
}

function sortStructures(list) {
  const order = { nexus: 0, tower: 1, inhib: 2 };
  return [...list].sort((a, b) => {
    if ((order[a.kind] ?? 99) !== (order[b.kind] ?? 99)) {
      return (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
    }
    return a.id.localeCompare(b.id);
  });
}

function isUnitDead(u) {
  return !u || u.hp <= 0 || u.respawnIn > 0;
}

export default function TeamStatusPanel({ side, units, structures }) {
  if (!units) return null;

  const myStructures = Object.values(structures || {}).filter(
    (st) => st.owner === side
  );

  return (
    <div className={"teamPanel " + (side === "blue" ? "teamPanelBlue" : "teamPanelRed")}>
      <div className="teamPanelTitle">
        {side === "blue" ? "BLUE" : "RED"}
      </div>

      {ROLE_ORDER.map((role) => {
        const u = units[role];
        if (!u) return null;

        const dead = isUnitDead(u);

        return (
          <div key={role} className={"teamRow " + (dead ? "teamRowDead" : "")}>
            <div className="teamRole">{roleInitial(role)}</div>
            <div className="teamStats">
              <div>HP {u.hp}/{u.maxHp ?? u.hp}</div>
              <div>ATK {u.atk ?? 1}</div>
              <div>G {u.gold ?? 0}</div>
              <div>{dead ? `DEAD / ${u.respawnIn ?? 0}` : u.zone}</div>
            </div>
          </div>
        );
      })}

      <div className="teamStructureBlock">
        <div className="teamStructureTitle">構造物</div>

        {sortStructures(myStructures).map((st) => (
          <div key={st.id} className="teamStructureRow">
            <div className="teamStructureName">{st.id}</div>
            <div className={"teamStructureHp " + (st.hp <= 0 ? "hpDead" : "")}>
              HP {st.hp}/{st.maxHp}
            </div>
            {st.respawnIn > 0 && (
              <div className="teamStructureRespawn">⏳ {st.respawnIn}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}