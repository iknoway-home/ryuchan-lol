import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const ROLES = ["TOP", "JG", "MID", "ADC", "SUP"];
const ROLE_PRIORITY = { TOP: 0, JG: 1, MID: 2, ADC: 3, SUP: 4 };

const TOWER_DAMAGE = 2;
const TOWER_DAMAGE_TO_MINION = 1;
const BARON_BUFF_TURNS = 4;

const MINION_MAX_HP = 4;
const MINION_ATK = 1;
const MINION_SPAWN_INTERVAL = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adjacency = JSON.parse(
  fs.readFileSync(path.join(__dirname, "adjacency.json"), "utf-8")
);

const MINION_ROUTES = {
  blue: {
    TOP: ["T3_B", "T2_B", "T1_B", "T1_R", "T2_R", "T3_R", "NEXUS_R"],
    MID: ["M3_B", "M2_B", "M1_B", "M1_R", "M2_R", "M3_R", "NEXUS_R"],
    BOT: ["B3_B", "B2_B", "B1_B", "B1_R", "B2_R", "B3_R", "NEXUS_R"]
  },
  red: {
    TOP: ["T3_R", "T2_R", "T1_R", "T1_B", "T2_B", "T3_B", "NEXUS_B"],
    MID: ["M3_R", "M2_R", "M1_R", "M1_B", "M2_B", "M3_B", "NEXUS_B"],
    BOT: ["B3_R", "B2_R", "B1_R", "B1_B", "B2_B", "B3_B", "NEXUS_B"]
  }
};

function d6(rng = Math.random) {
  return 1 + Math.floor(rng() * 6);
}

function shuffle(array, rng = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initUnit(hp, zone) {
  return {
    hp,
    maxHp: hp,
    atk: 1,
    gold: 0,
    zone,
    respawnIn: 0,
    deathCount: 0,
    lastHitBy: null
  };
}

function recallZone(side) {
  return side === "blue" ? "FOUNTAIN_B" : "FOUNTAIN_R";
}

function isAlive(u) {
  return !!u && u.hp > 0 && u.respawnIn === 0;
}

function isActiveStructure(st) {
  if (st.kind === "inhib") {
    return st.hp > 0 && (st.respawnIn ?? 0) === 0;
  }
  return st.hp > 0;
}

function legalMove(from, to) {
  const next = adjacency[from] || [];
  return next.includes(to);
}

function isDestroyedStructure(state, id) {
  const st = state.structures[id];
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

function getUnitAttackDamage(state, side, role) {
  const unit = state.units?.[side]?.[role];
  if (!unit) return 0;

  const baseAtk = unit.atk ?? 1;
  const baronBonus = (state.teamBuffs?.[side]?.baronTurns ?? 0) > 0 ? 1 : 0;
  return baseAtk + baronBonus;
}

function applyDragonBuff(state, side, turnLog) {
  state.teamBuffs[side].dragonStacks += 1;

  for (const role of ROLES) {
    const unit = state.units[side][role];
    unit.maxHp += 1;
    unit.hp += 1;
  }

  turnLog.push(
    `${side} secures DRAGON: team gains +1 maxHp/+1 hp (stacks=${state.teamBuffs[side].dragonStacks})`
  );
}

function applyBaronBuff(state, side, turnLog) {
  state.teamBuffs[side].baronTurns = BARON_BUFF_TURNS;
  turnLog.push(`${side} secures BARON: team gains +1 atk for next 3 turns`);
}

function tickTeamBuffs(state, turnLog) {
  for (const side of ["blue", "red"]) {
    const buffs = state.teamBuffs?.[side];
    if (!buffs) continue;

    if (buffs.baronTurns > 0) {
      buffs.baronTurns -= 1;
      if (buffs.baronTurns === 0) {
        turnLog.push(`${side} BARON buff expired`);
      }
    }
  }
}

function createMinion(state, side, lane) {
  const route = MINION_ROUTES[side][lane];
  const id = `MN_${side.toUpperCase()}_${lane}_${state.nextMinionId++}`;

  return {
    id,
    side,
    lane,
    kind: "melee",
    zone: route[0],
    hp: MINION_MAX_HP,
    maxHp: MINION_MAX_HP,
    atk: MINION_ATK
  };
}

function spawnMinionWave(state, turnLog) {
  for (const side of ["blue", "red"]) {
    for (const lane of ["TOP", "MID", "BOT"]) {
      const minion = createMinion(state, side, lane);
      state.minions.push(minion);
      turnLog.push(`${minion.id} spawns at ${minion.zone}`);
    }
  }
}

function cleanupDeadMinions(state) {
  state.minions = state.minions.filter((m) => m.hp > 0);
}

function findMinionById(state, id) {
  return (state.minions || []).find((m) => m.id === id) || null;
}

function getEnemySide(side) {
  return side === "blue" ? "red" : "blue";
}

function selectChampionTargetInZone(state, side, zone) {
  const candidates = ROLES
    .map((role) => ({ role, unit: state.units[side][role] }))
    .filter(({ unit }) => isAlive(unit) && unit.zone === zone);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.unit.hp !== b.unit.hp) return a.unit.hp - b.unit.hp;
    return ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
  });

  return { side, role: candidates[0].role };
}

