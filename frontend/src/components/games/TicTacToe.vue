<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue helpers
   - Connect Tic Tac Toe to VOXYN game session roles
========================================================= */
import { computed, ref, watch } from "vue"
import { useGameSession } from "./useGameSession"

/* =========================================================
   SECTION 2: Props / Emits
========================================================= */
const props = defineProps({
  mode: {
    type: String,
    default: "ai"
  },
  roomCode: {
    type: String,
    default: ""
  },
  watchRoomCode: {
    type: String,
    default: ""
  },
  defaultRole: {
    type: String,
    default: "player"
  },
  user: {
    type: Object,
    default: null
  },
  socket: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(["back-to-library"])

/* =========================================================
   SECTION 3: Local Game State
========================================================= */
const GAME_ID = "tic-tac-toe"

const board = ref(Array(9).fill(""))
const currentPlayer = ref("X")
const isAiThinking = ref(false)
const roleMenuOpen = ref(false)
const localGameError = ref("")

let isApplyingRemoteState = false

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]

/* =========================================================
   SECTION 4: Game Session
   Purpose:
   - Player 1 = X
   - Player 2 = O
   - Watcher = spectator
========================================================= */
const activeRoomCode = computed(() => {
  return props.watchRoomCode || props.roomCode
})

const gameSession = useGameSession({
  socket: () => props.socket,
  roomCode: () => activeRoomCode.value,
  gameId: GAME_ID,
  defaultRole: props.defaultRole,
  allowLocalFallback: true
})

const {
  session,
  role,
  slotId,
  lastGameState,
  isJoining,
  sessionError,
  localFallbackActive,
  isPlayer,
  isSpectator,
  playerCount,
  maxPlayers,
  spectatorCount,
  hasOpenPlayerSlot,
  joinAsPlayer,
  joinAsSpectator,
  syncGameState
} = gameSession

/* =========================================================
   SECTION 5: Display Helpers
========================================================= */
const isAiMode = computed(() => {
  return props.mode === "ai"
})

const modeLabel = computed(() => {
  if (props.mode === "spectator") return "Watch Mode"
  return isAiMode.value ? "AI Mode" : "Local Multiplayer"
})

const currentUserName = computed(() => {
  const metadata = props.user?.user_metadata || {}

  return (
    metadata.display_name ||
    metadata.full_name ||
    props.user?.email?.split("@")[0] ||
    "Nah"
  )
})

const currentUserInitial = computed(() => {
  return currentUserName.value.charAt(0).toUpperCase() || "N"
})

const playerSlots = computed(() => {
  return session.value?.playerSlots || []
})

const spectators = computed(() => {
  return session.value?.spectators || []
})

const playerOneSlot = computed(() => {
  return playerSlots.value.find((slot) => slot.slotId === "X") || null
})

const playerTwoSlot = computed(() => {
  return playerSlots.value.find((slot) => slot.slotId === "O") || null
})

const playerOne = computed(() => {
  return playerOneSlot.value?.player || null
})

const playerTwo = computed(() => {
  return playerTwoSlot.value?.player || null
})

const playerOneName = computed(() => {
  return playerOne.value?.username || (localFallbackActive.value ? currentUserName.value : "Nah")
})

const playerTwoName = computed(() => {
  return playerTwo.value?.username || "Nah"
})

const playerOneInitial = computed(() => {
  return playerOne.value?.initial || currentUserInitial.value
})

const playerTwoInitial = computed(() => {
  return playerTwo.value?.initial || "?"
})

const playerOneOccupied = computed(() => {
  return Boolean(playerOneSlot.value?.occupied || localFallbackActive.value)
})

const playerTwoOccupied = computed(() => {
  return Boolean(playerTwoSlot.value?.occupied)
})

const normalizedPlayerCount = computed(() => {
  if (localFallbackActive.value) return 1
  return Number(playerCount.value || 0)
})

const normalizedMaxPlayers = computed(() => {
  return Number(maxPlayers.value || 2)
})

const roleLabel = computed(() => {
  if (localFallbackActive.value) return `Player 1 | ${currentUserName.value}`
  if (slotId.value === "X") return `Player 1 | ${playerOneName.value}`
  if (slotId.value === "O") return `Player 2 | ${playerTwoName.value}`
  return "Watch"
})

const myRoleTitle = computed(() => {
  if (localFallbackActive.value || slotId.value === "X") return "You are Player 1 (X)"
  if (slotId.value === "O") return "You are Player 2 (O)"
  if (isSpectator.value) return "You are Watching"
  return "Choose your role"
})

const myRoleSymbol = computed(() => {
  if (slotId.value === "O") return "O"
  if (isSpectator.value) return "👁"
  return "X"
})

const myRoleAccent = computed(() => {
  if (slotId.value === "O") return "o"
  if (isSpectator.value) return "watch"
  return "x"
})

const canJoinPlayerOne = computed(() => {
  if (localFallbackActive.value) return false
  if (!playerOneSlot.value) return true
  if (!playerOneSlot.value.occupied) return true
  return playerOne.value?.socketId === props.socket?.id
})

const canJoinPlayerTwo = computed(() => {
  if (localFallbackActive.value) return false
  if (!playerTwoSlot.value) return true
  if (!playerTwoSlot.value.occupied) return true
  return playerTwo.value?.socketId === props.socket?.id
})

const hasSecondPlayerOpen = computed(() => {
  return !playerTwoOccupied.value
})

const roleStateLabel = computed(() => {
  if (playerOneOccupied.value && playerTwoOccupied.value) {
    return "Player 1 | Player 2"
  }

  if (playerOneOccupied.value && hasSecondPlayerOpen.value) {
    return `${playerOneName.value} +`
  }

  return `Player 1 | ${playerOneName.value}`
})

/* =========================================================
   SECTION 6: Game Computeds
========================================================= */
const winner = computed(() => {
  for (const line of winningLines) {
    const [a, b, c] = line

    if (
      board.value[a] &&
      board.value[a] === board.value[b] &&
      board.value[a] === board.value[c]
    ) {
      return board.value[a]
    }
  }

  return ""
})

const isDraw = computed(() => {
  return !winner.value && board.value.every(Boolean)
})

const winningCells = computed(() => {
  for (const line of winningLines) {
    const [a, b, c] = line

    if (
      board.value[a] &&
      board.value[a] === board.value[b] &&
      board.value[a] === board.value[c]
    ) {
      return line
    }
  }

  return []
})

const hasEnoughPlayers = computed(() => {
  if (isAiMode.value) return true
  if (localFallbackActive.value) return true
  return normalizedPlayerCount.value >= 2
})

const isMyTurn = computed(() => {
  if (localFallbackActive.value) return true
  if (isAiMode.value) return currentPlayer.value === "X"
  if (!isPlayer.value) return false
  return slotId.value === currentPlayer.value
})

const gameStatus = computed(() => {
  if (winner.value) return `${winner.value} wins`
  if (isDraw.value) return "Draw game"
  if (isAiThinking.value) return "AI is thinking..."
  if (!hasEnoughPlayers.value && !isAiMode.value) return "Waiting for Player 2"
  if (isSpectator.value) return `${currentPlayer.value}'s turn · Watching`
  if (!isMyTurn.value) return `${currentPlayer.value}'s turn`
  return "Your turn"
})

const boardLockedReason = computed(() => {
  if (winner.value || isDraw.value) return "Game finished"
  if (isAiThinking.value) return "AI is thinking"
  if (!hasEnoughPlayers.value && !isAiMode.value) return "Waiting for Player 2"
  if (isSpectator.value) return "Watching only"
  if (!isMyTurn.value) return "Waiting for opponent"
  return ""
})

/* =========================================================
   SECTION 7: Game State Sync Helpers
========================================================= */
function normalizeBoard(nextBoard) {
  if (!Array.isArray(nextBoard)) return Array(9).fill("")

  return nextBoard.slice(0, 9).map((cell) => {
    return cell === "X" || cell === "O" ? cell : ""
  })
}

function createGameStatePayload() {
  return {
    board: board.value.map((cell) => cell || null),
    currentTurn: currentPlayer.value,
    winner: winner.value || null,
    isDraw: isDraw.value,
    status: winner.value
      ? "finished"
      : isDraw.value
        ? "draw"
        : hasEnoughPlayers.value
          ? "playing"
          : "waiting",
    updatedAt: Date.now()
  }
}

function applyRemoteGameState(nextGameState) {
  if (!nextGameState || isApplyingRemoteState) return
  if (!Array.isArray(nextGameState.board)) return

  isApplyingRemoteState = true

  board.value = normalizeBoard(nextGameState.board)
  currentPlayer.value = nextGameState.currentTurn === "O" ? "O" : "X"
  isAiThinking.value = false

  window.setTimeout(() => {
    isApplyingRemoteState = false
  }, 0)
}

function publishGameState() {
  if (isApplyingRemoteState) return
  if (localFallbackActive.value) return
  if (!props.socket) return
  if (!isPlayer.value) return

  syncGameState(createGameStatePayload())
}

/* =========================================================
   SECTION 8: Role Actions
========================================================= */
function closeRoleMenu() {
  roleMenuOpen.value = false
}

function toggleRoleMenu() {
  roleMenuOpen.value = !roleMenuOpen.value
}

function becomeWatcher() {
  localGameError.value = ""
  closeRoleMenu()
  joinAsSpectator()
}

function joinPlayerSlot(preferredSlotId) {
  localGameError.value = ""
  closeRoleMenu()

  const targetSlot = preferredSlotId === "O" ? playerTwoSlot.value : playerOneSlot.value

  if (targetSlot?.occupied && targetSlot.player?.socketId !== props.socket?.id) {
    localGameError.value = "That player slot is already taken."
    return
  }

  if (role.value === "player" && slotId.value && slotId.value !== preferredSlotId) {
    const currentSocket = props.socket

    if (!currentSocket) {
      localGameError.value = "Socket is not connected."
      return
    }

    currentSocket.emit(
      "game:join-as-spectator",
      {
        roomCode: activeRoomCode.value,
        gameId: GAME_ID
      },
      (response) => {
        if (!response?.ok) {
          localGameError.value = response?.error || "Failed to switch role."
          return
        }

        joinAsPlayer(preferredSlotId)
      }
    )

    return
  }

  joinAsPlayer(preferredSlotId)
}

/* =========================================================
   SECTION 9: Game Actions
========================================================= */
function canMakeMove(index) {
  if (board.value[index]) return false
  if (winner.value || isDraw.value) return false
  if (isAiThinking.value) return false
  if (!hasEnoughPlayers.value && !isAiMode.value) return false
  if (isSpectator.value) return false
  if (!isMyTurn.value) return false
  return true
}

function makeMove(index) {
  localGameError.value = ""

  if (!canMakeMove(index)) {
    localGameError.value = boardLockedReason.value
    return
  }

  board.value[index] = currentPlayer.value

  if (winner.value || isDraw.value) {
    publishGameState()
    return
  }

  if (isAiMode.value) {
    currentPlayer.value = "O"
    publishGameState()
    runAiMove()
    return
  }

  currentPlayer.value = currentPlayer.value === "X" ? "O" : "X"
  publishGameState()
}

function runAiMove() {
  isAiThinking.value = true

  window.setTimeout(() => {
    const move = chooseAiMove()

    if (move !== -1) {
      board.value[move] = "O"
    }

    if (!winner.value && !isDraw.value) {
      currentPlayer.value = "X"
    }

    isAiThinking.value = false
    publishGameState()
  }, 420)
}

function chooseAiMove() {
  const winMove = findBestMove("O")
  if (winMove !== -1) return winMove

  const blockMove = findBestMove("X")
  if (blockMove !== -1) return blockMove

  if (!board.value[4]) return 4

  const available = board.value
    .map((cell, index) => {
      return cell ? null : index
    })
    .filter((index) => {
      return index !== null
    })

  if (!available.length) return -1

  return available[Math.floor(Math.random() * available.length)]
}

function findBestMove(player) {
  for (const line of winningLines) {
    const values = line.map((index) => {
      return board.value[index]
    })

    const playerCountForLine = values.filter((value) => {
      return value === player
    }).length

    const emptyCount = values.filter((value) => {
      return value === ""
    }).length

    if (playerCountForLine === 2 && emptyCount === 1) {
      return line[values.indexOf("")]
    }
  }

  return -1
}

function resetLocalGame() {
  board.value = Array(9).fill("")
  currentPlayer.value = "X"
  isAiThinking.value = false
}

function resetGame() {
  localGameError.value = ""

  if (!isPlayer.value && !localFallbackActive.value) {
    localGameError.value = "Only players can reset the game."
    return
  }

  resetLocalGame()
  publishGameState()
}

/* =========================================================
   SECTION 10: Watchers
========================================================= */
watch(
  () => props.mode,
  () => {
    resetLocalGame()
  }
)

watch(
  () => lastGameState.value || session.value?.gameState,
  (nextGameState) => {
    applyRemoteGameState(nextGameState)
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <section class="tic-page">
    <header class="tic-header">
      <button
        type="button"
        class="library-button"
        @click="emit('back-to-library')"
      >
        ← Back to Library
      </button>

      <div class="title-block">
        <div class="game-mark">#</div>
        <div>
          <div class="title-row">
            <h2>Tic Tac Toe</h2>
            <span class="game-chip">Game 1</span>
          </div>
          <div class="room-meta">
            <span>Room {{ activeRoomCode }}</span>
            <span class="dot green"></span>
            <span>{{ normalizedPlayerCount }}/{{ normalizedMaxPlayers }} Players</span>
            <span class="dot purple"></span>
            <span>{{ spectatorCount }} Watching</span>
          </div>
        </div>
      </div>

      <div class="tic-actions">
        <button
          type="button"
          class="watch-button"
          :class="{ active: isSpectator }"
          @click="becomeWatcher"
        >
          👁 Watch
        </button>

        <div class="role-control">
          <button
            type="button"
            class="role-button"
            @click="toggleRoleMenu"
          >
            <span class="role-dot">{{ slotId === 'O' ? 'O' : slotId === 'X' ? 'X' : '👁' }}</span>
            <strong>{{ roleLabel }}</strong>
            <em>⌄</em>
          </button>

          <div
            v-if="roleMenuOpen"
            class="role-menu"
          >
            <button
              type="button"
              class="role-option"
              :class="{ selected: isSpectator }"
              @click="becomeWatcher"
            >
              <span class="option-icon watch">👁</span>
              <span>
                <strong>Watch</strong>
                <small>Watch only. No moves.</small>
              </span>
              <em v-if="isSpectator">✓</em>
            </button>

            <button
              type="button"
              class="role-option"
              :class="{ selected: slotId === 'X', disabled: !canJoinPlayerOne }"
              :disabled="!canJoinPlayerOne"
              @click="joinPlayerSlot('X')"
            >
              <span class="option-icon x">X</span>
              <span>
                <strong>Player 1 | {{ playerOneName }}</strong>
                <small>{{ playerOneOccupied ? 'Player 1 controls X.' : 'Join as Player 1 (X).' }}</small>
              </span>
              <em v-if="slotId === 'X'">Host</em>
            </button>

            <button
              type="button"
              class="role-option"
              :class="{ selected: slotId === 'O', disabled: !canJoinPlayerTwo }"
              :disabled="!canJoinPlayerTwo"
              @click="joinPlayerSlot('O')"
            >
              <span class="option-icon o">O</span>
              <span>
                <strong>Player 2 | {{ playerTwoOccupied ? playerTwoName : 'Nah +' }}</strong>
                <small>{{ playerTwoOccupied ? 'Player 2 controls O.' : 'Open slot. Join as Player 2.' }}</small>
              </span>
              <em v-if="slotId === 'O'">✓</em>
            </button>
          </div>
        </div>

        <button
          type="button"
          class="reset-button"
          :disabled="!isPlayer && !localFallbackActive"
          @click="resetGame"
        >
          ↻ Reset
        </button>
      </div>
    </header>

    <div class="tic-layout">
      <aside class="player-column">
        <section
          class="player-card primary"
          :class="{ active: slotId === 'X' || localFallbackActive }"
        >
          <p>You are Player 1 (X)</p>
          <div class="player-profile-row">
            <div class="avatar x-avatar">{{ playerOneInitial }}</div>
            <div>
              <h3>{{ playerOneName }}</h3>
              <span v-if="playerOneOccupied">Host</span>
              <span v-else>Waiting...</span>
            </div>
            <strong>X</strong>
          </div>
          <div
            v-if="slotId === 'X' || localFallbackActive"
            class="turn-pill"
            :class="{ live: isMyTurn }"
          >
            {{ isMyTurn ? 'Your Turn' : 'Waiting' }}
          </div>
        </section>

        <section
          class="player-card secondary"
          :class="{ active: slotId === 'O' }"
        >
          <p>Player 2 (O)</p>
          <div class="player-profile-row">
            <div class="avatar o-avatar">{{ playerTwoOccupied ? playerTwoInitial : '+' }}</div>
            <div>
              <h3>{{ playerTwoOccupied ? playerTwoName : 'Nah +' }}</h3>
              <span>{{ playerTwoOccupied ? 'Joined' : 'Waiting to join...' }}</span>
            </div>
            <strong>O</strong>
          </div>

          <button
            v-if="!playerTwoOccupied"
            type="button"
            class="invite-button"
            @click="joinPlayerSlot('O')"
          >
            + Join Player 2
          </button>
        </section>
      </aside>

      <main class="board-zone">
        <div class="status-pill">
          {{ gameStatus }}
        </div>

        <div class="tic-board">
          <button
            v-for="(cell, index) in board"
            :key="index"
            type="button"
            class="tic-cell"
            :class="{
              filled: cell,
              x: cell === 'X',
              o: cell === 'O',
              winner: winningCells.includes(index),
              disabled: !canMakeMove(index)
            }"
            @click="makeMove(index)"
          >
            {{ cell }}
          </button>
        </div>

        <div class="board-caption">
          <span>✕ Player 1</span>
          <span>○ Player 2</span>
          <small v-if="boardLockedReason">{{ boardLockedReason }}</small>
        </div>
      </main>

      <aside class="room-column">
        <section class="room-info-card">
          <div class="room-card-header">
            <h3>Room Info</h3>
            <button type="button">ⓘ</button>
          </div>

          <p>Room Code</p>
          <div class="room-code-box">
            <strong>{{ activeRoomCode }}</strong>
            <span>⧉</span>
          </div>

          <div class="room-detail-line">
            <span>Game</span>
            <strong>Tic Tac Toe</strong>
          </div>
          <div class="room-detail-line">
            <span>Mode</span>
            <strong>{{ modeLabel }}</strong>
          </div>
        </section>

        <section class="room-info-card roster-card">
          <h3>Players ({{ normalizedPlayerCount }}/{{ normalizedMaxPlayers }})</h3>

          <div class="roster-item">
            <div class="mini-avatar x-avatar">{{ playerOneInitial }}</div>
            <div>
              <strong>{{ playerOneName }}</strong>
              <small>Player 1 · X</small>
            </div>
            <span class="tag host">Host</span>
          </div>

          <div class="roster-item">
            <div class="mini-avatar o-avatar">{{ playerTwoOccupied ? playerTwoInitial : '+' }}</div>
            <div>
              <strong>{{ playerTwoOccupied ? playerTwoName : 'Open Slot' }}</strong>
              <small>Player 2 · O</small>
            </div>
            <button
              v-if="!playerTwoOccupied"
              type="button"
              class="small-join"
              @click="joinPlayerSlot('O')"
            >
              Join
            </button>
            <span
              v-else
              class="tag p2"
            >
              Player 2
            </span>
          </div>
        </section>

        <section class="room-info-card roster-card">
          <h3>Spectators ({{ spectatorCount }})</h3>

          <div
            v-if="!spectators.length"
            class="empty-roster"
          >
            👁 No one is watching yet.
          </div>

          <div
            v-for="viewer in spectators"
            v-else
            :key="viewer.socketId"
            class="roster-item"
          >
            <div class="mini-avatar watch-avatar">{{ viewer.initial || '?' }}</div>
            <div>
              <strong>{{ viewer.username || 'Watcher' }}</strong>
              <small>Watching</small>
            </div>
            <span class="tag watch">Spectator</span>
          </div>

          <div
            v-if="hasOpenPlayerSlot && isSpectator"
            class="join-hint"
          >
            <strong>Slot open</strong>
            <span>Join when a player leaves.</span>
          </div>
        </section>
      </aside>
    </div>

    <section class="role-states-panel">
      <p>Role States</p>

      <div class="state-cards">
        <article class="state-card active">
          <span class="state-number">1</span>
          <strong>Player 1 | {{ playerOneName }}</strong>
          <small>You are controlling X.</small>
          <em>👑 Host</em>
        </article>

        <article
          class="state-card"
          :class="{ active: playerOneOccupied && !playerTwoOccupied }"
        >
          <span class="state-number purple">2</span>
          <strong>Player 1 | {{ playerOneName }} +</strong>
          <small>One open slot. Another player can join.</small>
          <button
            v-if="!playerTwoOccupied"
            type="button"
            @click="joinPlayerSlot('O')"
          >
            +
          </button>
        </article>

        <article
          class="state-card"
          :class="{ active: playerOneOccupied && playerTwoOccupied }"
        >
          <span class="state-number green">3</span>
          <strong>Player 1 | Player 2</strong>
          <small>Two players are ready. The match can start.</small>
          <em>{{ roleStateLabel }}</em>
        </article>
      </div>
    </section>

    <div
      v-if="sessionError || localGameError"
      class="tic-error"
    >
      {{ localGameError || sessionError }}
    </div>

    <div
      v-if="isJoining"
      class="joining-badge"
    >
      Joining game session...
    </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Page Shell
========================================================= */
.tic-page {
  width: 100%;
  min-height: 100%;
  padding: 30px 30px 116px;
  position: relative;
  z-index: 2;
  color: #111827;
  text-align: left;
  box-sizing: border-box;
}

.tic-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  margin-bottom: 30px;
}

.library-button,
.watch-button,
.reset-button,
.role-button {
  min-height: 46px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  color: #172033;
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
  transition: 0.16s ease;
}

.library-button {
  padding: 0 18px;
  color: #475569;
}

.library-button:hover,
.watch-button:hover,
.reset-button:hover,
.role-button:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.36);
}

