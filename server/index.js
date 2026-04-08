import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createInitialState, validateActions, resolveTurn } from "./rules/game.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const rooms = new Map();

function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ★ healthチェック（超重要）
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("room:create", () => {
    const roomId = makeRoomId();
    const state = createInitialState(roomId);

    state.players.blue = socket.id;
    rooms.set(roomId, state);

    socket.join(roomId);

    socket.emit("room:joined", {
      state,
      side: "blue"
    });
  });

  socket.on("room:join", ({ roomId }) => {
    const state = rooms.get(roomId);

    if (!state) {
      socket.emit("error", { code: "room_not_found" });
      return;
    }

    if (state.players.red && state.players.red !== socket.id) {
      socket.emit("error", { code: "room_full" });
      return;
    }

    state.players.red = socket.id;
    socket.join(roomId);

    socket.emit("room:joined", {
      state,
      side: "red"
    });

    io.to(roomId).emit("state:update", state);
  });

  socket.on("turn:submit", ({ roomId, actions }) => {
    const state = rooms.get(roomId);
    if (!state) {
      socket.emit("error", { code: "room_not_found" });
      return;
    }

    let side = null;
    if (state.players.blue === socket.id) side = "blue";
    if (state.players.red === socket.id) side = "red";

    if (!side) {
      socket.emit("error", { code: "not_in_room" });
      return;
    }

    const check = validateActions(state, side, actions);
    if (!check.ok) {
      socket.emit("error", { code: "invalid_actions", detail: check.error });
      return;
    }

    state.submitted[side] = actions;

    if (!state.submitted.blue || !state.submitted.red) {
      io.to(roomId).emit("state:update", state);
      return;
    }

    const result = resolveTurn(state);

    io.to(roomId).emit("turn:resolved", result);
    io.to(roomId).emit("state:update", state);
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
  });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});