function selectEnemyMinionInZone(state, side, zone) {
  const candidates = (state.minions || [])
    .filter((m) => m.side === side && m.zone === zone && m.hp > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.hp !== b.hp) return a.hp - b.hp;
    return a.id.localeCompare(b.id);
  });

  return candidates[0];
}

function selectStructureTargetInZone(state, side, zone) {
  const candidates = Object.values(state.structures || {})
    .filter(
      (st) =>
        st.owner === side &&
        isActiveStructure(st) &&
        st.zone === zone &&
        canAttackStructure(state, st.id)
    );

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.id.localeCompare(b.id));
  return candidates[0];
}

function getNextMinionZone(minion) {
  const route = MINION_ROUTES[minion.side][minion.lane];
  const idx = route.indexOf(minion.zone);
  if (idx < 0 || idx >= route.length - 1) return null;
  return route[idx + 1];
}

function applyDeathAndReward(state, victimSide, victimRole, turnLog) {
  const victim = state.units[victimSide][victimRole];
  if (victim.hp > 0) return;
  if (victim.respawnIn > 0) return;

  if (victim.lastHitBy && victim.lastHitBy.role) {
    const killer = state.units[victim.lastHitBy.side][victim.lastHitBy.role];
    if (killer) {
      killer.gold += 3;
      turnLog.push(`${victim.lastHitBy.side}.${victim.lastHitBy.role} gains +3G`);
    }
  }

  victim.hp = 0;
  victim.deathCount += 1;
  victim.respawnIn = 2;
  victim.lastHitBy = null;

  turnLog.push(`${victimSide}.${victimRole} dies (respawnIn=${victim.respawnIn})`);
}

function applyRecallPurchase(unit, buyChoice, turnLog, side, role) {
  const choice = buyChoice || "save";

  if (choice === "save") {
    turnLog.push(`${side}.${role} saves gold`);
    return;
  }

  if (unit.gold < 2) {
    turnLog.push(`${side}.${role} lacks gold for ${choice.toUpperCase()} purchase`);
    return;
  }

  unit.gold -= 2;

  if (choice === "atk") {
    unit.atk += 1;
    turnLog.push(`${side}.${role} buys ATK+1`);
    return;
  }

  if (choice === "hp") {
    unit.maxHp += 1;
    unit.hp += 1;
    turnLog.push(`${side}.${role} buys HP+1`);
  }
}

