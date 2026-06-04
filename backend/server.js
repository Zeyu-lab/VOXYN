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
const path = require("path");
require("dotenv").config();

/* =========================================================
   SECTION 2: App Setup
   Purpose:
   - Create Express app
   - Setup JSON and CORS
========================================================= */
const app = express();

const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3001",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".trycloudflare.com")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());


/* =========================================================
   SECTION 3: Basic API Routes
   Purpose:
   - Keep existing backend test routes
========================================================= */
app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "VOXYN backend is running",
  });
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
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".trycloudflare.com")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
/* =================================================
   SECTION 4.1 : Serve Frontend Build
   Purpose:
   - Serve Vue production build from Express
   - Allows VOXYN to run through one HTTPS tunnel
================================================== */
const frontendDistPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  if (req.path.startsWith("/socket.io")) {
    return next();
  }

  res.sendFile(path.join(frontendDistPath, "index.html"));
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
   SECTION 5.1: Voice Channel Helpers
   Purpose:
   - Keep voice channels fixed for VOXYN v0.5
   - Prevent invalid channel names from entering room state
========================================================= */
function normalizeVoiceChannel(channel) {
  const allowedChannels = ["Lobby", "Squad", "Break"];

  if (allowedChannels.includes(channel)) {
    return channel;
  }

  return "Lobby";
}

