import React from "react";
import { getAdjacentZones } from "../game/adjacency.js";

const ROLES = ["TOP", "JG", "MID", "ADC", "SUP"];
const RECALL_CHOICES = [
  { label: "ATK+1", value: "atk" },
  { label: "HP+1", value: "hp" },
  { label: "温存", value: "save" }
];

function shortRole(role) {
  const map = { TOP: "T", JG: "J", MID: "M", ADC: "A", SUP: "S" };
  return map[role] ?? role;
}

function getEnemySide(mySide) {
  return mySide === "blue" ? "red" : "blue";
}

function isUnitUnavailable(unit) {
  return !unit || unit.hp <= 0 || unit.respawnIn > 0;
}

function isDestroyedStructure(state, id) {
  const st = state?.structures?.[id];
  return !!st && st.hp <= 0;
}

function canAttackStructure(state, structureId) {
  switch (structureId) {
    case "TWR_T2_R": return isDestroyedStructure(state, "TWR_T1_R");
    case "TWR_M2_R": return isDestroyedStructure(state, "TWR_M1_R");
    case "TWR_B2_R": return isDestroyedStructure(state, "TWR_B1_R");

    case "INH_T3_R": return isDestroyedStructure(state, "TWR_T2_R");
    case "INH_M3_R": return isDestroyedStructure(state, "TWR_M2_R");
    case "INH_B3_R": return isDestroyedStructure(state, "TWR_B2_R");

    case "NX_R":
      return (
        isDestroyedStructure(state, "INH_T3_R") ||
        isDestroyedStructure(state, "INH_M3_R") ||
        isDestroyedStructure(state, "INH_B3_R")
      );

    case "TWR_T2_B": return isDestroyedStructure(state, "TWR_T1_B");
    case "TWR_M2_B": return isDestroyedStructure(state, "TWR_M1_B");
    case "TWR_B2_B": return isDestroyedStructure(state, "TWR_B1_B");

    case "INH_T3_B": return isDestroyedStructure(state, "TWR_T2_B");
    case "INH_M3_B": return isDestroyedStructure(state, "TWR_M2_B");
    case "INH_B3_B": return isDestroyedStructure(state, "TWR_B2_B");

    case "NX_B":
      return (
        isDestroyedStructure(state, "INH_T3_B") ||
        isDestroyedStructure(state, "INH_M3_B") ||
        isDestroyedStructure(state, "INH_B3_B")
      );

    default:
      return true;
  }
}

function getAttackCandidates(role, mySide, state) {
  if (!state?.units || !state?.structures) {
    return {
      enemyRoles: [],
      enemyStructures: [],
      neutralObjectives: [],
      enemyMinions: []
    };
  }

  const myUnit = state.units?.[mySide]?.[role];
  if (!myUnit || isUnitUnavailable(myUnit)) {
    return {
      enemyRoles: [],
      enemyStructures: [],
      neutralObjectives: [],
      enemyMinions: []
    };
  }

  const myZone = myUnit.zone;
  const enemySide = getEnemySide(mySide);

  const enemyRoles = ROLES
    .filter((enemyRole) => {
      const u = state.units?.[enemySide]?.[enemyRole];
      return u && !isUnitUnavailable(u) && u.zone === myZone;
    })
    .map((enemyRole) => ({
      label: shortRole(enemyRole),
      value: enemyRole
    }));

  const enemyStructures = Object.values(state.structures || {})
    .filter(
      (st) =>
        st.owner === enemySide &&
        st.hp > 0 &&
        st.zone === myZone &&
        canAttackStructure(state, st.id)
    )
    .map((st) => ({
      label: st.id,
      value: st.id
    }));

  const neutralObjectives = (state.neutralObjectives || [])
    .filter((obj) => obj.hp > 0 && obj.zone === myZone)
    .map((obj) => ({
      label: obj.id,
      value: obj.id
    }));

  const enemyMinions = (state.minions || [])
    .filter((m) => m.side === enemySide && m.zone === myZone && m.hp > 0)
    .map((m) => ({
      label: `${m.id} (HP:${m.hp})`,
      value: m.id
    }));

  return { enemyRoles, enemyStructures, neutralObjectives, enemyMinions };
}