function buildStructures() {
  const s = {};

  s.NX_B = {
    id: "NX_B",
    kind: "nexus",
    owner: "blue",
    zone: "NEXUS_B",
    hp: 20,
    maxHp: 20
  };
  s.NX_R = {
    id: "NX_R",
    kind: "nexus",
    owner: "red",
    zone: "NEXUS_R",
    hp: 20,
    maxHp: 20
  };

  s.TWR_T1_B = { id: "TWR_T1_B", kind: "tower", owner: "blue", zone: "T1_B", hp: 10, maxHp: 10 };
  s.TWR_T2_B = { id: "TWR_T2_B", kind: "tower", owner: "blue", zone: "T2_B", hp: 10, maxHp: 10 };
  s.TWR_M1_B = { id: "TWR_M1_B", kind: "tower", owner: "blue", zone: "M1_B", hp: 10, maxHp: 10 };
  s.TWR_M2_B = { id: "TWR_M2_B", kind: "tower", owner: "blue", zone: "M2_B", hp: 10, maxHp: 10 };
  s.TWR_B1_B = { id: "TWR_B1_B", kind: "tower", owner: "blue", zone: "B1_B", hp: 10, maxHp: 10 };
  s.TWR_B2_B = { id: "TWR_B2_B", kind: "tower", owner: "blue", zone: "B2_B", hp: 10, maxHp: 10 };

  s.TWR_T1_R = { id: "TWR_T1_R", kind: "tower", owner: "red", zone: "T1_R", hp: 10, maxHp: 10 };
  s.TWR_T2_R = { id: "TWR_T2_R", kind: "tower", owner: "red", zone: "T2_R", hp: 10, maxHp: 10 };
  s.TWR_M1_R = { id: "TWR_M1_R", kind: "tower", owner: "red", zone: "M1_R", hp: 10, maxHp: 10 };
  s.TWR_M2_R = { id: "TWR_M2_R", kind: "tower", owner: "red", zone: "M2_R", hp: 10, maxHp: 10 };
  s.TWR_B1_R = { id: "TWR_B1_R", kind: "tower", owner: "red", zone: "B1_R", hp: 10, maxHp: 10 };
  s.TWR_B2_R = { id: "TWR_B2_R", kind: "tower", owner: "red", zone: "B2_R", hp: 10, maxHp: 10 };

  s.INH_T3_B = { id: "INH_T3_B", kind: "inhib", owner: "blue", zone: "T3_B", hp: 10, maxHp: 10, respawnIn: 0 };
  s.INH_M3_B = { id: "INH_M3_B", kind: "inhib", owner: "blue", zone: "M3_B", hp: 10, maxHp: 10, respawnIn: 0 };
  s.INH_B3_B = { id: "INH_B3_B", kind: "inhib", owner: "blue", zone: "B3_B", hp: 10, maxHp: 10, respawnIn: 0 };

  s.INH_T3_R = { id: "INH_T3_R", kind: "inhib", owner: "red", zone: "T3_R", hp: 10, maxHp: 10, respawnIn: 0 };
  s.INH_M3_R = { id: "INH_M3_R", kind: "inhib", owner: "red", zone: "M3_R", hp: 10, maxHp: 10, respawnIn: 0 };
  s.INH_B3_R = { id: "INH_B3_R", kind: "inhib", owner: "red", zone: "B3_R", hp: 10, maxHp: 10, respawnIn: 0 };

  return s;
}

export function createInitialState(roomId) {
  return {
    roomId,
    turn: 1,
    phase: "planning",
    players: { blue: null, red: null },
    units: {
      blue: {
        TOP: initUnit(4, "FOUNTAIN_B"),
        JG: initUnit(3, "FOUNTAIN_B"),
        MID: initUnit(3, "FOUNTAIN_B"),
        ADC: initUnit(3, "FOUNTAIN_B"),
        SUP: initUnit(3, "FOUNTAIN_B")
      },
      red: {
        TOP: initUnit(4, "FOUNTAIN_R"),
        JG: initUnit(3, "FOUNTAIN_R"),
        MID: initUnit(3, "FOUNTAIN_R"),
        ADC: initUnit(3, "FOUNTAIN_R"),
        SUP: initUnit(3, "FOUNTAIN_R")
      }
    },
    structures: buildStructures(),
    neutralObjectives: [
      { id: "DRAGON", kind: "objective", owner: "neutral", zone: "DRAGON", hp: 8, maxHp: 8 },
      { id: "BARON", kind: "objective", owner: "neutral", zone: "BARON", hp: 10, maxHp: 10 }
    ],
    teamBuffs: {
      blue: { dragonStacks: 0, baronTurns: 0 },
      red: { dragonStacks: 0, baronTurns: 0 }
    },
    minions: [],
    nextMinionId: 1,
    submitted: { blue: null, red: null },
    log: []
  };
}

