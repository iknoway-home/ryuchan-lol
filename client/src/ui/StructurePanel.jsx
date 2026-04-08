import React from "react";

function groupByOwner(structures) {
  const result = { blue: [], red: [], neutral: [] };
  for (const st of Object.values(structures || {})) {
    if (st.owner === "blue") result.blue.push(st);
    else if (st.owner === "red") result.red.push(st);
    else result.neutral.push(st);
  }
  return result;
}

function sortStructures(list) {
  const order = { nexus: 0, tower: 1, inhib: 2, objective: 3 };
  return [...list].sort((a, b) => {
    if ((order[a.kind] ?? 99) !== (order[b.kind] ?? 99)) {
      return (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
    }
    return a.id.localeCompare(b.id);
  });
}

function renderRow(st) {
  return (
    <div key={st.id} className="structureRow">
      <div className="structureName">{st.id}</div>
      <div className={"structureHp " + (st.hp <= 0 ? "hpDead" : "")}>
        HP {st.hp}/{st.maxHp}
      </div>
      {st.respawnIn > 0 && (
        <div className="structureRespawn">⏳ {st.respawnIn}</div>
      )}
    </div>
  );
}

export default function StructurePanel({ structures, neutralObjectives = [] }) {
  const grouped = groupByOwner(structures);

  return (
    <div className="structurePanel">
      <div className="structureTitle">構造物一覧</div>

      <div className="structureGroup">
        <div className="structureSide blue">BLUE</div>
        {sortStructures(grouped.blue).map(renderRow)}
      </div>

      <div className="structureGroup">
        <div className="structureSide red">RED</div>
        {sortStructures(grouped.red).map(renderRow)}
      </div>

      <div className="structureGroup">
        <div className="structureSide neutral">中立オブジェクト</div>
        {neutralObjectives.length === 0 ? (
          <div className="structureEmpty">未実装 / まだ出現なし</div>
        ) : (
          neutralObjectives.map(renderRow)
        )}
      </div>
    </div>
  );
}
