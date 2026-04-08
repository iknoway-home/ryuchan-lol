import React from "react";

function findObjective(neutralObjectives, id) {
  return (neutralObjectives || []).find((obj) => obj.id === id) || null;
}

function renderObjectiveCard(title, obj) {
  if (!obj) {
    return (
      <div className="teamStructureRow">
        <div className="teamStructureName">{title}</div>
        <div className="structureEmpty">未定義</div>
      </div>
    );
  }

  return (
    <div className="teamStructureRow">
      <div className="teamStructureName">{title}</div>
      <div className={"teamStructureHp " + (obj.hp <= 0 ? "hpDead" : "")}>
        HP {obj.hp}/{obj.maxHp}
      </div>
      <div className="teamStructureRespawn">{obj.zone}</div>
    </div>
  );
}

export default function NeutralObjectivesPanel({
  neutralObjectives = [],
  teamBuffs = {}
}) {
  const dragon = findObjective(neutralObjectives, "DRAGON");
  const baron = findObjective(neutralObjectives, "BARON");
  const blueBuffs = teamBuffs.blue || { dragonStacks: 0, baronTurns: 0 };
  const redBuffs = teamBuffs.red || { dragonStacks: 0, baronTurns: 0 };

  return (
    <div className="teamPanel" style={{ marginTop: 10 }}>
      <div className="teamPanelTitle">中立目標 / バフ</div>

      <div className="teamStructureBlock" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
        <div className="teamStructureTitle">Neutral Objectives</div>
        {renderObjectiveCard("DRAGON", dragon)}
        {renderObjectiveCard("BARON", baron)}
      </div>

      <div className="teamStructureBlock">
        <div className="teamStructureTitle">BLUE Buff</div>
        <div className="teamStructureRow">
          <div className="teamStructureName">Dragon Stacks</div>
          <div className="teamStructureHp">{blueBuffs.dragonStacks ?? 0}</div>
        </div>
        <div className="teamStructureRow">
          <div className="teamStructureName">Baron Turns</div>
          <div className="teamStructureHp">{blueBuffs.baronTurns ?? 0}</div>
        </div>
      </div>

      <div className="teamStructureBlock">
        <div className="teamStructureTitle">RED Buff</div>
        <div className="teamStructureRow">
          <div className="teamStructureName">Dragon Stacks</div>
          <div className="teamStructureHp">{redBuffs.dragonStacks ?? 0}</div>
        </div>
        <div className="teamStructureRow">
          <div className="teamStructureName">Baron Turns</div>
          <div className="teamStructureHp">{redBuffs.baronTurns ?? 0}</div>
        </div>
      </div>
    </div>
  );
}