export function validateActions(state, side, actions) {
  if (!actions || typeof actions !== "object") {
    return { ok: false, error: "actions_missing" };
  }

  const structureIds = new Set(Object.keys(state.structures));
  const neutralIds = new Set((state.neutralObjectives || []).map((o) => o.id));
  const minionIds = new Set((state.minions || []).map((m) => m.id));

  for (const role of ROLES) {
    const a = actions[role];
    if (!a || typeof a.type !== "string") {
      return { ok: false, error: `action_missing_${role}` };
    }

    const u = state.units[side][role];
    if (!u || !isAlive(u)) continue;

    if (a.type === "move") {
      if (typeof a.to !== "string") return { ok: false, error: `move_to_missing_${role}` };
      if (!legalMove(u.zone, a.to)) return { ok: false, error: `illegal_move_${role}` };
    } else if (a.type === "attack") {
      if (typeof a.target !== "string") return { ok: false, error: `attack_target_missing_${role}` };
      const ok =
        ROLES.includes(a.target) ||
        structureIds.has(a.target) ||
        neutralIds.has(a.target) ||
        minionIds.has(a.target);
      if (!ok) return { ok: false, error: `attack_target_invalid_${role}` };
    } else if (a.type === "recall") {
      if (a.buyChoice != null && !["atk", "hp", "save"].includes(a.buyChoice)) {
        return { ok: false, error: `recall_buy_invalid_${role}` };
      }
    } else if (a.type === "wait") {
      // ok
    } else {
      return { ok: false, error: `unknown_action_${role}` };
    }
  }

  return { ok: true };
}

function buildChampionIntentQueue(state, actions) {
  const championQueue = [];
  const neutralQueue = [];

  for (const side of ["blue", "red"]) {
    const enemySide = getEnemySide(side);

    for (const role of ROLES) {
      const actor = state.units[side][role];
      const action = actions[side][role];
      if (!actor || !action || !isAlive(actor)) continue;

      if (action.type === "move") {
        championQueue.push({
          actorType: "champion",
          side,
          role,
          type: "move",
          to: action.to
        });
      } else if (action.type === "recall") {
        championQueue.push({
          actorType: "champion",
          side,
          role,
          type: "recall",
          buyChoice: action.buyChoice
        });
      } else if (action.type === "attack") {
        const target = action.target;

        if (ROLES.includes(target)) {
          championQueue.push({
            actorType: "champion",
            side,
            role,
            type: "attack_champion",
            targetSide: enemySide,
            targetRole: target
          });
        } else if ((state.minions || []).some((m) => m.id === target)) {
          championQueue.push({
            actorType: "champion",
            side,
            role,
            type: "attack_minion",
            minionId: target
          });
        } else if ((state.structures || {})[target]) {
          championQueue.push({
            actorType: "champion",
            side,
            role,
            type: "attack_structure",
            structureId: target
          });
        } else if ((state.neutralObjectives || []).some((o) => o.id === target)) {
          neutralQueue.push({
            actorType: "champion",
            side,
            role,
            type: "attack_objective",
            objectiveId: target
          });
        } else {
          championQueue.push({
            actorType: "champion",
            side,
            role,
            type: "wait"
          });
        }
      } else {
        championQueue.push({
          actorType: "champion",
          side,
          role,
          type: "wait"
        });
      }
    }
  }

  return { championQueue, neutralQueue };
}