/* =========================================================
   SECTION 6: Socket.IO Main Logic
   Purpose:
   - Handle room join, chat messages, users, leave, disconnect
   - Handle voice channel state and WebRTC signaling
========================================================= */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* =====================================================
    SECTION 6.1: Join Room
    Purpose:
    - User joins a room by roomCode
    - Save frontend profile identity into socket room users
    - Default user into a fixed voice channel
  ===================================================== */
  socket.on("room:join", (payload, callback) => {
    try {
      const roomCode = String(payload?.roomCode || "").trim();
      const username = String(payload?.username || "Guest").trim();
      const userId = String(payload?.userId || "").trim();
      const email = String(payload?.email || "").trim();
      const avatarUrl = String(payload?.avatarUrl || "").trim();
      const voiceChannel = normalizeVoiceChannel(
        payload?.voiceChannel || "Lobby"
      );

      const initial = String(
        payload?.initial || username.charAt(0) || "U"
      )
        .trim()
        .charAt(0)
        .toUpperCase();

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
      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.email = email;
      socket.data.avatarUrl = avatarUrl;
      socket.data.initial = initial;
      socket.data.voiceChannel = voiceChannel;

      room.users.set(socket.id, {
        socketId: socket.id,
        userId,
        username,
        email,
        avatarUrl,
        initial,
        voiceChannel,
        voiceChannel,
        isSpeaking: Boolean(payload?.isSpeaking),
        isMicOn: Boolean(payload?.isMicOn),
        isDeafened: Boolean(payload?.isDeafened),
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
          voiceChannel,
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
    SECTION 6.1.1: Join Voice Channel
    Purpose:
    - Move current socket user between fixed voice channels
    - Broadcast updated room users to everyone
    - Notify same room for future WebRTC connection flow
  ===================================================== */
  socket.on("voice:join", (payload, callback) => {
    try {
      const roomCode = String(
        payload?.roomCode || socket.data.roomCode || ""
      ).trim();

      const voiceChannel = normalizeVoiceChannel(payload?.voiceChannel);

      if (!roomCode) {
        if (callback) {
          callback({
            ok: false,
            error: "Room code is missing.",
          });
        }

        return;
      }

      const room = rooms.get(roomCode);

      if (!room) {
        if (callback) {
          callback({
            ok: false,
            error: "Room state not found.",
          });
        }

        return;
      }

      const currentUser = room.users.get(socket.id);

      if (!currentUser) {
        if (callback) {
          callback({
            ok: false,
            error: "User is not inside this room.",
          });
        }

        return;
      }

      const previousVoiceChannel = currentUser.voiceChannel || "Lobby";

      currentUser.voiceChannel = voiceChannel;
      socket.data.voiceChannel = voiceChannel;

      room.users.set(socket.id, currentUser);

      io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

      socket.to(roomCode).emit("voice:user-joined", {
        socketId: socket.id,
        userId: currentUser.userId,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        initial: currentUser.initial,
        voiceChannel,
        previousVoiceChannel,
      });

      socket.to(roomCode).emit("room:system", {
        id: crypto.randomUUID(),
        type: "system",
        message: `${currentUser.username || "Someone"} joined ${voiceChannel}.`,
        createdAt: Date.now(),
      });

      if (callback) {
        callback({
          ok: true,
          voiceChannel,
        });
      }
    } catch (error) {
      console.error("voice:join error:", error);

      if (callback) {
        callback({
          ok: false,
          error: "Failed to join voice channel.",
        });
      }
    }
  });

  /* =====================================================
    SECTION 6.1.2: Voice State Update
    Purpose:
    - Sync mic / headphones / speaking state
    - Used for UI indicators such as green speaking ring
  ===================================================== */
  socket.on("voice:state", (payload, callback) => {
    try {
      const roomCode = socket.data.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({
            ok: false,
            error: "Room code is missing.",
          });
        }

        return;
      }

      const room = rooms.get(roomCode);

      if (!room) {
        if (callback) {
          callback({
            ok: false,
            error: "Room state not found.",
          });
        }

        return;
      }

      const currentUser = room.users.get(socket.id);

      if (!currentUser) {
        if (callback) {
          callback({
            ok: false,
            error: "User is not inside this room.",
          });
        }

        return;
      }

      if (typeof payload?.isSpeaking === "boolean") {
        currentUser.isSpeaking = payload.isSpeaking;
      } else if (typeof payload?.speaking === "boolean") {
        currentUser.isSpeaking = payload.speaking;
      }

      if (typeof payload?.isMicOn === "boolean") {
        currentUser.isMicOn = payload.isMicOn;
      } else if (typeof payload?.micOn === "boolean") {
        currentUser.isMicOn = payload.micOn;
      }

      if (typeof payload?.isDeafened === "boolean") {
        currentUser.isDeafened = payload.isDeafened;
      } else if (typeof payload?.deafened === "boolean") {
        currentUser.isDeafened = payload.deafened;
      }

      room.users.set(socket.id, currentUser);

      io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

      if (callback) {
        callback({
          ok: true,
        });
      }
    } catch (error) {
      console.error("voice:state error:", error);

      if (callback) {
        callback({
          ok: false,
          error: "Failed to update voice state.",
        });
      }
    }
  });

  /* =====================================================
    SECTION 6.1.3: WebRTC Signaling - Offer
    Purpose:
    - Forward WebRTC offer to target socket
  ===================================================== */
  socket.on("voice:offer", (payload) => {
    const targetSocketId = payload?.targetSocketId;
    const offer = payload?.offer;

    if (!targetSocketId || !offer) {
      return;
    }

    io.to(targetSocketId).emit("voice:offer", {
      fromSocketId: socket.id,
      offer,
    });
  });

  /* =====================================================
    SECTION 6.1.4: WebRTC Signaling - Answer
    Purpose:
    - Forward WebRTC answer to target socket
  ===================================================== */
  socket.on("voice:answer", (payload) => {
    const targetSocketId = payload?.targetSocketId;
    const answer = payload?.answer;

    if (!targetSocketId || !answer) {
      return;
    }

    io.to(targetSocketId).emit("voice:answer", {
      fromSocketId: socket.id,
      answer,
    });
  });

  /* =====================================================
    SECTION 6.1.5: WebRTC Signaling - ICE Candidate
    Purpose:
    - Forward ICE candidate to target socket
  ===================================================== */
  socket.on("voice:ice-candidate", (payload) => {
    const targetSocketId = payload?.targetSocketId;
    const candidate = payload?.candidate;

    if (!targetSocketId || !candidate) {
      return;
    }

    io.to(targetSocketId).emit("voice:ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });
    /* =====================================================
      SECTION 6.1.6: Leave Voice Channel
      Purpose:
      - Remove current socket user from voice channel only
      - Keep user inside the room and chat
      - Stop showing user under Lobby / Squad / Break
      - Notify peers to close WebRTC connection
    ===================================================== */
    socket.on("voice:leave", (payload, callback) => {
      try {
        const roomCode = String(
          payload?.roomCode || socket.data.roomCode || ""
        ).trim();

        if (!roomCode) {
          if (callback) {
            callback({
              ok: false,
              error: "Room code is missing.",
            });
          }

          return;
        }

        const room = rooms.get(roomCode);

        if (!room) {
          if (callback) {
            callback({
              ok: false,
              error: "Room state not found.",
            });
          }

          return;
        }

        const currentUser = room.users.get(socket.id);

        if (!currentUser) {
          if (callback) {
            callback({
              ok: false,
              error: "User is not inside this room.",
            });
          }

          return;
        }

        const previousVoiceChannel =
          currentUser.voiceChannel || socket.data.voiceChannel || "Lobby";

        currentUser.voiceChannel = null;
        currentUser.isMicOn = false;
        currentUser.isDeafened = false;
        currentUser.isSpeaking = false;

        room.users.set(socket.id, currentUser);

        socket.data.voiceChannel = null;

        socket.to(roomCode).emit("voice:user-left", {
          socketId: socket.id,
          userId: currentUser.userId,
          username: currentUser.username,
          voiceChannel: previousVoiceChannel,
        });

        io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

        socket.to(roomCode).emit("room:system", {
          id: crypto.randomUUID(),
          type: "system",
          message: `${currentUser.username || "Someone"} left voice.`,
          createdAt: Date.now(),
        });

        if (callback) {
          callback({
            ok: true,
            previousVoiceChannel,
          });
        }
      } catch (error) {
        console.error("voice:leave error:", error);

        if (callback) {
          callback({
            ok: false,
            error: "Failed to leave voice channel.",
          });
        }
      }
    });

  /* =====================================================
    SECTION 6.2: Send Chat Message
    Purpose:
    - Receive message from one user
    - Broadcast to everyone in the room
    - Keep chat identity synced with profile avatar/name
  ===================================================== */
  socket.on("chat:send", (payload, callback) => {
    try {
      const roomCode = String(
        payload?.roomCode || socket.data.roomCode || ""
      ).trim();

      const username = String(
        payload?.username || socket.data.username || "Guest"
      ).trim();

      const userId = String(
        payload?.userId || socket.data.userId || ""
      ).trim();

      const avatarUrl = String(
        payload?.avatarUrl || socket.data.avatarUrl || ""
      ).trim();

      const initial = String(
        payload?.initial || socket.data.initial || username.charAt(0) || "U"
      )
        .trim()
        .charAt(0)
        .toUpperCase();

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
        userId,
        username,
        avatarUrl,
        initial,
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

    socket.to(roomCode).emit("voice:user-left", {
      socketId: socket.id,
      username,
      voiceChannel: socket.data.voiceChannel || "Lobby",
    });

    socket.to(roomCode).emit("room:system", {
      id: crypto.randomUUID(),
      type: "system",
      message: `${username} left the room.`,
      createdAt: Date.now(),
    });

    cleanEmptyRoom(roomCode);

    socket.data.roomCode = null;
    socket.data.userId = null;
    socket.data.username = null;
    socket.data.email = null;
    socket.data.avatarUrl = null;
    socket.data.initial = null;
    socket.data.voiceChannel = null;
  });

  /* =====================================================
     SECTION 6.4: Disconnect Cleanup
     Purpose:
     - Clean user from room when tab closes or refreshes
  ===================================================== */
  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const username = socket.data.username || "Guest";
    const voiceChannel = socket.data.voiceChannel || "Lobby";

    if (!roomCode) {
      console.log("Socket disconnected:", socket.id);
      return;
    }

    const room = rooms.get(roomCode);

    if (room) {
      room.users.delete(socket.id);
    }

    io.to(roomCode).emit("room:users", getRoomUsers(roomCode));

    socket.to(roomCode).emit("voice:user-left", {
      socketId: socket.id,
      username,
      voiceChannel,
    });

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

