/* =========================================================
   SECTION 1: Dependencies
   Purpose:
   - Load Express / HTTP / Socket.IO dependencies
   - Load environment variables
========================================================= */
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

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
      gameSessions: new Map(),
    });
  }

  const room = rooms.get(roomCode);

  if (!room.gameSessions) {
    room.gameSessions = new Map();
  }

  return room;
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
   SECTION 5.2: Game Session Helpers
   Purpose:
   - Manage VOXYN game sessions inside each room
   - Support player slots and spectator mode
   - Allow both multiplayer games and single-player watched games
========================================================= */
const GAME_CONFIGS = {
  "tic-tac-toe": {
    gameId: "tic-tac-toe",
    title: "Tic Tac Toe",
    maxPlayers: 2,
    playerSlots: ["X", "O"],
    allowSpectators: true,
    mode: "turn-based",
  },

  "falling-blocks": {
    gameId: "falling-blocks",
    title: "Falling Blocks",
    maxPlayers: 1,
    playerSlots: ["P1"],
    allowSpectators: true,
    mode: "solo-live",
  },
};

function getGameConfig(gameId) {
  return GAME_CONFIGS[gameId] || null;
}

function createInitialGameState(gameId) {
  if (gameId === "tic-tac-toe") {
    return {
      board: Array(9).fill(null),
      currentTurn: "X",
      winner: null,
      status: "waiting",
      round: 1,
    };
  }

  if (gameId === "falling-blocks") {
    return {
      board: [],
      activePiece: null,
      nextPiece: null,
      score: 0,
      lines: 0,
      level: 1,
      elapsedSeconds: 0,
      status: "idle",
      difficulty: "standard",
    };
  }

  return {
    status: "idle",
  };
}

function createPlayerSlots(config) {
  return config.playerSlots.map((slotId) => {
    return {
      slotId,
      socketId: null,
      userId: "",
      username: "",
      avatarUrl: "",
      initial: "",
      joinedAt: null,
    };
  });
}

function getGameSocketRoom(roomCode, gameId) {
  return `game:${roomCode}:${gameId}`;
}

