<template>
  <!-- =========================================================
    SECTION 1: 2048 GAME PAGE WRAPPER
  ========================================================== -->
  <section class="game2048-section">
    <div class="game2048-shell">
      <!-- =====================================================
        SECTION 1.5: GAME SESSION HEADER
        Purpose:
        - Match VOXYN v0.9 Host / Watch / Join flow
        - Keep this local inside Game2048 for v1.0
      ====================================================== -->
      <section class="game2048-session-header">
        <div class="session-left">
          <button
            type="button"
            class="return-library-button"
            @click="emit('back-to-library')"
          >
            ← Back to Library
          </button>

          <div class="game-icon-card">
            #
          </div>

          <div class="session-title-box">
            <div class="session-title-line">
              <h2>2048</h2>
              <span>Game 3</span>
            </div>

            <p>
              Room {{ roomLabel }}
              <b></b>
              {{ playerCountLabel }} Players
              <b></b>
              {{ spectatorCount }} Watching
            </p>
          </div>
        </div>

        <div class="session-actions">
          <button
            type="button"
            class="session-watch-btn"
            :class="{ active: isWatcher }"
            @click="setSessionRole('watcher')"
          >
            👁 Watch
          </button>

          <button
            type="button"
            class="session-role-btn"
            :class="{ active: !isWatcher }"
            @click="setSessionRole('player')"
          >
            <span>{{ isWatcher ? '＋' : playerInitial }}</span>
            {{ roleActionLabel }}
          </button>

          <button
            type="button"
            class="session-reset-btn"
            :disabled="isWatcher"
            @click="startNewGame"
          >
            ↻ Reset
          </button>
        </div>
      </section>

      <!-- =====================================================
        SECTION 2: TOP INFO / SCORE BAR
      ====================================================== -->
      <section class="game2048-top-section">
        <div class="game2048-title-box">
          <p class="game2048-label">{{ gameModeLabel }}</p>
          <h2>2048</h2>
          <p>
            Slide tiles, merge numbers, and reach 2048.
          </p>
        </div>

        <div class="game2048-score-box">
          <div class="score-card">
            <span>Score</span>
            <strong>{{ score }}</strong>
          </div>

          <div class="score-card">
            <span>Best</span>
            <strong>{{ bestScore }}</strong>
          </div>
        </div>
      </section>

      <!-- =====================================================
        SECTION 3: STATUS BAR
      ====================================================== -->
      <section class="game2048-status-section">
        <div
          class="status-pill"
          :class="{ win: hasWon, over: gameOver, watching: isWatcher }"
        >
          {{ statusLabel }}
        </div>

        <div class="status-meta">
          <span>{{ moves }} Moves</span>
          <span>{{ elapsedLabel }}</span>
          <span>{{ roleStatusText }}</span>
        </div>
      </section>

      <!-- =====================================================
        SECTION 4: GAME BODY
      ====================================================== -->
      <section class="game2048-body-section">
        <!-- ================= BOARD ================= -->
        <div class="game2048-board-card">
          <div
            ref="boardRef"
            class="game2048-board"
            :class="{ 'is-watching': isWatcher }"
            tabindex="0"
            @touchstart.passive="handleTouchStart"
            @touchend.passive="handleTouchEnd"
          >
            <div
              v-for="(cell, index) in flatBoard"
              :key="index"
              class="board-cell"
            >
              <div
                v-if="cell"
                class="board-tile"
                :class="getTileClass(cell)"
              >
                {{ cell }}
              </div>
            </div>

            <div v-if="isWatcher" class="watcher-board-overlay">
              <span>👁 Watching</span>
              <p>Read-only mode</p>
            </div>
          </div>
        </div>

        <!-- ================= SIDE PANEL ================= -->
        <aside class="game2048-side-panel">
          <div class="side-card current-role-card" :class="{ watcher: isWatcher }">
            <p class="side-label">Current Status</p>
            <h3>{{ statusTitle }}</h3>
            <p>{{ statusText }}</p>
          </div>

          <div class="side-card">
            <p class="side-label">Control</p>

            <div class="control-buttons">
              <button
                class="primary-button"
                :disabled="isWatcher"
                @click="startNewGame"
              >
                New Game
              </button>

              <button
                class="glass-button"
                :disabled="!canUndo || isWatcher"
                @click="undoMove"
              >
                Undo
              </button>
            </div>
          </div>

          <div class="side-card room-card">
            <div class="room-card-header">
              <div>
                <p class="side-label">Room Info</p>
                <h3>{{ roomLabel }}</h3>
              </div>

              <span class="info-dot">ⓘ</span>
            </div>

            <div class="info-row">
              <span>Game</span>
              <strong>2048</strong>
            </div>

            <div class="info-row">
              <span>Mode</span>
              <strong>{{ gameModeLabel }}</strong>
            </div>

            <div class="info-row">
              <span>Role</span>
              <strong>{{ roleStatusText }}</strong>
            </div>
          </div>

          <div class="side-card players-card">
            <p class="side-label">Players ({{ playerCountLabel }})</p>

            <div class="mini-user-row active">
              <div class="mini-avatar">
                {{ isWatcher ? 'P' : playerInitial }}
              </div>

              <div>
                <strong>{{ isWatcher ? 'Player 1' : playerName }}</strong>
                <span>Player 1 · 2048</span>
              </div>

              <em>{{ isWatcher ? 'Live' : 'Host' }}</em>
            </div>

            <button
              v-if="isWatcher"
              type="button"
              class="join-slot-button"
              @click="setSessionRole('player')"
            >
              ＋ Join Player 1
            </button>
          </div>

          <div class="side-card spectators-card">
            <p class="side-label">Spectators ({{ spectatorCount }})</p>

            <div v-if="isWatcher" class="mini-user-row watcher-row">
              <div class="mini-avatar watcher-avatar">👁</div>

              <div>
                <strong>{{ playerName }}</strong>
                <span>Watching</span>
              </div>
            </div>

            <p v-else class="empty-watchers">
              👁 No one is watching yet.
            </p>
          </div>
        </aside>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