.title-block {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.game-mark {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: white;
  background: linear-gradient(135deg, #2f80ff, #8b5cf6);
  box-shadow: 0 22px 48px rgba(79, 70, 229, 0.26);
  font-size: 36px;
  font-weight: 950;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-row h2 {
  margin: 0;
  color: #101828;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 950;
  letter-spacing: -0.07em;
}

.game-chip {
  padding: 7px 12px;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.86);
  font-size: 12px;
  font-weight: 950;
}

.room-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  font-weight: 900;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.dot.green {
  background: #10b981;
}

.dot.purple {
  background: #8b5cf6;
}

.tic-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.watch-button {
  padding: 0 20px;
  color: #2563eb;
}

.watch-button.active {
  color: white;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
}

.reset-button {
  padding: 0 20px;
}

.reset-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

/* =========================================================
   SECTION 2: Role Selector
========================================================= */
.role-control {
  position: relative;
}

.role-button {
  min-width: 230px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: white;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border-color: rgba(255, 255, 255, 0.4);
}

.role-dot {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
}

.role-button em {
  font-style: normal;
  opacity: 0.9;
}

.role-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 20;
  width: 390px;
  padding: 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 34px 80px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(24px);
}

.role-option {
  width: 100%;
  min-height: 78px;
  padding: 12px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.78);
  color: #111827;
  cursor: pointer;
  text-align: left;
}

