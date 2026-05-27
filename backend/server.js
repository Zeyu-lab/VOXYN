/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Import backend dependencies
========================================================= */
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
require("dotenv").config();

/* =========================================================
   SECTION 2: App Setup
   Purpose:
   - Create Express app
   - Setup JSON and CORS
========================================================= */
const app = express();

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

/* =========================================================
   SECTION 3: Basic API Routes
   Purpose:
   - Keep existing backend test routes
========================================================= */
app.get("/", (req, res) => {
  res.send("VOXYN backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "VOXYN API is working",
  });
});

/* =========================================================
   SECTION 4: HTTP Server + Socket.IO Setup
   Purpose:
   - Socket.IO needs to attach to an HTTP server
========================================================= */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* =========================================================
   SECTION 5: In-Memory Room Store
   Purpose:
   - Store online users and temporary chat messages
   - This is MVP memory storage only
========================================================= */
const rooms = new Map();

const MAX_MESSAGES_PER_ROOM = 50;

function getOrCreateRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      users: new Map(),
      messages: [],
    });
  }

  return rooms.get(roomCode);
}

function getRoomUsers(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) {
    return [];
  }

  return Array.from(room.users.values());
}

function cleanEmptyRoom(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) {
    return;
  }

  if (room.users.size === 0) {
    rooms.delete(roomCode);
  }
}

/* =========================================================
   SECTION 6: Socket.IO Main Logic
   Purpose:
   - Handle room join, chat messages, users, leave, disconnect
========================================================= */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* =====================================================
     SECTION 6.1: Join Room
     Purpose:
     - User joins a room by roomCode
  ===================================================== */
  socket.on("room:join", (payload, callback) => {
    try {
      const roomCode = String(payload?.roomCode || "").trim();
      const username = String(payload?.username || "Guest").trim();

      if (!roomCode) {
        if (callback) {
          callback({
            ok: false,
            error: "Room code is required.",
          });
        }

        return;
      }

      const room = getOrCreateRoom(roomCode);

      socket.join(roomCode);

      socket.data.roomCode = roomCode;
      socket.data.username = username;

      room.users.set(socket.id, {
        socketId: socket.id,
        username,
        joinedAt: Date.now(),
      });

      socket.emit("room:history", room.messages);

      io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

      socket.to(roomCode).emit("room:system", {
        id: crypto.randomUUID(),
        type: "system",
        message: `${username} joined the room.`,
        createdAt: Date.now(),
      });

      if (callback) {
        callback({
          ok: true,
          roomCode,
        });
      }
    } catch (error) {
      console.error("room:join error:", error);

      if (callback) {
        callback({
          ok: false,
          error: "Failed to join room.",
        });
      }
    }
  });

  /* =====================================================
     SECTION 6.2: Send Chat Message
     Purpose:
     - Receive message from one user
     - Broadcast to everyone in the room
  ===================================================== */
  socket.on("chat:send", (payload, callback) => {
    try {
      const roomCode = String(
        payload?.roomCode || socket.data.roomCode || ""
      ).trim();

      const username = String(
        payload?.username || socket.data.username || "Guest"
      ).trim();

      const message = String(payload?.message || "").trim();

      if (!roomCode) {
        if (callback) {
          callback({
            ok: false,
            error: "Room code is missing.",
          });
        }

        return;
      }

      if (!message) {
        if (callback) {
          callback({
            ok: false,
            error: "Message cannot be empty.",
          });
        }

        return;
      }

      const room = getOrCreateRoom(roomCode);

      const chatMessage = {
        id: crypto.randomUUID(),
        type: "chat",
        socketId: socket.id,
        username,
        message,
        createdAt: Date.now(),
      };

      room.messages.push(chatMessage);

      if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
        room.messages.shift();
      }

      io.to(roomCode).emit("chat:new", chatMessage);

      if (callback) {
        callback({
          ok: true,
        });
      }
    } catch (error) {
      console.error("chat:send error:", error);

      if (callback) {
        callback({
          ok: false,
          error: "Failed to send message.",
        });
      }
    }
  });

  /* =====================================================
     SECTION 6.3: Leave Room Manually
     Purpose:
     - Remove user from room when user leaves page/button
  ===================================================== */
  socket.on("room:leave", () => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username || "Guest";

    if (!roomCode) {
      return;
    }

    const room = rooms.get(roomCode);

    if (room) {
      room.users.delete(socket.id);
    }

    socket.leave(roomCode);

    io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

    socket.to(roomCode).emit("room:system", {
      id: crypto.randomUUID(),
      type: "system",
      message: `${username} left the room.`,
      createdAt: Date.now(),
    });

    cleanEmptyRoom(roomCode);

    socket.data.roomCode = null;
    socket.data.username = null;
  });

  /* =====================================================
     SECTION 6.4: Disconnect Cleanup
     Purpose:
     - Clean user from room when tab closes or refreshes
  ===================================================== */
  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username || "Guest";

    if (!roomCode) {
      console.log("Socket disconnected:", socket.id);
      return;
    }

    const room = rooms.get(roomCode);

    if (room) {
      room.users.delete(socket.id);
    }

    io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

    socket.to(roomCode).emit("room:system", {
      id: crypto.randomUUID(),
      type: "system",
      message: `${username} disconnected.`,
      createdAt: Date.now(),
    });

    cleanEmptyRoom(roomCode);

    console.log("Socket disconnected:", socket.id);
  });
});

/* =========================================================
   SECTION 7: Start Server
   Purpose:
   - Start Express + Socket.IO backend
========================================================= */
server.listen(PORT, () => {
  console.log(`VOXYN backend running on http://localhost:${PORT}`);
});