/* =========================================================
  SECTION 1: CONSTANTS
========================================================== */
const BOARD_SIZE = 4
const BEST_SCORE_KEY = "voxyn_2048_best_score"

/* =========================================================
  SECTION 1.5: Props / Emits
  Purpose:
  - Receive GameStage session role
  - Return user back to Game Library
========================================================== */
const props = defineProps({
  mode: {
    type: String,
    default: "single-player"
  },
  modeLabel: {
    type: String,
    default: "Single Player"
  },
  defaultRole: {
    type: String,
    default: "host"
  },
  watchRoomCode: {
    type: String,
    default: ""
  },
  roomCode: {
    type: String,
    default: ""
  },
  user: {
    type: Object,
    default: null
  },
  socket: {
    type: Object,
    default: null
  },
  session: {
    type: Object,
    default: null
  },
  gameState: {
    type: Object,
    default: null
  },
  role: {
    type: String,
    default: ""
  },
  slotId: {
    type: String,
    default: ""
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(["back-to-library", "state-change"])

/* =========================================================
  SECTION 2: GAME STATE
========================================================== */
const board = ref(createEmptyBoard())
const score = ref(0)
const bestScore = ref(0)
const moves = ref(0)

const hasWon = ref(false)
const gameOver = ref(false)

const history = ref([])
const boardRef = ref(null)

/* =========================================================
  SECTION 2.5: SESSION ROLE STATE
  Purpose:
  - Local v0.9 Host / Join / Watch layer
  - Full socket sync can be added later
========================================================== */
const activeRole = ref(normalizeRole(props.role || props.defaultRole || props.mode))

const isWatcher = computed(() => {
  return props.readonly || activeRole.value === "watcher"
})

const playerName = computed(() => {
  return (
    props.user?.display_name ||
    props.user?.username ||
    props.user?.email?.split("@")[0] ||
    "Player"
  )
})

const playerInitial = computed(() => {
  return playerName.value.charAt(0).toUpperCase()
})

const roomLabel = computed(() => {
  return props.watchRoomCode || props.roomCode || "Local Room"
})

const gameModeLabel = computed(() => {
  if (isWatcher.value) return "Watch Mode"
  if (props.modeLabel) return props.modeLabel
  if (props.mode) return String(props.mode)

  return "Single Player"
})

const roleTitle = computed(() => {
  if (activeRole.value === "watcher") return "Watcher"
  return `Player 1 | ${playerName.value}`
})

const roleActionLabel = computed(() => {
  if (isWatcher.value) return "Join Player 1"
  return roleTitle.value
})

const roleStatusText = computed(() => {
  if (activeRole.value === "watcher") return "Watching"
  if (activeRole.value === "host") return "Host"

  return "Joined"
})

const playerCountLabel = computed(() => {
  const playerCount = Number(props.session?.playerCount ?? 1)
  const maxPlayers = Number(props.session?.maxPlayers ?? 1)

  return `${playerCount}/${maxPlayers}`
})

const spectatorCount = computed(() => {
  return Number(props.session?.spectatorCount || 0)
})

watch(
  () => props.role,
  (nextRole) => {
    if (!nextRole) return
    activeRole.value = normalizeRole(nextRole)
  },
  { immediate: true }
)

watch(
  () => props.defaultRole,
  (nextRole) => {
    if (props.role) return
    activeRole.value = normalizeRole(nextRole || props.mode)
  }
)

watch(
  () => props.mode,
  (nextMode) => {
    if (props.role || props.defaultRole) return
    activeRole.value = normalizeRole(nextMode)
  }
)

watch(
  () => props.gameState,
  (nextState) => {
    applyRemoteGameState(nextState)
  },
  { deep: true, immediate: true }
)

function normalizeRole(role) {
  const value = String(role || "").toLowerCase()

  if (value === "spectator") return "watcher"
  if (value === "watch") return "watcher"
  if (value === "watcher") return "watcher"
  if (value === "rooms") return "watcher"
  if (value === "host") return "host"
  if (value === "player") return "player"
  if (value === "join") return "player"
  if (value === "single-player") return "host"
  if (value === "single player") return "host"

  return "host"
}

function setSessionRole(role) {
  const nextRole = normalizeRole(role)

  if (props.readonly && nextRole !== "watcher") return

  activeRole.value = nextRole

  nextTick(() => {
    boardRef.value?.focus()
  })
}

/* =========================================================
  SECTION 3: TIMER STATE
========================================================== */
const startedAt = ref(Date.now())
const elapsedSeconds = ref(0)

let timer = null

/* =========================================================
  SECTION 4: TOUCH STATE
========================================================== */
let touchStartX = 0
let touchStartY = 0

/* =========================================================
  SECTION 5: COMPUTED
========================================================== */
const flatBoard = computed(() => {
  return board.value.flat()
})

const canUndo = computed(() => {
  return history.value.length > 0
})

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

const statusLabel = computed(() => {
  if (isWatcher.value) return "Watching"
  if (gameOver.value) return "Game Over"
  if (hasWon.value) return "2048 Reached"

  return "Playing"
})

const statusTitle = computed(() => {
  if (isWatcher.value) return "Watching Game"
  if (gameOver.value) return "No Moves Left"
  if (hasWon.value) return "You Reached 2048"

  return "Keep Building"
})

const statusText = computed(() => {
  if (isWatcher.value) {
    return "You are watching this 2048 run in read-only mode. Join Player 1 to take control."
  }

  if (gameOver.value) {
    return "The board is locked. Start a new game and try to beat your best score."
  }

  if (hasWon.value) {
    return "Nice. You can keep playing and push the score even higher."
  }

  return "Merge matching tiles and keep enough space on the board."
})

/* =========================================================
  SECTION 6: LIFECYCLE
========================================================== */
onMounted(() => {
  loadBestScore()

  if (hasUsableRemoteGameState(props.gameState)) {
    applyRemoteGameState(props.gameState)
  } else if (!isWatcher.value) {
    initializeGame()
  }

  window.addEventListener("keydown", handleKeyDown)

  timer = window.setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startedAt.value) / 1000)
  }, 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown)

  if (timer) {
    window.clearInterval(timer)
  }
})