function buildMinionAndTowerIntentQueue(state) {
  const queue = [];

  for (const minion of state.minions || []) {
    if (minion.hp <= 0) continue;

    const enemySide = getEnemySide(minion.side);
    const enemyMinion = selectEnemyMinionInZone(state, enemySide, minion.zone);

    if (enemyMinion) {
      queue.push({
        actorType: "minion",
        minionId: minion.id,
        type: "attack_minion",
        targetMinionId: enemyMinion.id
      });
      continue;
    }

    const champTarget = selectChampionTargetInZone(state, enemySide, minion.zone);
    if (champTarget) {
      queue.push({
        actorType: "minion",
        minionId: minion.id,
        type: "attack_champion",
        targetSide: champTarget.side,
        targetRole: champTarget.role
      });
      continue;
    }

    const structureTarget = selectStructureTargetInZone(state, enemySide, minion.zone);
    if (structureTarget) {
      queue.push({
        actorType: "minion",
        minionId: minion.id,
        type: "attack_structure",
        structureId: structureTarget.id
      });
      continue;
    }

    const nextZone = getNextMinionZone(minion);
    if (nextZone) {
      queue.push({
        actorType: "minion",
        minionId: minion.id,
        type: "move",
        to: nextZone
      });
    }
  }

  for (const st of Object.values(state.structures || {})) {
    if (st.kind !== "tower") continue;
    if (!isActiveStructure(st)) continue;

    const enemySide = getEnemySide(st.owner);
    const minionTarget = selectEnemyMinionInZone(state, enemySide, st.zone);

    if (minionTarget) {
      queue.push({
        actorType: "tower",
        towerId: st.id,
        type: "attack_minion",
        targetMinionId: minionTarget.id
      });
      continue;
    }

    const champTarget = selectChampionTargetInZone(state, enemySide, st.zone);
    if (champTarget) {
      queue.push({
        actorType: "tower",
        towerId: st.id,
        type: "attack_champion",
        targetSide: champTarget.side,
        targetRole: champTarget.role
      });
    }
  }

  return queue;
}

function executeChampionIntent(state, intent, turnLog, rng) {
  const actor = state.units?.[intent.side]?.[intent.role];
  if (!actor || !isAlive(actor)) return;

  if (intent.type === "move") {
    if (!intent.to || !legalMove(actor.zone, intent.to)) return;
    actor.zone = intent.to;
    turnLog.push(`${intent.side}.${intent.role} moves to ${intent.to}`);
    return;
  }

  if (intent.type === "recall") {
    actor.zone = recallZone(intent.side);
    applyRecallPurchase(actor, intent.buyChoice, turnLog, intent.side, intent.role);
    turnLog.push(`${intent.side}.${intent.role} recalls to ${actor.zone}`);
    return;
  }

  if (intent.type === "attack_champion") {
    const target = state.units?.[intent.targetSide]?.[intent.targetRole];
    if (!target || !isAlive(target)) return;
    if (target.zone !== actor.zone) return;

    const damage = getUnitAttackDamage(state, intent.side, intent.role);
    const roll = d6(rng);
    target.hp -= damage;
    target.lastHitBy = { side: intent.side, role: intent.role };

    turnLog.push(
      `${intent.side}.${intent.role} attacks ${intent.targetSide}.${intent.targetRole} [${roll}] (-${damage}) => ${Math.max(0, target.hp)}`
    );

    if (target.hp <= 0) {
      applyDeathAndReward(state, intent.targetSide, intent.targetRole, turnLog);
    }
    return;
  }

  if (intent.type === "attack_minion") {
    const target = findMinionById(state, intent.minionId);
    if (!target || target.hp <= 0) return;
    if (target.zone !== actor.zone) return;

    const damage = getUnitAttackDamage(state, intent.side, intent.role);
    const roll = d6(rng);
    target.hp -= damage;

    turnLog.push(
      `${intent.side}.${intent.role} attacks ${target.id} [${roll}] (-${damage}) => ${Math.max(0, target.hp)}`
    );

    if (target.hp <= 0) {
      actor.gold += 1;
      turnLog.push(`${intent.side}.${intent.role} kills ${target.id} (+1G)`);
      cleanupDeadMinions(state);
    }
    return;
  }

  if (intent.type === "attack_structure") {
    const target = state.structures?.[intent.structureId];
    if (!target || !isActiveStructure(target)) return;
    if (target.owner === intent.side) return;
    if (target.zone !== actor.zone) return;
    if (!canAttackStructure(state, target.id)) return;

    const damage = getUnitAttackDamage(state, intent.side, intent.role);
    const roll = d6(rng);

    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;

    turnLog.push(
      `${intent.side}.${intent.role} attacks ${target.id} [${roll}] (-${damage}) => ${target.hp}`
    );

    if (target.hp === 0) {
      if (target.kind === "tower") {
        actor.gold += 5;
        turnLog.push(`${intent.side}.${intent.role} destroys ${target.id} (+5G)`);
      } else if (target.kind === "inhib") {
        actor.gold += 3;
        target.respawnIn = 3;
        turnLog.push(`${intent.side}.${intent.role} destroys ${target.id} (+3G, respawnIn=3)`);
      } else if (target.kind === "nexus") {
        turnLog.push(`${intent.side}.${intent.role} destroys ${target.id}`);
      }
    }
  }
}

