import React, { useEffect, useState } from "react";
import { createSocket } from "./net/socket.js";
import Board from "./ui/Board.jsx";
import ActionPanel from "./ui/ActionPanel.jsx";
import TeamStatusPanel from "./ui/TeamStatusPanel.jsx";
import NeutralObjectivesPanel from "./ui/NeutralObjectivesPanel.jsx";
import TurnLogPanel from "./ui/TurnLogPanel.jsx";
import { loadZones } from "./game/zones.js";

const INITIAL_DRAFT_ACTIONS = {
  TOP: { type: "wait" },
  JG: { type: "wait" },
  MID: { type: "wait" },
  ADC: { type: "wait" },
  SUP: { type: "wait" }
};

export default function App() {
  const [socket, setSocket] = useState(null);
  const [state, setState] = useState(null);
  const [zones] = useState(loadZones());
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [draftActions, setDraftActions] = useState(INITIAL_DRAFT_ACTIONS);

  const [roomIdInput, setRoomIdInput] = useState("");
  const [mySide, setMySide] = useState("blue");

  useEffect(() => {
    const s = createSocket();
    setSocket(s);

    s.on("connect", () => {
      console.log("socket connected:", s.id);
    });

    s.on("room:joined", ({ state: joinedState, side }) => {
      setState(joinedState);
      setMySide(side || "blue");
      setLastError(null);
    });

    s.on("state:update", (st) => {
      setState(st);
    });

    s.on("turn:resolved", () => {
      setLastError(null);
    });

    s.on("error", (err) => {
      setLastError(err);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  function createRoom() {
    if (!socket) return;
    setLastError(null);
    socket.emit("room:create");
  }

  function joinRoom() {
    if (!socket) return;
    if (!roomIdInput.trim()) return;

    setLastError(null);
    socket.emit("room:join", {
      roomId: roomIdInput.trim()
    });
  }

  function submitTurn() {
    if (!socket || !state?.roomId) return;
    setLastError(null);
    socket.emit("turn:submit", {
      roomId: state.roomId,
      actions: draftActions
    });
  }

  return (
    <div className="app">
      <TeamStatusPanel
        side="blue"
        units={state?.units?.blue}
        structures={state?.structures}
      />

      <Board
        state={state}
        zones={zones}
        selectedZoneId={selectedZoneId}
        setSelectedZoneId={setSelectedZoneId}
        selectedRole={selectedRole}
        mySide={mySide}
      />

      <div className="rightSide">
        <div className="gameInfoBox">
          <div style={{ marginBottom: 8 }}>
            <button onClick={createRoom}>部屋を作る</button>
          </div>

          <div style={{ marginBottom: 6, fontWeight: 700 }}>
            ルーム参加
          </div>

          <input
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="roomId を入力"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginBottom: 8,
              padding: "6px 8px"
            }}
          />

          <button onClick={joinRoom} style={{ width: "100%" }}>
            参加する
          </button>
        </div>

        {state && (
          <div className="gameInfoBox">
            <div>Room: <strong>{state.roomId}</strong></div>
            <div>My Side: <strong>{mySide}</strong></div>
            <div>Turn: <strong>{state.turn}</strong></div>
            <div>Phase: <strong>{state.phase}</strong></div>
            {state.winner && (
              <div>Winner: <strong>{state.winner}</strong></div>
            )}
          </div>
        )}

        {lastError && (
          <div className="errorBox">
            {typeof lastError === "string"
              ? lastError
              : `${lastError.code ?? "error"}${lastError.detail ? ` : ${lastError.detail}` : ""}`}
          </div>
        )}

        <ActionPanel
          draftActions={draftActions}
          setDraftActions={setDraftActions}
          onSubmit={submitTurn}
          selectedZoneId={selectedZoneId}
          state={state}
          mySide={mySide}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />

        <NeutralObjectivesPanel
          neutralObjectives={state?.neutralObjectives ?? []}
          teamBuffs={state?.teamBuffs}
        />

        <TurnLogPanel logs={state?.log ?? []} />
      </div>

      <TeamStatusPanel
        side="red"
        units={state?.units?.red}
        structures={state?.structures}
      />
    </div>
  );
}