/* =========================================================
  SECTION 7: GAME INITIALIZATION
========================================================== */
function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => {
    return Array(BOARD_SIZE).fill(0)
  })
}

function initializeGame() {
  board.value = createEmptyBoard()
  score.value = 0
  moves.value = 0
  hasWon.value = false
  gameOver.value = false
  history.value = []

  startedAt.value = Date.now()
  elapsedSeconds.value = 0

  addRandomTile()
  addRandomTile()
  pushLocalGameState("new-game")

  nextTick(() => {
    boardRef.value?.focus()
  })
}

function startNewGame() {
  if (isWatcher.value) return

  initializeGame()
}

function getLocalGameState(action = "sync") {
  return {
    board: cloneBoard(board.value),
    score: score.value,
    bestScore: bestScore.value,
    moves: moves.value,
    hasWon: hasWon.value,
    gameOver: gameOver.value,
    elapsedSeconds: elapsedSeconds.value,
    status: gameOver.value ? "game-over" : hasWon.value ? "won" : "playing",
    action,
    updatedAt: Date.now(),
  }
}

function pushLocalGameState(action = "sync") {
  if (isWatcher.value) return

  emit("state-change", getLocalGameState(action))
}

function hasUsableRemoteGameState(nextState) {
  if (!nextState || !Array.isArray(nextState.board)) return false

  return nextState.board.some((row) => {
    return Array.isArray(row) && row.some((value) => Number(value) > 0)
  })
}