function executeMinionOrTowerIntent(state, intent, turnLog) {
  if (intent.actorType === "minion") {
    const actor = findMinionById(state, intent.minionId);
    if (!actor || actor.hp <= 0) return;

    if (intent.type === "move") {
      actor.zone = intent.to;
      turnLog.push(`${actor.id} moves to ${intent.to}`);
      return;
    }

    if (intent.type === "attack_minion") {
      const target = findMinionById(state, intent.targetMinionId);
      if (!target || target.hp <= 0) return;
      if (target.zone !== actor.zone) return;

      target.hp -= actor.atk;
      turnLog.push(`${actor.id} hits ${target.id} (-${actor.atk}) => ${Math.max(0, target.hp)}`);
      cleanupDeadMinions(state);
      return;
    }

    if (intent.type === "attack_champion") {
      const target = state.units?.[intent.targetSide]?.[intent.targetRole];
      if (!target || !isAlive(target)) return;
      if (target.zone !== actor.zone) return;

      target.hp -= actor.atk;
      target.lastHitBy = { side: actor.side, role: null, source: actor.id };
      turnLog.push(`${actor.id} hits ${intent.targetSide}.${intent.targetRole} (-${actor.atk}) => ${Math.max(0, target.hp)}`);

      if (target.hp <= 0) {
        applyDeathAndReward(state, intent.targetSide, intent.targetRole, turnLog);
      }
      return;
    }

    if (intent.type === "attack_structure") {
      const target = state.structures?.[intent.structureId];
      if (!target || !isActiveStructure(target)) return;
      if (target.zone !== actor.zone) return;
      if (target.owner === actor.side) return;
      if (!canAttackStructure(state, target.id)) return;

      target.hp -= actor.atk;
      if (target.hp < 0) target.hp = 0;

      turnLog.push(`${actor.id} hits ${target.id} (-${actor.atk}) => ${target.hp}`);

      if (target.hp === 0) {
        if (target.kind === "inhib") {
          target.respawnIn = 3;
        }
        turnLog.push(`${actor.id} destroys ${target.id}`);
      }
    }

    return;
  }

  if (intent.actorType === "tower") {
    const tower = state.structures?.[intent.towerId];
    if (!tower || tower.kind !== "tower" || !isActiveStructure(tower)) return;

    if (intent.type === "attack_minion") {
      const target = findMinionById(state, intent.targetMinionId);
      if (!target || target.hp <= 0) return;
      if (target.zone !== tower.zone) return;

      target.hp -= TOWER_DAMAGE_TO_MINION;
      turnLog.push(`${tower.id} shoots ${target.id} (-${TOWER_DAMAGE_TO_MINION}) => ${Math.max(0, target.hp)}`);
      cleanupDeadMinions(state);
      return;
    }

    if (intent.type === "attack_champion") {
      const target = state.units?.[intent.targetSide]?.[intent.targetRole];
      if (!target || !isAlive(target)) return;
      if (target.zone !== tower.zone) return;

      target.hp -= TOWER_DAMAGE;
      if (target.hp < 0) target.hp = 0;
      target.lastHitBy = { side: tower.owner, role: null, source: tower.id };

      turnLog.push(`${tower.id} shoots ${intent.targetSide}.${intent.targetRole} (-${TOWER_DAMAGE}) => ${target.hp}`);

      if (target.hp === 0) {
        applyDeathAndReward(state, intent.targetSide, intent.targetRole, turnLog);
      }
    }
  }
}