.role-option + .role-option {
  margin-top: 10px;
}

.role-option.selected {
  border-color: rgba(59, 130, 246, 0.56);
  background: rgba(239, 246, 255, 0.92);
}

.role-option.disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.option-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  font-size: 20px;
  font-weight: 950;
}

.option-icon.watch {
  background: #e0e7ff;
}

.option-icon.x {
  color: #2563eb;
  background: #dbeafe;
}

.option-icon.o {
  color: #ef476f;
  background: #ffe4e6;
}

.role-option strong {
  display: block;
  font-size: 16px;
  font-weight: 950;
}

.role-option small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.role-option em {
  padding: 6px 10px;
  border-radius: 999px;
  color: #f59e0b;
  background: #fffbeb;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

/* =========================================================
   SECTION 3: Layout
========================================================= */
.tic-layout {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(360px, 1fr) minmax(290px, 380px);
  gap: 24px;
  align-items: start;
}

.player-column,
.room-column {
  display: grid;
  gap: 16px;
}

.player-card,
.room-info-card,
.board-zone,
.role-states-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(24px);
}

.player-card {
  min-height: 190px;
  padding: 24px;
  border-radius: 26px;
}

.player-card.active {
  border-color: rgba(59, 130, 246, 0.42);
  box-shadow: 0 28px 80px rgba(59, 130, 246, 0.15);
}