function applyRemoteGameState(nextState) {
  if (!nextState || !Array.isArray(nextState.board)) return

  const nextBoard = nextState.board.map((row) => {
    return Array.isArray(row)
      ? row.slice(0, BOARD_SIZE).map((value) => Number(value) || 0)
      : Array(BOARD_SIZE).fill(0)
  }).slice(0, BOARD_SIZE)

  while (nextBoard.length < BOARD_SIZE) {
    nextBoard.push(Array(BOARD_SIZE).fill(0))
  }

  board.value = nextBoard
  score.value = Number(nextState.score || 0)
  bestScore.value = Math.max(bestScore.value, Number(nextState.bestScore || 0))
  moves.value = Number(nextState.moves || 0)
  hasWon.value = Boolean(nextState.hasWon || nextState.status === "won")
  gameOver.value = Boolean(nextState.gameOver || nextState.status === "game-over")
  elapsedSeconds.value = Number(nextState.elapsedSeconds || 0)
  if (isWatcher.value) {
    history.value = []
  }

  startedAt.value = Date.now() - elapsedSeconds.value * 1000
}

/* =========================================================
  SECTION 8: INPUT HANDLERS
========================================================== */
function handleKeyDown(event) {
  if (isWatcher.value) return

  const target = event.target

  if (
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.isContentEditable
  ) {
    return
  }

  const directionMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
  }

  const direction = directionMap[event.key]

  if (!direction) return

  event.preventDefault()
  move(direction)
}