export default function ActionPanel({
  draftActions,
  setDraftActions,
  onSubmit,
  selectedZoneId,
  state,
  mySide = "blue",
  selectedRole,
  setSelectedRole
}) {
  function setAction(role, patch) {
    setDraftActions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || { type: "wait" }),
        ...patch
      }
    }));
  }

  function resetRole(role, type) {
    setSelectedRole(role);

    if (type === "move") {
      setDraftActions((prev) => ({
        ...prev,
        [role]: { type: "move", to: "" }
      }));
      return;
    }

    if (type === "attack") {
      setDraftActions((prev) => ({
        ...prev,
        [role]: { type: "attack", target: "" }
      }));
      return;
    }

    if (type === "recall") {
      setDraftActions((prev) => ({
        ...prev,
        [role]: { type: "recall", buyChoice: "save" }
      }));
      return;
    }

    setDraftActions((prev) => ({
      ...prev,
      [role]: { type: "wait" }
    }));
  }

  return (
    <div className="actionPanel">
      <h3>行動入力</h3>

      <div className="selectedZoneBox">
        <div>
          選択中マス: <strong>{selectedZoneId || "未選択"}</strong>
        </div>
        <div>
          選択中ロール: <strong>{selectedRole || "未選択"}</strong>
        </div>
      </div>

      {ROLES.map((role) => {
        const action = draftActions[role] || { type: "wait" };
        const unit = state?.units?.[mySide]?.[role];
        const isDead = isUnitUnavailable(unit);
        const moveCandidates =
          unit && !isDead ? getAdjacentZones(unit.zone) : [];

        const canSetMove =
          !!selectedZoneId &&
          moveCandidates.includes(selectedZoneId) &&
          !isDead;

        const {
          enemyRoles,
          enemyStructures,
          neutralObjectives,
          enemyMinions
        } = getAttackCandidates(role, mySide, state);

        return (
          <div
            key={role}
            className={
              "actionRow " + (selectedRole === role ? "actionRowSelected" : "")
            }
          >
            <div className="actionRole">
              {role}{" "}
              {unit
                ? unit.respawnIn > 0
                  ? `(DEAD / ${unit.respawnIn})`
                  : `(${unit.zone})`
                : ""}
            </div>

            <div className="actionTypeButtons">
              <button onClick={() => resetRole(role, "move")} disabled={isDead}>
                Move
              </button>
              <button onClick={() => resetRole(role, "attack")} disabled={isDead}>
                Attack
              </button>
              <button onClick={() => resetRole(role, "recall")} disabled={isDead}>
                Recall
              </button>
              <button onClick={() => resetRole(role, "wait")} disabled={isDead}>
                Wait
              </button>
            </div>

            {action.type === "move" && (
              <div className="actionSection">
                <div className="actionLabel">移動先</div>
                <div className="actionPreview">
                  {action.to || "候補マスをクリックしてセット"}
                </div>
                <div className="actionCandidates">
                  候補: {moveCandidates.length ? moveCandidates.join(", ") : "なし"}
                </div>
                <button
                  onClick={() =>
                    setAction(role, { type: "move", to: selectedZoneId || "" })
                  }
                  disabled={!canSetMove}
                >
                  選択中マスをセット
                </button>
              </div>
            )}

            {action.type === "attack" && (
              <div className="actionSection">
                <div className="actionLabel">攻撃対象（同じマスのみ）</div>

                <div className="targetGroup">
                  <div className="targetTitle">敵ロール</div>
                  <div className="targetButtons">
                    {enemyRoles.length === 0 ? (
                      <div className="targetEmpty">なし</div>
                    ) : (
                      enemyRoles.map((t) => (
                        <button
                          key={t.value}
                          className={action.target === t.value ? "targetSelected" : ""}
                          onClick={() =>
                            setAction(role, { type: "attack", target: t.value })
                          }
                        >
                          {t.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="targetGroup">
                  <div className="targetTitle">敵ミニオン</div>
                  <div className="targetButtons">
                    {enemyMinions.length === 0 ? (
                      <div className="targetEmpty">なし</div>
                    ) : (
                      enemyMinions.map((t) => (
                        <button
                          key={t.value}
                          className={action.target === t.value ? "targetSelected" : ""}
                          onClick={() =>
                            setAction(role, { type: "attack", target: t.value })
                          }
                        >
                          {t.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="targetGroup">
                  <div className="targetTitle">構造物</div>
                  <div className="targetButtons">
                    {enemyStructures.length === 0 ? (
                      <div className="targetEmpty">なし</div>
                    ) : (
                      enemyStructures.map((t) => (
                        <button
                          key={t.value}
                          className={action.target === t.value ? "targetSelected" : ""}
                          onClick={() =>
                            setAction(role, { type: "attack", target: t.value })
                          }
                        >
                          {t.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="targetGroup">
                  <div className="targetTitle">中立</div>
                  <div className="targetButtons">
                    {neutralObjectives.length === 0 ? (
                      <div className="targetEmpty">なし</div>
                    ) : (
                      neutralObjectives.map((t) => (
                        <button
                          key={t.value}
                          className={action.target === t.value ? "targetSelected" : ""}
                          onClick={() =>
                            setAction(role, { type: "attack", target: t.value })
                          }
                        >
                          {t.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="actionPreview">
                  target: {action.target || "未選択"}
                </div>
              </div>
            )}

            {action.type === "recall" && (
              <div className="actionSection">
                <div className="actionLabel">購入内容</div>
                <div className="targetButtons">
                  {RECALL_CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      className={action.buyChoice === choice.value ? "targetSelected" : ""}
                      onClick={() =>
                        setAction(role, { type: "recall", buyChoice: choice.value })
                      }
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <div className="actionPreview">
                  {action.buyChoice === "atk" && "FOUNTAIN に戻り、2Gあれば ATK+1"}
                  {action.buyChoice === "hp" && "FOUNTAIN に戻り、2Gあれば HP+1"}
                  {action.buyChoice === "save" && "FOUNTAIN に戻り、ゴールドを温存"}
                </div>
              </div>
            )}

            {action.type === "wait" && (
              <div className="actionSection">
                <div className="actionPreview">待機</div>
              </div>
            )}
          </div>
        );
      })}

      <button className="submitTurn" onClick={onSubmit}>
        ターン確定
      </button>
    </div>
  );
}