.player-card p {
  margin: 0 0 18px;
  color: #2563eb;
  font-size: 15px;
  font-weight: 950;
}

.player-card.secondary p {
  color: #ef476f;
}

.player-profile-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.avatar,
.mini-avatar {
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: white;
  font-weight: 950;
}

.avatar {
  width: 58px;
  height: 58px;
  font-size: 24px;
}

.mini-avatar {
  width: 34px;
  height: 34px;
  font-size: 14px;
}

.x-avatar {
  background: linear-gradient(135deg, #2f80ff, #8b5cf6);
}

.o-avatar {
  background: linear-gradient(135deg, #fb7185, #ef476f);
}

.watch-avatar {
  background: linear-gradient(135deg, #64748b, #8b5cf6);
}

.player-profile-row h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 950;
}

.player-profile-row span {
  display: inline-flex;
  margin-top: 6px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.92);
  font-size: 12px;
  font-weight: 950;
}

.player-profile-row strong {
  color: #2563eb;
  font-size: 34px;
  font-weight: 950;
}

.player-card.secondary .player-profile-row strong {
  color: #ef476f;
}

.turn-pill {
  width: fit-content;
  margin-top: 18px;
  padding: 8px 14px;
  border-radius: 999px;
  color: #64748b;
  background: rgba(241, 245, 249, 0.92);
  font-size: 13px;
  font-weight: 950;
}

.turn-pill.live {
  color: #059669;
  background: rgba(209, 250, 229, 0.92);
}

.invite-button {
  margin-top: 22px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(239, 71, 111, 0.22);
  color: #ef476f;
  background: rgba(255, 241, 242, 0.86);
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

/* =========================================================
   SECTION 4: Board
========================================================= */
.board-zone {
  min-height: 560px;
  padding: 36px;
  display: grid;
  place-items: center;
  position: relative;
  border-radius: 30px;
}

.status-pill {
  position: absolute;
  top: 22px;
  left: 22px;
  min-height: 36px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.92);
  font-size: 13px;
  font-weight: 950;
}

.tic-board {
  width: min(440px, 100%);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 22px;
  border-radius: 34px;
  background: rgba(248, 250, 252, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.tic-cell {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 22px;
  color: #111827;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
  font-size: clamp(42px, 5vw, 68px);
  font-weight: 950;
  cursor: pointer;
  transition: 0.16s ease;
}

.tic-cell:hover:not(.disabled) {
  transform: translateY(-3px);
  border-color: rgba(59, 130, 246, 0.36);
}

.tic-cell.disabled {
  cursor: not-allowed;
}

.tic-cell.x {
  color: #2f80ff;
  text-shadow: 0 0 26px rgba(47, 128, 255, 0.28);
}

.tic-cell.o {
  color: #ef476f;
  text-shadow: 0 0 26px rgba(239, 71, 111, 0.24);
}

.tic-cell.winner {
  color: white;
  background: linear-gradient(135deg, #2f80ff, #8b5cf6);
}

.board-caption {
  width: min(440px, 100%);
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  color: #64748b;
  font-size: 14px;
  font-weight: 900;
}

.board-caption span:first-child {
  color: #2563eb;
}

.board-caption span:nth-child(2) {
  color: #ef476f;
}

.board-caption small {
  color: #94a3b8;
  font-weight: 850;
}

/* =========================================================
   SECTION 5: Room Info / Roster
========================================================= */
.room-info-card {
  padding: 22px;
  border-radius: 26px;
}

.room-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.room-info-card h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 950;
}

.room-card-header button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 12px;
  color: #64748b;
  background: rgba(241, 245, 249, 0.9);
}

.room-info-card p {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
}

.room-code-box {
  min-height: 70px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.room-code-box strong {
  color: #0f172a;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.room-detail-line {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
}

.room-detail-line strong {
  color: #111827;
}

.roster-card {
  display: grid;
  gap: 12px;
}

.roster-item {
  min-height: 64px;
  padding: 12px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.roster-item strong {
  display: block;
  color: #111827;
  font-size: 14px;
  font-weight: 950;
}

.roster-item small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.tag,
.small-join {
  padding: 7px 10px;
  border-radius: 999px;
  border: none;
  font-size: 12px;
  font-weight: 950;
}

.tag.host {
  color: #d97706;
  background: #fffbeb;
}

.tag.p2 {
  color: #ef476f;
  background: #fff1f2;
}

.tag.watch {
  color: #7c3aed;
  background: #f3e8ff;
}

.small-join {
  color: white;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  cursor: pointer;
}

.empty-roster {
  padding: 16px;
  border-radius: 16px;
  color: #64748b;
  background: rgba(248, 250, 252, 0.78);
  font-size: 13px;
  font-weight: 850;
}

.join-hint {
  padding: 14px;
  border-radius: 16px;
  color: #2563eb;
  background: rgba(239, 246, 255, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.join-hint strong,
.join-hint span {
  display: block;
}

.join-hint span {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

/* =========================================================
   SECTION 6: Role States
========================================================= */
.role-states-panel {
  margin-top: 22px;
  padding: 20px;
  border-radius: 26px;
}

.role-states-panel > p {
  margin: 0 0 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.state-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.state-card {
  min-height: 104px;
  padding: 16px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.12);
  opacity: 0.74;
}

.state-card.active {
  opacity: 1;
  border-color: rgba(59, 130, 246, 0.28);
}

.state-number {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: white;
  background: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.state-number.purple {
  background: #8b5cf6;
}

.state-number.green {
  background: #10b981;
}

.state-card strong {
  color: #111827;
  font-size: 15px;
  font-weight: 950;
}

.state-card small {
  display: block;
  grid-column: 2;
  margin-top: -18px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.state-card em,
.state-card button {
  justify-self: end;
  border: none;
  border-radius: 999px;
  color: #d97706;
  background: #fffbeb;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.state-card button {
  width: 32px;
  height: 32px;
  color: #2563eb;
  background: #dbeafe;
  cursor: pointer;
}

/* =========================================================
   SECTION 7: Utility Badges / Responsive
========================================================= */
.tic-error,
.joining-badge {
  position: fixed;
  left: 50%;
  bottom: 112px;
  transform: translateX(-50%);
  z-index: 50;
  padding: 12px 16px;
  border-radius: 999px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
  font-size: 13px;
  font-weight: 950;
}

.tic-error {
  color: #b91c1c;
  background: #fee2e2;
}

.joining-badge {
  color: #2563eb;
  background: #dbeafe;
}

@media (max-width: 1180px) {
  .tic-header {
    grid-template-columns: 1fr;
  }

  .tic-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .tic-layout {
    grid-template-columns: 1fr;
  }

  .state-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .tic-page {
    padding: 22px 18px 112px;
  }

  .title-block {
    align-items: flex-start;
  }

  .game-mark {
    width: 54px;
    height: 54px;
    font-size: 28px;
  }

  .role-button {
    min-width: 100%;
  }

  .role-menu {
    left: 0;
    right: auto;
    width: min(360px, calc(100vw - 36px));
  }

  .board-zone {
    min-height: 480px;
    padding: 26px 18px;
  }
}
</style>