function handleTouchStart(event) {
  if (isWatcher.value) return

  const touch = event.touches[0]

  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

function handleTouchEnd(event) {
  if (isWatcher.value) return

  const touch = event.changedTouches[0]

  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY

  const minDistance = 32

  if (Math.abs(deltaX) < minDistance && Math.abs(deltaY) < minDistance) {
    return
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    move(deltaX > 0 ? "right" : "left")
  } else {
    move(deltaY > 0 ? "down" : "up")
  }
}

/* =========================================================
  SECTION 9: MOVE LOGIC
========================================================== */
function move(direction) {
  if (gameOver.value || isWatcher.value) return

  const previousState = {
    board: cloneBoard(board.value),
    score: score.value,
    moves: moves.value,
    hasWon: hasWon.value,
    gameOver: gameOver.value,
  }

  const result = calculateMove(board.value, direction)

  if (!result.changed) return

  history.value = [previousState]

  board.value = result.board
  score.value += result.gained
  moves.value += 1

  if (result.reached2048) {
    hasWon.value = true
  }

  addRandomTile()
  updateBestScore()

  if (!canMove(board.value)) {
    gameOver.value = true
  }

  pushLocalGameState("move")
}

function calculateMove(currentBoard, direction) {
  let workingBoard = cloneBoard(currentBoard)

  if (direction === "up") {
    workingBoard = transposeBoard(workingBoard)
  }

  if (direction === "down") {
    workingBoard = transposeBoard(workingBoard).map((row) => {
      return row.reverse()
    })
  }

  if (direction === "right") {
    workingBoard = workingBoard.map((row) => {
      return row.reverse()
    })
  }

  let gained = 0
  let reached2048 = false

  const movedBoard = workingBoard.map((row) => {
    const result = mergeRow(row)

    gained += result.gained

    if (result.reached2048) {
      reached2048 = true
    }

    return result.row
  })

  let finalBoard = movedBoard

  if (direction === "right") {
    finalBoard = finalBoard.map((row) => {
      return row.reverse()
    })
  }

  if (direction === "up") {
    finalBoard = transposeBoard(finalBoard)
  }

  if (direction === "down") {
    finalBoard = finalBoard.map((row) => {
      return row.reverse()
    })

    finalBoard = transposeBoard(finalBoard)
  }

  return {
    board: finalBoard,
    gained,
    reached2048,
    changed: !boardsAreEqual(currentBoard, finalBoard),
  }
}

function mergeRow(row) {
  const numbers = row.filter((value) => {
    return value !== 0
  })

  const mergedRow = []
  let gained = 0
  let reached2048 = false

  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] === numbers[i + 1]) {
      const mergedValue = numbers[i] * 2

      mergedRow.push(mergedValue)
      gained += mergedValue

      if (mergedValue >= 2048) {
        reached2048 = true
      }

      i++
    } else {
      mergedRow.push(numbers[i])
    }
  }

  while (mergedRow.length < BOARD_SIZE) {
    mergedRow.push(0)
  }

  return {
    row: mergedRow,
    gained,
    reached2048,
  }
}

/* =========================================================
  SECTION 10: BOARD HELPERS
========================================================== */
function cloneBoard(source) {
  return source.map((row) => {
    return [...row]
  })
}

function transposeBoard(source) {
  return source[0].map((_, colIndex) => {
    return source.map((row) => row[colIndex])
  })
}

function boardsAreEqual(a, b) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (a[row][col] !== b[row][col]) {
        return false
      }
    }
  }

  return true
}

function canMove(source) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (source[row][col] === 0) {
        return true
      }

      if (
        col < BOARD_SIZE - 1 &&
        source[row][col] === source[row][col + 1]
      ) {
        return true
      }

      if (
        row < BOARD_SIZE - 1 &&
        source[row][col] === source[row + 1][col]
      ) {
        return true
      }
    }
  }

  return false
}

function addRandomTile() {
  const emptyCells = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] === 0) {
        emptyCells.push({ row, col })
      }
    }
  }

  if (!emptyCells.length) return

  const pickedCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]

  board.value[pickedCell.row][pickedCell.col] = Math.random() < 0.9 ? 2 : 4
}

/* =========================================================
  SECTION 11: UNDO / BEST SCORE
========================================================== */
function undoMove() {
  if (isWatcher.value) return

  const lastState = history.value[0]

  if (!lastState) return

  board.value = cloneBoard(lastState.board)
  score.value = lastState.score
  moves.value = lastState.moves
  hasWon.value = lastState.hasWon
  gameOver.value = lastState.gameOver

  history.value = []

  pushLocalGameState("undo")

  nextTick(() => {
    boardRef.value?.focus()
  })
}

function loadBestScore() {
  try {
    const storedScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0)

    bestScore.value = Number.isFinite(storedScore) ? storedScore : 0
  } catch {
    bestScore.value = 0
  }
}

function updateBestScore() {
  if (score.value <= bestScore.value) return

  bestScore.value = score.value

  try {
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore.value))
  } catch {
    // localStorage may be blocked in some browser modes.
  }
}

/* =========================================================
  SECTION 12: TILE STYLE
========================================================== */
function getTileClass(value) {
  if (value >= 2048) {
    return "tile-super"
  }

  return `tile-${value}`
}
</script>

<style scoped>
/* =========================================================
  SECTION 1: PAGE WRAPPER
========================================================= */
.game2048-section {
  width: 100%;
  padding: 18px;
}

.game2048-shell {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, rgba(145, 175, 255, 0.24), transparent 34%),
    radial-gradient(circle at top right, rgba(200, 150, 255, 0.22), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(246, 248, 255, 0.74));
  box-shadow:
    0 24px 70px rgba(45, 60, 105, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
}

