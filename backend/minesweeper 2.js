/* VOXYN 1.01 — authoritative Minesweeper rules (CommonJS, no dependencies). */
const { randomInt, randomUUID } = require("crypto");

const DIFFICULTIES = Object.freeze({
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
});

function createGame(difficulty = "beginner", now = Date.now()) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new Error("Invalid difficulty.");
  const { rows, cols, mines } = DIFFICULTIES[difficulty];
  return {
    roundId: randomUUID(), revision: 0, difficulty, rows, cols, mineCount: mines,
    status: "ready", startedAt: null, endedAt: null, updatedAt: now,
    board: Array.from({ length: rows * cols }, () => ({
      mine: false, adjacent: 0, revealed: false, flagged: false, exploded: false,
    })),
  };
}

function neighbors(game, index) {
  const row = Math.floor(index / game.cols);
  const col = index % game.cols;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < game.rows && c >= 0 && c < game.cols) result.push(r * game.cols + c);
    }
  }
  return result;
}

// Place mines after the first reveal, keeping its entire 3x3 neighborhood safe.
function plantMines(game, firstIndex, now) {
  const safe = new Set([firstIndex, ...neighbors(game, firstIndex)]);
  const available = game.board.map((_, index) => index).filter(index => !safe.has(index));
  for (let i = 0; i < game.mineCount; i++) {
    const selected = randomInt(i, available.length);
    [available[i], available[selected]] = [available[selected], available[i]];
    game.board[available[i]].mine = true;
  }
  game.board.forEach((cell, index) => {
    cell.adjacent = neighbors(game, index).filter(i => game.board[i].mine).length;
  });
  game.status = "playing";
  game.startedAt = now;
}

function revealArea(game, firstIndex, now) {
  const stack = [firstIndex];
  while (stack.length && game.status === "playing") {
    const index = stack.pop();
    const cell = game.board[index];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      cell.exploded = true;
      game.status = "lost";
      game.endedAt = now;
      break;
    }
    if (cell.adjacent === 0) {
      for (const next of neighbors(game, index)) {
        if (!game.board[next].revealed && !game.board[next].flagged) stack.push(next);
      }
    }
  }
}

function checkWin(game, now) {
  if (game.status !== "playing") return;
  if (game.board.every(cell => cell.mine || cell.revealed)) {
    game.status = "won";
    game.endedAt = now;
    for (const cell of game.board) if (cell.mine) cell.flagged = true;
  }
}

function applyAction(game, action, now = Date.now()) {
  if (!action || typeof action !== "object") throw new Error("Invalid action.");
  if (action.roundId !== game.roundId || action.revision !== game.revision) {
    throw new Error("The board changed. Please try again.");
  }
  if (action.type === "new-game") {
    return createGame(action.difficulty || game.difficulty, now);
  }
  if (!["reveal", "flag", "chord"].includes(action.type)) throw new Error("Invalid action.");
  if (!Number.isInteger(action.index) || action.index < 0 || action.index >= game.board.length) {
    throw new Error("Invalid cell.");
  }
  if (game.status === "won" || game.status === "lost") throw new Error("This round has ended.");

  const cell = game.board[action.index];
  if (action.type === "flag") {
    if (cell.revealed) return game;
    if (!cell.flagged && game.board.filter(c => c.flagged).length >= game.mineCount) {
      throw new Error("All flags are in use. Remove a flag first.");
    }
    cell.flagged = !cell.flagged;
  } else if (action.type === "chord" || cell.revealed) {
    if (!cell.revealed || cell.adjacent === 0) return game;
    const adjacent = neighbors(game, action.index);
    if (adjacent.filter(i => game.board[i].flagged).length !== cell.adjacent) return game;
    for (const index of adjacent) {
      revealArea(game, index, now);
      if (game.status === "lost") break;
    }
    checkWin(game, now);
  } else {
    if (cell.flagged) return game;
    if (game.status === "ready") plantMines(game, action.index, now);
    revealArea(game, action.index, now);
    checkWin(game, now);
  }
  game.revision++;
  game.updatedAt = now;
  return game;
}

// Unopened cells never expose mine placement or adjacent counts during play.
function publicState(game, now = Date.now()) {
  const ended = game.status === "won" || game.status === "lost";
  const flags = game.board.filter(cell => cell.flagged).length;
  return {
    roundId: game.roundId, revision: game.revision, difficulty: game.difficulty,
    rows: game.rows, cols: game.cols, mineCount: game.mineCount,
    status: game.status, flags, minesRemaining: game.mineCount - flags,
    revealedCount: game.board.filter(cell => cell.revealed && !cell.mine).length,
    startedAt: game.startedAt, endedAt: game.endedAt,
    elapsedSeconds: game.startedAt === null ? 0 : Math.max(0, Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000)),
    board: game.board.map(cell => ({
      revealed: cell.revealed, flagged: cell.flagged,
      adjacent: cell.revealed && !cell.mine ? cell.adjacent : null,
      mine: ended ? cell.mine : false,
      exploded: cell.exploded,
      wrongFlag: ended && cell.flagged && !cell.mine,
    })),
  };
}

function registerSocket({ socket, rooms, io, getGameSocketRoom, serializeGameSession }) {
  socket.on("game:minesweeper-action", (payload, callback) => {
    const reply = typeof callback === "function" ? callback : () => {};
    const roomCode = String(payload?.roomCode || "").trim();
    const room = rooms.get(roomCode);
    const session = room?.gameSessions?.get("minesweeper");
    if (!room?.users?.has(socket.id) || !session) {
      reply({ ok: false, error: "Join this room and its Minesweeper session first." });
      return;
    }
    if (!session.playerSlots.some(slot => slot.socketId === socket.id)) {
      reply({ ok: false, error: "Only the current player can change the board." });
      return;
    }
    try {
      session.minesweeper = applyAction(session.minesweeper, payload);
      session.gameState = publicState(session.minesweeper);
      session.updatedAt = Date.now();
      io.to(getGameSocketRoom(roomCode, "minesweeper")).emit("game:state-update", {
        gameId: "minesweeper", gameState: session.gameState,
        session: serializeGameSession(session),
      });
      reply({ ok: true, gameState: session.gameState });
    } catch (error) {
      reply({ ok: false, error: error.message, gameState: publicState(session.minesweeper) });
    }
  });
}

module.exports = { DIFFICULTIES, createGame, applyAction, publicState, registerSocket };