function executeNeutralQueue(state, queue, turnLog, rng) {
  for (const intent of queue) {
    const actor = state.units?.[intent.side]?.[intent.role];
    if (!actor || !isAlive(actor)) continue;

    const obj = (state.neutralObjectives || []).find((o) => o.id === intent.objectiveId);
    if (!obj || obj.hp <= 0) continue;
    if (obj.zone !== actor.zone) continue;

    const damage = getUnitAttackDamage(state, intent.side, intent.role);
    const roll = d6(rng);

    obj.hp -= damage;
    if (obj.hp < 0) obj.hp = 0;

    turnLog.push(
      `${intent.side}.${intent.role} attacks ${obj.id} [${roll}] (-${damage}) => ${obj.hp}`
    );

    if (obj.hp === 0) {
      actor.gold += obj.id === "BARON" ? 6 : 4;
      turnLog.push(`${intent.side}.${intent.role} secures ${obj.id} (+${obj.id === "BARON" ? 6 : 4}G)`);

      if (obj.id === "DRAGON") {
        applyDragonBuff(state, intent.side, turnLog);
      } else if (obj.id === "BARON") {
        applyBaronBuff(state, intent.side, turnLog);
      }
    }
  }
}

export function resolveTurn(state, rng = Math.random) {
  if (!state.submitted.blue || !state.submitted.red) {
    throw new Error("Both players must submit actions.");
  }

  state.phase = "resolving";
  const turnLog = [];
  const actions = state.submitted;

  const preDecidedMinionTowerQueue = buildMinionAndTowerIntentQueue(state);
  const { championQueue, neutralQueue } = buildChampionIntentQueue(state, actions);

  const randomizedChampionQueue = shuffle(championQueue, rng);
  const randomizedMinionTowerQueue = shuffle(preDecidedMinionTowerQueue, rng);

  for (const intent of randomizedChampionQueue) {
    executeChampionIntent(state, intent, turnLog, rng);
    cleanupDeadMinions(state);
  }

  for (const intent of randomizedMinionTowerQueue) {
    executeMinionOrTowerIntent(state, intent, turnLog);
    cleanupDeadMinions(state);
  }

  executeNeutralQueue(state, neutralQueue, turnLog, rng);

  for (const side of ["blue", "red"]) {
    for (const role of ROLES) {
      const unit = state.units[side][role];
      if (unit.respawnIn > 0) {
        unit.respawnIn -= 1;
        if (unit.respawnIn === 0) {
          unit.hp = unit.maxHp;
          unit.zone = recallZone(side);
          turnLog.push(`${side}.${role} respawns at ${unit.zone}`);
        }
      }
    }
  }

  for (const st of Object.values(state.structures)) {
    if (st.kind === "inhib" && st.respawnIn > 0) {
      st.respawnIn -= 1;
      if (st.respawnIn === 0) {
        st.hp = st.maxHp;
        turnLog.push(`${st.id} respawns`);
      }
    }
  }

  tickTeamBuffs(state, turnLog);

  if (state.turn % MINION_SPAWN_INTERVAL === 0) {
    spawnMinionWave(state, turnLog);
  }

  let winner = null;
  if (state.structures.NX_B.hp <= 0 && state.structures.NX_R.hp <= 0) winner = "draw";
  else if (state.structures.NX_B.hp <= 0) winner = "red";
  else if (state.structures.NX_R.hp <= 0) winner = "blue";

  state.log.push({ turn: state.turn, events: turnLog });
  state.submitted = { blue: null, red: null };

  if (winner) {
    state.phase = "gameover";
    state.winner = winner;
  } else {
    state.turn += 1;
    state.phase = "planning";
  }

  return { turnLog, winner };
}