/* =========================================================
  SECTION 1.5: SESSION HEADER
========================================================= */
.game2048-session-header {
  margin-bottom: 22px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.session-left {
  min-width: 0;

  display: flex;
  align-items: center;
  gap: 14px;
}

.return-library-button {
  height: 48px;
  padding: 0 20px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  border: none;
  border-radius: 18px;

  color: #334155;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72)),
    rgba(255,255,255,0.72);

  box-shadow:
    0 14px 32px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.96);

  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;

  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.return-library-button:hover {
  transform: translateY(-1px);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,246,255,0.78)),
    rgba(255,255,255,0.78);
  box-shadow:
    0 18px 38px rgba(15, 23, 42, 0.10),
    inset 0 1px 0 rgba(255,255,255,1);
}

.game-icon-card {
  width: 70px;
  height: 70px;

  display: grid;
  place-items: center;

  border-radius: 22px;
  color: white;
  background: linear-gradient(135deg, #0a84ff, #4f46e5);
  box-shadow:
    0 22px 54px rgba(37, 99, 235, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);

  font-size: 32px;
  font-weight: 950;
}

.session-title-box {
  min-width: 0;
  text-align: left;
}

.session-title-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-title-line h2 {
  margin: 0;

  color: #101828;
  font-size: clamp(38px, 5vw, 58px);
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.95;
}

.session-title-line span {
  padding: 8px 12px;

  border-radius: 999px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.10);

  font-size: 12px;
  font-weight: 950;
}

.session-title-box p {
  margin: 10px 0 0;

  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  color: #667085;
  font-size: 14px;
  font-weight: 900;
}

.session-title-box p b {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
}

.session-title-box p b:last-of-type {
  background: #8b5cf6;
}

.session-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.session-watch-btn,
.session-role-btn,
.session-reset-btn {
  height: 48px;
  padding: 0 18px;

  border: none;
  border-radius: 18px;

  font-family: inherit;
  font-size: 14px;
  font-weight: 950;

  cursor: pointer;

  box-shadow:
    0 14px 30px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.9);

  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;
}

.session-watch-btn:hover,
.session-role-btn:hover,
.session-reset-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.session-watch-btn {
  color: #2563eb;
  background: rgba(255, 255, 255, 0.78);
}

.session-watch-btn.active {
  color: white;
  background: linear-gradient(135deg, #64748b, #2563eb);
}

.session-role-btn {
  min-width: 210px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  color: white;
  background: linear-gradient(135deg, #0a84ff, #7c3aed);
}

.session-role-btn span {
  width: 28px;
  height: 28px;

  display: grid;
  place-items: center;

  border-radius: 10px;
  background: rgba(255,255,255,0.18);
}

.session-role-btn.active {
  box-shadow:
    0 18px 38px rgba(79, 70, 229, 0.22),
    inset 0 1px 0 rgba(255,255,255,0.35);
}

.session-reset-btn {
  color: #334155;
  background: rgba(255,255,255,0.78);
}

.session-reset-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

/* =========================================================
  SECTION 2: TOP INFO
========================================================= */
.game2048-top-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.game2048-title-box {
  min-width: 0;
}

.game2048-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: rgba(77, 93, 136, 0.68);
}

.game2048-title-box h2 {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 0.95;
  letter-spacing: -0.06em;
  color: rgba(26, 32, 52, 0.96);
}

.game2048-title-box p {
  margin: 10px 0 0;
  color: rgba(73, 84, 112, 0.72);
  font-size: 14px;
  line-height: 1.45;
}

/* =========================================================
  SECTION 3: SCORE CARDS
========================================================= */
.game2048-score-box {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.score-card {
  min-width: 92px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow:
    0 12px 30px rgba(42, 55, 95, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  text-align: center;
}

.score-card span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(76, 89, 125, 0.62);
}

.score-card strong {
  display: block;
  font-size: 22px;
  line-height: 1;
  color: rgba(25, 31, 50, 0.95);
}

/* =========================================================
  SECTION 4: STATUS BAR
========================================================= */
.game2048-status-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.44);
}