function getSocketIdentity(socket) {
  const username = String(socket.data.username || "Guest").trim();
  const initial = String(socket.data.initial || username.charAt(0) || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return {
    socketId: socket.id,
    userId: String(socket.data.userId || "").trim(),
    username,
    email: String(socket.data.email || "").trim(),
    avatarUrl: String(socket.data.avatarUrl || "").trim(),
    initial,
  };
}

function getOrCreateGameSession(roomCode, gameId) {
  const config = getGameConfig(gameId);

  if (!config) {
    return null;
  }

  const room = getOrCreateRoom(roomCode);

  if (!room.gameSessions.has(gameId)) {
    room.gameSessions.set(gameId, {
      id: crypto.randomUUID(),
      roomCode,
      gameId,
      title: config.title,
      mode: config.mode,
      maxPlayers: config.maxPlayers,
      allowSpectators: config.allowSpectators,
      playerSlots: createPlayerSlots(config),
      spectators: new Map(),
      gameState: createInitialGameState(gameId),
      status: "waiting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return room.gameSessions.get(gameId);
}

function serializeParticipant(participant) {
  if (!participant) return null;

  return {
    socketId: participant.socketId,
    userId: participant.userId,
    username: participant.username,
    avatarUrl: participant.avatarUrl,
    initial: participant.initial,
    joinedAt: participant.joinedAt,
  };
}

function serializeGameSession(session) {
  if (!session) return null;

  const occupiedPlayers = session.playerSlots.filter((slot) => slot.socketId);

  return {
    id: session.id,
    roomCode: session.roomCode,
    gameId: session.gameId,
    title: session.title,
    mode: session.mode,
    maxPlayers: session.maxPlayers,
    playerCount: occupiedPlayers.length,
    spectatorCount: session.spectators.size,
    status: session.status,
    playerSlots: session.playerSlots.map((slot) => {
      return {
        slotId: slot.slotId,
        occupied: Boolean(slot.socketId),
        player: slot.socketId ? serializeParticipant(slot) : null,
      };
    }),
    spectators: Array.from(session.spectators.values()).map(serializeParticipant),
    gameState: session.gameState,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function getSocketRoleInGameSession(session, socketId) {
  const playerSlot = session.playerSlots.find((slot) => {
    return slot.socketId === socketId;
  });

  if (playerSlot) {
    return {
      role: "player",
      slotId: playerSlot.slotId,
    };
  }

  if (session.spectators.has(socketId)) {
    return {
      role: "spectator",
      slotId: null,
    };
  }

  return {
    role: "none",
    slotId: null,
  };
}

function removeSocketFromGameSession(session, socketId) {
  let changed = false;

  session.playerSlots.forEach((slot) => {
    if (slot.socketId === socketId) {
      slot.socketId = null;
      slot.userId = "";
      slot.username = "";
      slot.avatarUrl = "";
      slot.initial = "";
      slot.joinedAt = null;
      changed = true;
    }
  });

  if (session.spectators.delete(socketId)) {
    changed = true;
  }

  if (changed) {
    const playerCount = session.playerSlots.filter((slot) => slot.socketId).length;

    session.status =
      playerCount >= session.maxPlayers
        ? "playing"
        : "waiting";

    session.updatedAt = Date.now();
  }

  return changed;
}

function assignSocketToPlayerSlot(session, socket, preferredSlotId = "") {
  const currentRole = getSocketRoleInGameSession(session, socket.id);

  if (currentRole.role === "player") {
    return {
      ok: true,
      role: "player",
      slotId: currentRole.slotId,
    };
  }

  const targetSlot =
    session.playerSlots.find((slot) => {
      return preferredSlotId && slot.slotId === preferredSlotId && !slot.socketId;
    }) ||
    session.playerSlots.find((slot) => {
      return !slot.socketId;
    });

  if (!targetSlot) {
    return {
      ok: false,
      error: "No player slot available.",
    };
  }

  session.spectators.delete(socket.id);

  const identity = getSocketIdentity(socket);

  targetSlot.socketId = identity.socketId;
  targetSlot.userId = identity.userId;
  targetSlot.username = identity.username;
  targetSlot.avatarUrl = identity.avatarUrl;
  targetSlot.initial = identity.initial;
  targetSlot.joinedAt = Date.now();

  const playerCount = session.playerSlots.filter((slot) => slot.socketId).length;

  session.status =
    playerCount >= session.maxPlayers
      ? "playing"
      : "waiting";

  session.updatedAt = Date.now();

  return {
    ok: true,
    role: "player",
    slotId: targetSlot.slotId,
  };
}

function assignSocketToSpectator(session, socket) {
  removeSocketFromGameSession(session, socket.id);

  const identity = getSocketIdentity(socket);

  session.spectators.set(socket.id, {
    ...identity,
    joinedAt: Date.now(),
  });

  session.updatedAt = Date.now();

  return {
    ok: true,
    role: "spectator",
    slotId: null,
  };
}

function safeGameState(gameState) {
  try {
    const serialized = JSON.stringify(gameState || {});

    if (serialized.length > 30000) {
      return null;
    }

    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
}

function emitGameSessionUpdate(roomCode, gameId) {
  const room = rooms.get(roomCode);

  if (!room?.gameSessions?.has(gameId)) {
    return;
  }

  const session = room.gameSessions.get(gameId);
  const gameRoom = getGameSocketRoom(roomCode, gameId);

  io.to(gameRoom).emit("game:session-update", serializeGameSession(session));
}

function removeSocketFromAllGameSessions(roomCode, socketId) {
  const room = rooms.get(roomCode);

  if (!room?.gameSessions) {
    return;
  }

  for (const [gameId, session] of room.gameSessions.entries()) {
    const changed = removeSocketFromGameSession(session, socketId);

    if (!changed) continue;

    const hasPlayers = session.playerSlots.some((slot) => slot.socketId);
    const hasSpectators = session.spectators.size > 0;

    if (!hasPlayers && !hasSpectators) {
      room.gameSessions.delete(gameId);
      continue;
    }

    emitGameSessionUpdate(roomCode, gameId);
  }
}

function getRoomGameSessions(roomCode) {
  const room = rooms.get(roomCode);

  if (!room?.gameSessions) {
    return [];
  }

  return Array.from(room.gameSessions.values()).map(serializeGameSession);
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
      socket.emit("game:sessions", getRoomGameSessions(roomCode));

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
        SECTION 6.1.7: Game Session Events
        Purpose:
        - Create / join game sessions
        - Manage player slots and spectators
        - Sync live game state for spectator mode
      ===================================================== */
      socket.on("game:join-session", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || "").trim();
          const preferRole = String(payload?.role || payload?.preferRole || "player")
            .trim()
            .toLowerCase();

          if (!roomCode) {
            if (callback) {
              callback({
                ok: false,
                error: "Room code is missing.",
              });
            }

            return;
          }

          if (!getGameConfig(gameId)) {
            if (callback) {
              callback({
                ok: false,
                error: "Invalid game id.",
              });
            }

            return;
          }

          const room = rooms.get(roomCode);

          if (!room?.users?.has(socket.id)) {
            if (callback) {
              callback({
                ok: false,
                error: "Join the room before joining a game session.",
              });
            }

            return;
          }

          const session = getOrCreateGameSession(roomCode, gameId);
          const gameRoom = getGameSocketRoom(roomCode, gameId);

          socket.join(gameRoom);
          socket.data.activeGameId = gameId;

          let joinResult;

          if (preferRole === "spectator") {
            joinResult = assignSocketToSpectator(session, socket);
          } else {
            joinResult = assignSocketToPlayerSlot(session, socket);

            if (!joinResult.ok && session.allowSpectators) {
              joinResult = assignSocketToSpectator(session, socket);
            }
          }

          emitGameSessionUpdate(roomCode, gameId);

          if (callback) {
            callback({
              ok: true,
              role: joinResult.role,
              slotId: joinResult.slotId,
              session: serializeGameSession(session),
            });
          }
        } catch (error) {
          console.error("game:join-session error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to join game session.",
            });
          }
        }
      });

      socket.on("game:join-as-player", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const preferredSlotId = String(payload?.slotId || "").trim();

          const session = getOrCreateGameSession(roomCode, gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: false,
                error: "Game session not found.",
              });
            }

            return;
          }

          const result = assignSocketToPlayerSlot(session, socket, preferredSlotId);

          if (!result.ok) {
            if (callback) {
              callback(result);
            }

            return;
          }

          socket.join(getGameSocketRoom(roomCode, gameId));
          socket.data.activeGameId = gameId;

          emitGameSessionUpdate(roomCode, gameId);

          if (callback) {
            callback({
              ok: true,
              role: result.role,
              slotId: result.slotId,
              session: serializeGameSession(session),
            });
          }
        } catch (error) {
          console.error("game:join-as-player error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to join as player.",
            });
          }
        }
      });

      socket.on("game:join-as-spectator", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();

          const session = getOrCreateGameSession(roomCode, gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: false,
                error: "Game session not found.",
              });
            }

            return;
          }

          const result = assignSocketToSpectator(session, socket);

          socket.join(getGameSocketRoom(roomCode, gameId));
          socket.data.activeGameId = gameId;

          emitGameSessionUpdate(roomCode, gameId);

          if (callback) {
            callback({
              ok: true,
              role: result.role,
              slotId: result.slotId,
              session: serializeGameSession(session),
            });
          }
        } catch (error) {
          console.error("game:join-as-spectator error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to join as spectator.",
            });
          }
        }
      });

      socket.on("game:leave-session", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const room = rooms.get(roomCode);
          const session = room?.gameSessions?.get(gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: true,
              });
            }

            return;
          }

          removeSocketFromGameSession(session, socket.id);

          socket.leave(getGameSocketRoom(roomCode, gameId));
          socket.data.activeGameId = null;

          const hasPlayers = session.playerSlots.some((slot) => slot.socketId);
          const hasSpectators = session.spectators.size > 0;

          if (!hasPlayers && !hasSpectators) {
            room.gameSessions.delete(gameId);
          } else {
            emitGameSessionUpdate(roomCode, gameId);
          }

          if (callback) {
            callback({
              ok: true,
            });
          }
        } catch (error) {
          console.error("game:leave-session error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to leave game session.",
            });
          }
        }
      });

      socket.on("game:get-session", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const room = rooms.get(roomCode);
          const session = room?.gameSessions?.get(gameId) || null;

          if (callback) {
            callback({
              ok: true,
              session: serializeGameSession(session),
            });
          }
        } catch (error) {
          console.error("game:get-session error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to get game session.",
            });
          }
        }
      });

      socket.on("game:state-sync", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const room = rooms.get(roomCode);
          const session = room?.gameSessions?.get(gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: false,
                error: "Game session not found.",
              });
            }

            return;
          }

          const role = getSocketRoleInGameSession(session, socket.id);

          if (role.role !== "player") {
            if (callback) {
              callback({
                ok: false,
                error: "Only players can sync game state.",
              });
            }

            return;
          }

          const nextGameState = safeGameState(payload?.gameState);

          if (!nextGameState) {
            if (callback) {
              callback({
                ok: false,
                error: "Invalid or oversized game state.",
              });
            }

            return;
          }

          session.gameState = nextGameState;
          session.updatedAt = Date.now();

          io.to(getGameSocketRoom(roomCode, gameId)).emit("game:state-update", {
            gameId,
            gameState: session.gameState,
            session: serializeGameSession(session),
          });

          if (callback) {
            callback({
              ok: true,
            });
          }
        } catch (error) {
          console.error("game:state-sync error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to sync game state.",
            });
          }
        }
      });

      socket.on("game:move", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const room = rooms.get(roomCode);
          const session = room?.gameSessions?.get(gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: false,
                error: "Game session not found.",
              });
            }

            return;
          }

          const role = getSocketRoleInGameSession(session, socket.id);

          if (role.role !== "player") {
            if (callback) {
              callback({
                ok: false,
                error: "Spectators cannot make moves.",
              });
            }

            return;
          }

          io.to(getGameSocketRoom(roomCode, gameId)).emit("game:move", {
            gameId,
            fromSocketId: socket.id,
            slotId: role.slotId,
            action: payload?.action || null,
            createdAt: Date.now(),
          });

          if (callback) {
            callback({
              ok: true,
            });
          }
        } catch (error) {
          console.error("game:move error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to send game move.",
            });
          }
        }
      });

      socket.on("game:reset", (payload, callback) => {
        try {
          const roomCode = String(
            payload?.roomCode || socket.data.roomCode || ""
          ).trim();

          const gameId = String(payload?.gameId || socket.data.activeGameId || "").trim();
          const room = rooms.get(roomCode);
          const session = room?.gameSessions?.get(gameId);

          if (!session) {
            if (callback) {
              callback({
                ok: false,
                error: "Game session not found.",
              });
            }

            return;
          }

          const role = getSocketRoleInGameSession(session, socket.id);

          if (role.role !== "player") {
            if (callback) {
              callback({
                ok: false,
                error: "Only players can reset the game.",
              });
            }

            return;
          }

          session.gameState = createInitialGameState(gameId);
          session.updatedAt = Date.now();

          io.to(getGameSocketRoom(roomCode, gameId)).emit("game:state-update", {
            gameId,
            gameState: session.gameState,
            session: serializeGameSession(session),
          });

          if (callback) {
            callback({
              ok: true,
              session: serializeGameSession(session),
            });
          }
        } catch (error) {
          console.error("game:reset error:", error);

          if (callback) {
            callback({
              ok: false,
              error: "Failed to reset game.",
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
    removeSocketFromAllGameSessions(roomCode, socket.id);

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
    
    removeSocketFromAllGameSessions(roomCode, socket.id);
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