.status-pill {
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(70, 112, 255, 0.1);
  color: rgba(45, 75, 170, 0.9);
  font-size: 12px;
  font-weight: 800;
}

.status-pill.win {
  background: rgba(72, 184, 128, 0.12);
  color: rgba(26, 126, 80, 0.92);
}

.status-pill.over {
  background: rgba(255, 82, 98, 0.12);
  color: rgba(187, 38, 55, 0.92);
}

.status-pill.watching {
  background: rgba(100, 116, 139, 0.12);
  color: rgba(71, 85, 105, 0.95);
}

.status-meta {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.status-meta span {
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: rgba(74, 84, 112, 0.72);
  font-size: 12px;
  font-weight: 700;
}

/* =========================================================
  SECTION 5: MAIN BODY
========================================================= */
.game2048-body-section {
  display: grid;
  grid-template-columns: minmax(320px, 560px) minmax(300px, 1fr);
  gap: 18px;
  align-items: stretch;
}

/* =========================================================
  SECTION 6: BOARD
========================================================= */
.game2048-board-card {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 18px 40px rgba(41, 53, 92, 0.1);
}

.game2048-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
  border-radius: 24px;
  background:
    linear-gradient(145deg, rgba(220, 226, 242, 0.72), rgba(246, 248, 255, 0.7));
  outline: none;
  user-select: none;
  touch-action: none;
}

.game2048-board.is-watching {
  cursor: not-allowed;
}

.board-cell {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.84),
    inset 0 -1px 0 rgba(130, 144, 180, 0.08);
  overflow: hidden;
}

.board-tile {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 18px;
  font-size: clamp(22px, 5vw, 44px);
  font-weight: 900;
  letter-spacing: -0.05em;
  color: rgba(28, 35, 58, 0.92);
  box-shadow:
    0 12px 26px rgba(44, 55, 92, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: tilePop 140ms ease-out;
}

.watcher-board-overlay {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 4;

  padding: 10px 13px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow:
    0 12px 26px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(16px);
  text-align: center;
}

.watcher-board-overlay span {
  display: block;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.watcher-board-overlay p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

/* =========================================================
  SECTION 7: TILE COLORS
========================================================= */
.tile-2 {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(235, 239, 252, 0.9));
}

.tile-4 {
  background: linear-gradient(145deg, rgba(240, 245, 255, 0.96), rgba(218, 227, 255, 0.9));
}

.tile-8 {
  background: linear-gradient(145deg, rgba(224, 235, 255, 0.98), rgba(174, 200, 255, 0.92));
}

.tile-16 {
  background: linear-gradient(145deg, rgba(207, 226, 255, 0.98), rgba(138, 178, 255, 0.92));
}

.tile-32 {
  background: linear-gradient(145deg, rgba(217, 218, 255, 0.98), rgba(162, 153, 255, 0.92));
}

.tile-64 {
  background: linear-gradient(145deg, rgba(232, 219, 255, 0.98), rgba(183, 147, 255, 0.92));
}

.tile-128 {
  background: linear-gradient(145deg, rgba(219, 245, 255, 0.98), rgba(130, 211, 255, 0.92));
  font-size: clamp(20px, 4.2vw, 38px);
}

.tile-256 {
  background: linear-gradient(145deg, rgba(217, 255, 244, 0.98), rgba(125, 229, 198, 0.92));
  font-size: clamp(20px, 4.2vw, 38px);
}

.tile-512 {
  background: linear-gradient(145deg, rgba(236, 255, 221, 0.98), rgba(171, 229, 125, 0.92));
  font-size: clamp(20px, 4.2vw, 38px);
}

.tile-1024 {
  background: linear-gradient(145deg, rgba(255, 244, 211, 0.98), rgba(255, 204, 103, 0.92));
  font-size: clamp(18px, 3.8vw, 34px);
}

.tile-super {
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8), transparent 32%),
    linear-gradient(145deg, rgba(255, 224, 237, 0.98), rgba(255, 126, 172, 0.94));
  color: rgba(42, 28, 44, 0.95);
  font-size: clamp(18px, 3.8vw, 34px);
}

/* =========================================================
  SECTION 8: SIDE PANEL
========================================================= */
.game2048-side-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-card {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow:
    0 14px 34px rgba(42, 55, 95, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.current-role-card.watcher {
  border-color: rgba(100, 116, 139, 0.16);
  background: rgba(255, 255, 255, 0.68);
}

.side-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(77, 93, 136, 0.58);
}

.side-card h3 {
  margin: 0 0 8px;
  color: rgba(25, 31, 50, 0.95);
  font-size: 22px;
  letter-spacing: -0.04em;
}

.side-card p {
  margin: 0;
  color: rgba(71, 82, 110, 0.72);
  line-height: 1.5;
  font-size: 13px;
}

.room-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.info-dot {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #64748b;
  background: rgba(241, 245, 249, 0.78);
  font-size: 14px;
  font-weight: 950;
}

.info-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #667085;
  font-size: 13px;
  font-weight: 850;
}

.info-row strong {
  color: #101828;
  font-weight: 950;
}

.mini-user-row {
  margin-top: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(226, 232, 240, 0.78);
}

.mini-user-row.active {
  border-color: rgba(37, 99, 235, 0.14);
}

.mini-avatar {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: white;
  background: linear-gradient(135deg, #0a84ff, #7c3aed);
  font-size: 16px;
  font-weight: 950;
}

.watcher-avatar {
  background: linear-gradient(135deg, #64748b, #2563eb);
  font-size: 15px;
}

.mini-user-row div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.mini-user-row strong {
  display: block;
  color: #101828;
  font-size: 14px;
  font-weight: 950;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-user-row span {
  display: block;
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.mini-user-row em {
  padding: 7px 10px;
  border-radius: 999px;
  color: #ea580c;
  background: rgba(251, 146, 60, 0.12);
  font-style: normal;
  font-size: 12px;
  font-weight: 950;
}

.join-slot-button {
  width: 100%;
  height: 42px;
  margin-top: 12px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 16px;
  color: #2563eb;
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    0 10px 22px rgba(37, 99, 235, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.86);
  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

.empty-watchers {
  margin-top: 10px !important;
  padding: 12px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.72);
  color: #667085 !important;
  font-weight: 850;
}

/* =========================================================
  SECTION 9: BUTTONS
========================================================= */
.control-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.primary-button,
.glass-button {
  height: 46px;
  border: none;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.primary-button {
  color: white;
  background: linear-gradient(135deg, rgba(73, 112, 255, 0.96), rgba(140, 92, 255, 0.94));
  box-shadow: 0 14px 28px rgba(89, 106, 230, 0.28);
}

.glass-button {
  color: rgba(54, 67, 104, 0.82);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 24px rgba(42, 55, 95, 0.08);
}

.primary-button:hover:not(:disabled),
.glass-button:hover:not(:disabled),
.join-slot-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled,
.glass-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* =========================================================
  SECTION 10: ANIMATION
========================================================= */
@keyframes tilePop {
  from {
    transform: scale(0.86);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* =========================================================
  SECTION 11: RESPONSIVE
========================================================= */
@media (max-width: 980px) {
  .game2048-session-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .session-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 860px) {
  .game2048-body-section {
    grid-template-columns: 1fr;
  }

  .game2048-side-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .current-role-card,
  .room-card {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .game2048-section {
    padding: 10px;
  }

  .game2048-shell {
    padding: 14px;
    border-radius: 26px;
  }

  .session-left {
    align-items: flex-start;
    flex-direction: column;
  }

  .session-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .session-watch-btn,
  .session-role-btn,
  .session-reset-btn {
    width: 100%;
  }

  .game2048-top-section {
    flex-direction: column;
  }

  .game2048-score-box {
    width: 100%;
  }

  .score-card {
    flex: 1;
  }

  .game2048-status-section {
    align-items: flex-start;
    flex-direction: column;
  }

  .status-meta {
    justify-content: flex-start;
  }

  .game2048-board {
    gap: 8px;
    padding: 8px;
    border-radius: 20px;
  }

  .board-cell,
  .board-tile {
    border-radius: 14px;
  }

  .game2048-side-panel {
    grid-template-columns: 1fr;
  }
}
</style>
