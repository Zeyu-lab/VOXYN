<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue helpers
   - Keep Falling Blocks as a standalone VOXYN game module
========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useGameSession } from "./useGameSession"
/* =========================================================
   SECTION 2: Props / Emits
   Purpose:
   - Receive shared game-stage props from GameStage
   - Send user back to Game Library
========================================================= */
const props = defineProps({
  mode: {
    type: String,
    default: "Single Player"
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
   SECTION 2.1: Backend Game Session
   Purpose:
   - Join Falling Blocks as player if slot is open
   - Join as spectator when player slot is full
   - Allow spectators to watch live game state
========================================================= */
const activeRoomCode = computed(() => {
  return props.watchRoomCode || props.roomCode
})

const gameSession = useGameSession({
  socket: () => props.socket,
  roomCode: () => activeRoomCode.value,
  gameId: "falling-blocks",
  defaultRole: props.defaultRole,
  allowLocalFallback: true
})

/* =========================================================
   SECTION 3: Board Constants
   Purpose:
   - Define the Falling Blocks board size
========================================================= */
const BOARD_ROWS = 15
const BOARD_COLS = 10

/* =========================================================
   SECTION 4: Difficulty Settings
   Purpose:
   - Let player choose falling speed
   - Keep VOXYN-style game mode names
========================================================= */
const difficultyOptions = [
  {
    id: "casual",
    label: "Casual",
    speedLabel: "900ms",
    baseSpeed: 900,
    description: "Relaxed drop speed."
  },
  {
    id: "standard",
    label: "Standard",
    speedLabel: "650ms",
    baseSpeed: 650,
    description: "Default VOXYN speed."
  },
  {
    id: "fast",
    label: "Fast",
    speedLabel: "420ms",
    baseSpeed: 420,
    description: "Quick reaction mode."
  },
  {
    id: "chaos",
    label: "Chaos",
    speedLabel: "160ms",
    baseSpeed: 160,
    description: "High pressure mode."
  }
]

const selectedDifficulty = ref("standard")

/* =========================================================
   SECTION 5: Piece Definitions
   Purpose:
   - Define falling block shapes
   - Use simple matrix shapes for movement / rotation
========================================================= */
const pieceShapes = {
  I: [
    [1, 1, 1, 1]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1]
  ]
}

const pieceTypes = Object.keys(pieceShapes)

/* =========================================================
   SECTION 6: Game State
   Purpose:
   - Track board, active piece, score, timer, and status
========================================================= */
const board = ref(createEmptyBoard())
const activePiece = ref(null)
const nextPiece = ref(createRandomPiece())

const gameStatus = ref("idle")
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const elapsedSeconds = ref(0)

let dropTimer = null
let secondTimer = null

/* =========================================================
   SECTION 7: Computed State
   Purpose:
   - Format display values for the UI
========================================================= */
const selectedDifficultyConfig = computed(() => {
  return (
    difficultyOptions.find((option) => option.id === selectedDifficulty.value) ||
    difficultyOptions[1]
  )
})

const currentDropSpeed = computed(() => {
  const levelSpeedBoost = (level.value - 1) * 45
  return Math.max(110, selectedDifficultyConfig.value.baseSpeed - levelSpeedBoost)
})

const canChangeDifficulty = computed(() => {
  return gameStatus.value === "idle" || gameStatus.value === "game-over"
})

const isPlaying = computed(() => {
  return gameStatus.value === "playing"
})

const isPaused = computed(() => {
  return gameStatus.value === "paused"
})

const statusLabel = computed(() => {
  if (gameStatus.value === "playing") return "Playing"
  if (gameStatus.value === "paused") return "Paused"
  if (gameStatus.value === "game-over") return "Game Over"
  return "Ready"
})

const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

const nextLevelLines = computed(() => {
  const currentProgress = lines.value % 10
  return 10 - currentProgress
})

const nextLevelProgressPercent = computed(() => {
  const currentProgress = lines.value % 10
  return Math.min(100, Math.max(0, currentProgress * 10))
})

const displayBoard = computed(() => {
  const display = board.value.map((row) => {
    return row.map((cell) => {
      if (!cell) return null
      return {
        ...cell,
        active: false
      }
    })
  })

  if (!activePiece.value) return display

  activePiece.value.shape.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return

      const boardY = activePiece.value.y + rowIndex
      const boardX = activePiece.value.x + colIndex

      if (boardY < 0) return
      if (boardY >= BOARD_ROWS || boardX < 0 || boardX >= BOARD_COLS) return

      display[boardY][boardX] = {
        type: activePiece.value.type,
        active: true
      }
    })
  })

  return display
})

const nextPiecePreview = computed(() => {
  return createPreviewGrid(nextPiece.value)
})

const canControlGame = computed(() => {
  return gameSession.isPlayer.value
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
  return gameSession.session.value?.playerSlots || []
})

const spectators = computed(() => {
  return gameSession.session.value?.spectators || []
})

const runnerSlot = computed(() => {
  return (
    playerSlots.value.find((slot) => slot.slotId === "P1") ||
    playerSlots.value[0] ||
    null
  )
})

const runner = computed(() => {
  return runnerSlot.value?.player || null
})

const runnerOccupied = computed(() => {
  return Boolean(runnerSlot.value?.occupied || gameSession.localFallbackActive.value)
})

const runnerName = computed(() => {
  return runner.value?.username || (gameSession.localFallbackActive.value ? currentUserName.value : "Nah")
})

const runnerInitial = computed(() => {
  return runner.value?.initial || currentUserInitial.value
})

const normalizedPlayerCount = computed(() => {
  if (gameSession.localFallbackActive.value) return 1
  return Number(gameSession.playerCount.value || 0)
})

const normalizedMaxPlayers = computed(() => {
  return Number(gameSession.maxPlayers.value || 1)
})

const sessionLabel = computed(() => {
  if (gameSession.localFallbackActive.value || gameSession.isPlayer.value) return "Runner"
  if (gameSession.isSpectator.value) return "Watcher"
  return "Connecting"
})

const roleSummaryLabel = computed(() => {
  if (runnerOccupied.value) return `Runner | ${runnerName.value}`
  return "Runner | Nah +"
})

const myRoleTitle = computed(() => {
  if (gameSession.localFallbackActive.value || gameSession.isPlayer.value) return "You are Runner"
  if (gameSession.isSpectator.value) return "You are Watching"
  return "Choose your role"
})

const myRoleAccent = computed(() => {
  if (gameSession.isSpectator.value) return "watch"
  return "runner"
})

const canTakeRunnerSlot = computed(() => {
  if (gameSession.localFallbackActive.value) return false
  if (!activeRoomCode.value) return false
  if (!runnerSlot.value) return true
  if (!runnerSlot.value.occupied) return true
  return runner.value?.socketId === props.socket?.id
})

const canBecomeWatcher = computed(() => {
  if (!activeRoomCode.value) return false
  if (gameSession.localFallbackActive.value) return false
  return !gameSession.isSpectator.value
})

const sessionHint = computed(() => {
  if (gameSession.localFallbackActive.value) return "Local fallback is active. This run is only on your screen."
  if (gameSession.isPlayer.value) return "You control the live solo run. Watchers can view the board in real time."
  if (gameSession.isSpectator.value && runnerOccupied.value) return "You are watching this run. Controls are locked until the Runner slot opens."
  if (gameSession.isSpectator.value && !runnerOccupied.value) return "Runner slot is open. You can take over this run."
  return "Connecting to live Falling Blocks session..."
})

const actionButtonLabel = computed(() => {
  if (runnerOccupied.value && !gameSession.isPlayer.value) return "Take Runner Slot"
  if (!runnerOccupied.value) return "Become Runner"
  return "Runner Active"
})

const watcherList = computed(() => {
  return spectators.value || []
})


/* =========================================================
   SECTION 8: Board / Piece Helpers
   Purpose:
   - Create board
   - Create random pieces
   - Rotate pieces
========================================================= */
function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => {
    return Array.from({ length: BOARD_COLS }, () => null)
  })
}

function cloneShape(shape) {
  return shape.map((row) => [...row])
}

function createRandomPiece() {
  const type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)]
  const shape = cloneShape(pieceShapes[type])

  return {
    type,
    shape,
    x: Math.floor((BOARD_COLS - shape[0].length) / 2),
    y: -1
  }
}

function rotateShape(shape) {
  const rows = shape.length
  const cols = shape[0].length
  const rotated = []

  for (let col = 0; col < cols; col += 1) {
    const newRow = []

    for (let row = rows - 1; row >= 0; row -= 1) {
      newRow.push(shape[row][col])
    }

    rotated.push(newRow)
  }

  return rotated
}

function createPreviewGrid(piece) {
  const size = 4
  const preview = Array.from({ length: size }, () => {
    return Array.from({ length: size }, () => null)
  })

  if (!piece?.shape) return preview

  const rowOffset = Math.floor((size - piece.shape.length) / 2)
  const colOffset = Math.floor((size - piece.shape[0].length) / 2)

  piece.shape.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return

      const previewY = rowOffset + rowIndex
      const previewX = colOffset + colIndex

      if (previewY < 0 || previewY >= size) return
      if (previewX < 0 || previewX >= size) return

      preview[previewY][previewX] = {
        type: piece.type,
        active: false
      }
    })
  })

  return preview
}

/* =========================================================
   SECTION 9: Collision / Locking Logic
   Purpose:
   - Detect whether a piece can move
   - Lock active piece into the board
   - Clear full rows
========================================================= */
function hasCollision(piece) {
  if (!piece) return true

  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let col = 0; col < piece.shape[row].length; col += 1) {
      if (!piece.shape[row][col]) continue

      const boardY = piece.y + row
      const boardX = piece.x + col

      if (boardX < 0 || boardX >= BOARD_COLS) return true
      if (boardY >= BOARD_ROWS) return true

      if (boardY >= 0 && board.value[boardY][boardX]) return true
    }
  }

  return false
}

function lockActivePiece() {
  if (!activePiece.value) return

  const newBoard = board.value.map((row) => {
    return row.map((cell) => (cell ? { ...cell } : null))
  })

  let lockedAboveBoard = false

  activePiece.value.shape.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return

      const boardY = activePiece.value.y + rowIndex
      const boardX = activePiece.value.x + colIndex

      if (boardY < 0) {
        lockedAboveBoard = true
        return
      }

      if (boardY >= BOARD_ROWS || boardX < 0 || boardX >= BOARD_COLS) return

      newBoard[boardY][boardX] = {
        type: activePiece.value.type
      }
    })
  })

  if (lockedAboveBoard) {
    endGame()
    return
  }

  board.value = clearFullRows(newBoard)

  spawnNextPiece()
}

function clearFullRows(currentBoard) {
  const remainingRows = currentBoard.filter((row) => {
    return row.some((cell) => !cell)
  })

  const clearedRows = BOARD_ROWS - remainingRows.length

  if (clearedRows <= 0) return currentBoard

  const emptyRows = Array.from({ length: clearedRows }, () => {
    return Array.from({ length: BOARD_COLS }, () => null)
  })

  const lineScoreMap = {
    1: 100,
    2: 300,
    3: 500,
    4: 800
  }

  score.value += (lineScoreMap[clearedRows] || clearedRows * 250) * level.value

  const newLineCount = lines.value + clearedRows
  lines.value = newLineCount
  level.value = Math.floor(newLineCount / 10) + 1

  return [...emptyRows, ...remainingRows]
}

function spawnNextPiece() {
  activePiece.value = nextPiece.value
  nextPiece.value = createRandomPiece()

  if (hasCollision(activePiece.value)) {
    endGame()
  }
}

/* =========================================================
   SECTION 10: Game Loop / Timer
   Purpose:
   - Control automatic falling
   - Control elapsed time
========================================================= */
function clearDropTimer() {
  if (dropTimer) {
    clearTimeout(dropTimer)
    dropTimer = null
  }
}

function clearSecondTimer() {
  if (secondTimer) {
    clearInterval(secondTimer)
    secondTimer = null
  }
}

function startSecondTimer() {
  clearSecondTimer()

  secondTimer = setInterval(() => {
    if (canControlGame.value && gameStatus.value === "playing") {
      elapsedSeconds.value += 1
    }
  }, 1000)
}

function scheduleNextDrop() {
  clearDropTimer()

  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return

  dropTimer = setTimeout(() => {
    if (!canControlGame.value) return
    if (gameStatus.value !== "playing") return

    movePieceDown(false)
    scheduleNextDrop()
  }, currentDropSpeed.value)
}

/* =========================================================
   SECTION 11: Game Actions
   Purpose:
   - Start, pause, restart, and end game
========================================================= */
function selectDifficulty(difficultyId) {
  if (!canControlGame.value) return
  if (!canChangeDifficulty.value) return

  selectedDifficulty.value = difficultyId
  syncFallingBlocksState()
}

function startGame() {
  if (!canControlGame.value) return
  if (gameStatus.value === "playing") return

  resetGameState()
  activePiece.value = nextPiece.value
  nextPiece.value = createRandomPiece()

  gameStatus.value = "playing"

  startSecondTimer()
  scheduleNextDrop()
  syncFallingBlocksState()
}

function pauseGame() {
  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return

  gameStatus.value = "paused"
  clearDropTimer()
  syncFallingBlocksState()
}

function resumeGame() {
  if (!canControlGame.value) return
  if (gameStatus.value !== "paused") return

  gameStatus.value = "playing"
  scheduleNextDrop()
  syncFallingBlocksState()
}

function togglePauseGame() {
  if (!canControlGame.value) return

  if (gameStatus.value === "playing") {
    pauseGame()
    return
  }

  if (gameStatus.value === "paused") {
    resumeGame()
  }
}

function restartGame() {
  if (!canControlGame.value) return

  resetGameState()
  startGame()
}

function resetGameState() {
  clearDropTimer()
  clearSecondTimer()

  board.value = createEmptyBoard()
  activePiece.value = null
  nextPiece.value = createRandomPiece()

  gameStatus.value = "idle"
  score.value = 0
  lines.value = 0
  level.value = 1
  elapsedSeconds.value = 0
}

function endGame() {
  gameStatus.value = "game-over"
  clearDropTimer()
  clearSecondTimer()
  syncFallingBlocksState()
}

/* =========================================================
   SECTION 12: Player Controls
   Purpose:
   - Move active piece
   - Rotate piece
   - Soft drop / hard drop
========================================================= */
function movePieceHorizontal(direction) {
  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return
  if (!activePiece.value) return

  const movedPiece = {
    ...activePiece.value,
    x: activePiece.value.x + direction
  }

  if (hasCollision(movedPiece)) return

  activePiece.value = movedPiece
  syncFallingBlocksState()
}

function movePieceDown(addScore = true) {
  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return
  if (!activePiece.value) return

  const movedPiece = {
    ...activePiece.value,
    y: activePiece.value.y + 1
  }

  if (!hasCollision(movedPiece)) {
    activePiece.value = movedPiece

    if (addScore) {
      score.value += 1
    }

    return
  }

  lockActivePiece()
}

function hardDropPiece() {
  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return
  if (!activePiece.value) return

  clearDropTimer()

  let dropDistance = 0
  let movedPiece = {
    ...activePiece.value,
    y: activePiece.value.y + 1
  }

  while (!hasCollision(movedPiece)) {
    activePiece.value = movedPiece
    dropDistance += 1

    movedPiece = {
      ...activePiece.value,
      y: activePiece.value.y + 1
    }
  }

  score.value += dropDistance * 2
  lockActivePiece()
  scheduleNextDrop()
}

function rotateActivePiece() {
  if (!canControlGame.value) return
  if (gameStatus.value !== "playing") return
  if (!activePiece.value) return

  const rotatedShape = rotateShape(activePiece.value.shape)

  const rotatedPiece = {
    ...activePiece.value,
    shape: rotatedShape
  }

  const wallKickOffsets = [0, -1, 1, -2, 2]

  for (const offset of wallKickOffsets) {
    const testPiece = {
      ...rotatedPiece,
      x: rotatedPiece.x + offset
    }

    if (!hasCollision(testPiece)) {
      activePiece.value = testPiece
      return
    }
  }
}

/* =========================================================
   SECTION 13: Keyboard Controls
   Purpose:
   - Allow keyboard gameplay
   - Ignore shortcuts while typing in chat/input fields
========================================================= */
function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase()

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target?.isContentEditable
  )
}

function handleKeyDown(event) {
  if (isTypingTarget(event.target)) return
  if (!canControlGame.value) return

  const key = event.key

  if (key === "ArrowLeft") {
    event.preventDefault()
    movePieceHorizontal(-1)
  }

  if (key === "ArrowRight") {
    event.preventDefault()
    movePieceHorizontal(1)
  }

  if (key === "ArrowDown") {
    event.preventDefault()
    movePieceDown(true)
  }

  if (key === "ArrowUp") {
    event.preventDefault()
    rotateActivePiece()
  }

  if (key === " " || key === "Spacebar") {
    event.preventDefault()

    if (!event.repeat) {
      hardDropPiece()
    }
  }

  if (key?.toLowerCase() === "p") {
    event.preventDefault()

    if (!event.repeat) {
      togglePauseGame()
    }
  }

  if (key?.toLowerCase() === "r") {
    event.preventDefault()

    if (!event.repeat) {
      restartGame()
    }
  }
}


/* =========================================================
   SECTION 13.5: Backend State Sync
   Purpose:
   - Player sends live Falling Blocks state to backend
   - Spectators receive and render read-only state
========================================================= */
function getFallingBlocksState() {
  return {
    board: board.value,
    activePiece: activePiece.value,
    nextPiece: nextPiece.value,
    score: score.value,
    lines: lines.value,
    level: level.value,
    elapsedSeconds: elapsedSeconds.value,
    status: gameStatus.value,
    difficulty: selectedDifficulty.value
  }
}

function applyFallingBlocksState(nextState) {
  if (!nextState) return
  if (gameSession.isPlayer.value) return

  board.value = nextState.board || createEmptyBoard()
  activePiece.value = nextState.activePiece || null
  nextPiece.value = nextState.nextPiece || createRandomPiece()
  score.value = Number(nextState.score || 0)
  lines.value = Number(nextState.lines || 0)
  level.value = Number(nextState.level || 1)
  elapsedSeconds.value = Number(nextState.elapsedSeconds || 0)
  gameStatus.value = nextState.status || "idle"
  selectedDifficulty.value = nextState.difficulty || "standard"
}

function syncFallingBlocksState() {
  if (!gameSession.isPlayer.value) return

  gameSession.syncGameState(getFallingBlocksState())
}

/* =========================================================
   SECTION 14: Display Helpers
========================================================= */
function getCellClass(cell) {
  if (!cell) return "empty"

  return [
    "filled",
    `type-${cell.type.toLowerCase()}`,
    cell.active ? "active" : ""
  ]
}

function becomeWatcher() {
  if (!canBecomeWatcher.value) return

  clearDropTimer()
  clearSecondTimer()
  gameSession.joinAsSpectator()
}

function takeRunnerSlot() {
  if (!canTakeRunnerSlot.value) return

  gameSession.joinAsPlayer("P1")
}

function handleBackToLibrary() {
  clearDropTimer()
  clearSecondTimer()
  emit("back-to-library")
}

/* =========================================================
   SECTION 15: Lifecycle
========================================================= */
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown)
})

onBeforeUnmount(() => {
  clearDropTimer()
  clearSecondTimer()
  window.removeEventListener("keydown", handleKeyDown)
})

watch(
  () => gameSession.lastGameState.value,
  (nextState) => {
    applyFallingBlocksState(nextState)
  }
)

watch(
  () => gameSession.isPlayer.value,
  (isRunner) => {
    if (!isRunner) {
      clearDropTimer()
      clearSecondTimer()
      return
    }

    if (gameStatus.value === "playing") {
      startSecondTimer()
      scheduleNextDrop()
    }
  }
)

watch(
  () => [
    board.value,
    activePiece.value,
    nextPiece.value,
    score.value,
    lines.value,
    level.value,
    elapsedSeconds.value,
    gameStatus.value,
    selectedDifficulty.value
  ],
  () => {
    syncFallingBlocksState()
  },
  { deep: true }
)

</script>
<template>
  <section class="falling-blocks-screen">
    <!-- =====================================================
        SECTION 1: Top Action Bar
        Purpose:
        - Return to Game Library
        - Show current game session status
    ====================================================== -->
    <div class="falling-topbar">
      <div class="topbar-left">
        <button
          type="button"
          class="back-btn"
          @click="handleBackToLibrary"
        >
          ← Back to Library
        </button>

        <div class="game-heading-mini">
          <span>Game 2</span>
          <strong>▦ Falling Blocks</strong>
        </div>
      </div>

      <div class="role-control-strip">
        <button
          type="button"
          class="watch-btn"
          :class="{ active: gameSession.isSpectator.value }"
          :disabled="!canBecomeWatcher"
          @click="becomeWatcher"
        >
          👁 Watch
        </button>

        <button
          type="button"
          class="runner-select-btn"
          :class="myRoleAccent"
          :disabled="!canTakeRunnerSlot"
          @click="takeRunnerSlot"
        >
          <span class="runner-dot">{{ runnerInitial }}</span>
          <strong>{{ roleSummaryLabel }}</strong>
          <small v-if="!runnerOccupied">+</small>
        </button>

        <div class="topbar-status">
          <span>{{ activeRoomCode || "VOXYN" }}</span>
          <strong>
            {{ sessionLabel }} ·
            {{ normalizedPlayerCount }}/{{ normalizedMaxPlayers }}
            · 👁 {{ gameSession.spectatorCount.value }}
          </strong>
        </div>
      </div>
    </div>

    <!-- =====================================================
        SECTION 2: Main Game Layout
        Purpose:
        - Left setup panel
        - Center board
        - Right status panel
    ====================================================== -->
    <div class="falling-layout">
      <!-- ===================================================
          SECTION 2.1: Left Control Panel
          Purpose:
          - Game title
          - Live session role
          - Difficulty
          - Controls
      ==================================================== -->
      <aside class="falling-panel left-panel">
        <div class="game-title-card">
          <div class="game-icon">▦</div>

          <div>
            <p>Game 2</p>
            <h2>Falling Blocks</h2>
            <span>{{ props.mode || "Single Player" }}</span>
            <small>Stack smart. Clear lines. Beat your high score.</small>
          </div>
        </div>

        <div class="panel-card live-session-card">
          <div class="panel-heading">
            <h3>Live Session</h3>
            <span>{{ myRoleTitle }}</span>
          </div>

          <div class="runner-card">
            <div class="participant-avatar runner-avatar">
              {{ runnerInitial }}
            </div>

            <div>
              <strong>{{ runnerName }}</strong>
              <span>{{ runnerOccupied ? "Runner · Host Slot" : "Runner Slot Open" }}</span>
            </div>
          </div>

          <div class="role-mini-grid">
            <button
              type="button"
              class="role-mini-btn"
              :class="{ active: gameSession.isPlayer.value || gameSession.localFallbackActive.value }"
              :disabled="!canTakeRunnerSlot"
              @click="takeRunnerSlot"
            >
              <strong>Runner</strong>
              <span>{{ runnerOccupied ? runnerName : "Nah +" }}</span>
            </button>

            <button
              type="button"
              class="role-mini-btn"
              :class="{ active: gameSession.isSpectator.value }"
              :disabled="!canBecomeWatcher"
              @click="becomeWatcher"
            >
              <strong>Watch</strong>
              <span>{{ gameSession.spectatorCount.value }} watching</span>
            </button>
          </div>

          <button
            v-if="gameSession.isSpectator.value && gameSession.hasOpenPlayerSlot.value"
            type="button"
            class="start-btn"
            @click="takeRunnerSlot"
          >
            {{ actionButtonLabel }}
          </button>

          <p class="difficulty-note">
            {{ sessionHint }}
          </p>

          <p
            v-if="gameSession.sessionError.value"
            class="session-error"
          >
            {{ gameSession.sessionError.value }}
          </p>
        </div>

        <div class="panel-card">
          <div class="panel-heading">
            <h3>Difficulty</h3>
            <span>{{ currentDropSpeed }}ms</span>
          </div>

          <div class="difficulty-grid">
            <button
              v-for="option in difficultyOptions"
              :key="option.id"
              type="button"
              class="difficulty-btn"
              :class="{ active: selectedDifficulty === option.id }"
              :disabled="!canControlGame || !canChangeDifficulty"
              @click="selectDifficulty(option.id)"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.speedLabel }}</small>
            </button>
          </div>

          <p class="difficulty-note">
            {{ selectedDifficultyConfig.description }}
          </p>
        </div>

        <div class="panel-card controls-card">
          <h3>Controls</h3>

          <div class="control-row">
            <kbd>←</kbd>
            <kbd>→</kbd>
            <span>Move Left / Right</span>
          </div>

          <div class="control-row">
            <kbd>↓</kbd>
            <span>Soft Drop</span>
          </div>

          <div class="control-row">
            <kbd>↑</kbd>
            <span>Rotate</span>
          </div>

          <div class="control-row">
            <kbd>Space</kbd>
            <span>Hard Drop</span>
          </div>

          <div class="control-row">
            <kbd>P</kbd>
            <span>Pause / Resume</span>
          </div>

          <div class="control-row">
            <kbd>R</kbd>
            <span>Restart</span>
          </div>
        </div>

        <div class="primary-actions">
          <button
            v-if="gameStatus === 'idle' || gameStatus === 'game-over'"
            type="button"
            class="start-btn"
            :disabled="!canControlGame"
            @click="startGame"
          >
            ▶ Start Game
          </button>

          <button
            v-else-if="gameStatus === 'paused'"
            type="button"
            class="start-btn"
            :disabled="!canControlGame"
            @click="resumeGame"
          >
            ▶ Resume
          </button>

          <button
            v-else
            type="button"
            class="pause-btn"
            :disabled="!canControlGame"
            @click="pauseGame"
          >
            ❚❚ Pause
          </button>
        </div>
      </aside>

      <!-- ===================================================
          SECTION 2.2: Center Board
          Purpose:
          - Main 10 x 15 game board
      ==================================================== -->
      <main class="board-zone">
        <div class="board-header">
          <div>
            <p>Drop Zone</p>
            <h3>10 × 15 Grid</h3>
          </div>

          <span :class="['status-pill', gameStatus]">
            ● {{ statusLabel }}
          </span>
        </div>

        <div class="game-board-frame">
          <div class="game-board">
            <template
              v-for="(row, rowIndex) in displayBoard"
              :key="`row-${rowIndex}`"
            >
              <div
                v-for="(cell, colIndex) in row"
                :key="`cell-${rowIndex}-${colIndex}`"
                class="board-cell"
                :class="getCellClass(cell)"
              />
            </template>
          </div>

          <div
            v-if="gameStatus === 'idle'"
            class="board-overlay"
          >
            <strong>Ready?</strong>
            <span v-if="canControlGame">Choose difficulty and start your run.</span>
            <span v-else-if="runnerOccupied">Waiting for the Runner to start.</span>
            <span v-else>Runner slot is open.</span>
          </div>

          <div
            v-if="gameStatus === 'paused'"
            class="board-overlay"
          >
            <strong>Paused</strong>
            <span v-if="canControlGame">Press P or Resume.</span>
            <span v-else>The Runner paused this run.</span>
          </div>

          <div
            v-if="gameStatus === 'game-over'"
            class="board-overlay game-over"
          >
            <strong>Game Over</strong>
            <span>Time survived: {{ formattedTime }}</span>
          </div>

          <div
            v-if="gameSession.isSpectator.value && gameStatus === 'playing'"
            class="spectator-badge"
          >
            👁 Watching {{ runnerName }}
          </div>
        </div>
      </main>

      <!-- ===================================================
          SECTION 2.3: Right Status Panel
          Purpose:
          - Compact right side
          - Next piece / room info / game status / actions
      ==================================================== -->
      <aside class="falling-panel right-panel compact-right-panel">
        <div class="panel-card next-card">
          <div class="panel-heading">
            <h3>Next Piece</h3>
            <span>{{ nextPiece?.type || "?" }}</span>
          </div>

          <div class="preview-grid">
            <template
              v-for="(row, rowIndex) in nextPiecePreview"
              :key="`preview-row-${rowIndex}`"
            >
              <div
                v-for="(cell, colIndex) in row"
                :key="`preview-cell-${rowIndex}-${colIndex}`"
                class="preview-cell"
                :class="getCellClass(cell)"
              />
            </template>
          </div>
        </div>

        <div class="panel-card room-info-card">
          <div class="panel-heading">
            <h3>Room Info</h3>
            <span>{{ activeRoomCode || "Local" }}</span>
          </div>

          <div class="room-role-row">
            <span>Runner</span>
            <strong>{{ runnerOccupied ? runnerName : "Nah +" }}</strong>
          </div>

          <div class="room-role-row">
            <span>Watchers</span>
            <strong>{{ gameSession.spectatorCount.value }}</strong>
          </div>

          <div class="watcher-list compact-watcher-list">
            <div
              v-if="watcherList.length === 0"
              class="empty-watchers"
            >
              No watchers yet.
            </div>

            <div
              v-for="watcher in watcherList"
              :key="watcher.socketId"
              class="watcher-chip"
            >
              <span>{{ watcher.initial || "W" }}</span>
              <strong>{{ watcher.username || "Watcher" }}</strong>
            </div>
          </div>
        </div>

        <div class="panel-card stats-card compact-stats-card">
          <div class="panel-heading">
            <h3>Game Status</h3>

            <button
              type="button"
              class="mini-pause-btn"
              :disabled="!canControlGame || gameStatus === 'idle' || gameStatus === 'game-over'"
              @click="togglePauseGame"
            >
              {{ isPaused ? "▶" : "❚❚" }}
            </button>
          </div>

          <div class="stat-row">
            <span>🏆 Score</span>
            <strong>{{ score }}</strong>
          </div>

          <div class="stat-row">
            <span>▦ Lines</span>
            <strong>{{ lines }}</strong>
          </div>

          <div class="stat-row">
            <span>↗ Level</span>
            <strong>{{ level }}</strong>
          </div>

          <div class="stat-row">
            <span>⏱ Time</span>
            <strong>{{ formattedTime }}</strong>
            <small>Time Survived</small>
          </div>

          <div class="stat-row">
            <span>Next Level</span>
            <strong>{{ nextLevelLines }} lines</strong>
          </div>
        </div>

        <div class="side-actions compact-side-actions">
          <button
            type="button"
            class="restart-btn"
            :disabled="!canControlGame"
            @click="restartGame"
          >
            ↻ Restart Game
          </button>

          <button
            type="button"
            class="secondary-back-btn"
            @click="handleBackToLibrary"
          >
            ← Back to Library
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Falling Blocks Shell
   Purpose:
   - v0.83 ratio polish
   - Keep the approved Runner / Watcher logic
   - Make the stage feel lighter, wider, and less vertically cramped
========================================================= */
.falling-blocks-screen {
  width: 100%;
  min-height: 100%;
  padding: 10px 16px 18px;
  color: #0f172a;
  box-sizing: border-box;
}

.falling-topbar {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(circle at 72% 0%, rgba(168, 85, 247, 0.12), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.72));
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
}

.topbar-left,
.role-control-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.game-heading-mini {
  display: grid;
  gap: 4px;
}

.game-heading-mini span {
  color: #2563eb;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.game-heading-mini strong {
  color: #0f172a;
  font-size: 19px;
  font-weight: 950;
  letter-spacing: -0.055em;
  line-height: 1;
}

.back-btn,
.secondary-back-btn,
.watch-btn,
.runner-select-btn {
  min-height: 38px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  background: rgba(255, 255, 255, 0.78);
  font-weight: 950;
  cursor: pointer;
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.back-btn:hover,
.secondary-back-btn:hover,
.watch-btn:hover,
.runner-select-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow:
    0 16px 34px rgba(37, 99, 235, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.back-btn,
.secondary-back-btn {
  padding: 0 14px;
}

.watch-btn {
  padding: 0 16px;
  color: #1e293b;
}

.watch-btn.active {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.42);
  background: rgba(219, 234, 254, 0.86);
}

.runner-select-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 172px;
  padding: 0 14px 0 9px;
}

.runner-select-btn.runner {
  color: white;
  border-color: rgba(37, 99, 235, 0.36);
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow:
    0 18px 45px rgba(79, 70, 229, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.runner-select-btn.watch {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.32);
  background: rgba(239, 246, 255, 0.88);
}

.runner-dot {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  flex: 0 0 26px;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #22c55e, #2563eb);
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.24);
}

.runner-select-btn strong {
  max-width: 148px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.runner-select-btn small {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #042f2e;
  background: #86efac;
  font-size: 15px;
  font-weight: 950;
}

.watch-btn:disabled,
.runner-select-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
  transform: none;
}

.topbar-status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.72);
  white-space: nowrap;
}

.topbar-status span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.topbar-status strong {
  color: #16a34a;
  font-size: 12px;
  font-weight: 950;
}

/* =========================================================
   SECTION 2: Main Layout
   Purpose:
   - New proportion: compact left, large center board, stacked right tools
========================================================= */
.falling-layout {
  display: grid;
  grid-template-columns: minmax(230px, 260px) minmax(280px, 340px) minmax(320px, 1fr);
  gap: 10px;
  align-items: start;
}

.falling-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.left-panel {
  align-content: start;
}

.right-panel {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-content: start;
}

.right-panel .stats-card,
.right-panel .side-actions,
.right-panel .run-command-card {
  grid-column: 1 / -1;
}

.game-title-card,
.panel-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  background:
    radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.08), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.72));
  box-shadow:
    0 20px 55px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
}

.game-title-card {
  display: none;
}

.panel-card {
  padding: 12px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}

.panel-heading h3 {
  margin: 0;
  color: #1e293b;
  font-size: 15px;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.panel-heading span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

/* =========================================================
   SECTION 3: Runner / Watcher Card
========================================================= */
.live-session-card {
  padding: 12px;
}

.runner-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  background: rgba(239, 246, 255, 0.76);
}

.participant-avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: white;
  font-size: 15px;
  font-weight: 950;
  background: linear-gradient(135deg, #22c55e, #2563eb);
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.22);
}

.runner-card strong {
  display: block;
  max-width: 170px;
  overflow: hidden;
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.runner-card span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.role-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.role-mini-btn {
  min-height: 42px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #475569;
  background: rgba(248, 250, 252, 0.82);
  text-align: left;
  cursor: pointer;
}

.role-mini-btn strong,
.role-mini-btn span {
  display: block;
}

.role-mini-btn strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 950;
}

.role-mini-btn span {
  max-width: 100%;
  margin-top: 6px;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.role-mini-btn.active {
  border-color: rgba(37, 99, 235, 0.54);
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 14px 34px rgba(37, 99, 235, 0.22);
}

.role-mini-btn.active strong,
.role-mini-btn.active span {
  color: white;
}

.role-mini-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.session-error {
  margin: 10px 0 0;
  color: #dc2626;
  font-size: 12px;
  font-weight: 850;
}

/* =========================================================
   SECTION 4: Difficulty / Controls
========================================================= */
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.difficulty-btn {
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  color: #334155;
  background: rgba(248, 250, 252, 0.86);
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;
}

.difficulty-btn strong,
.difficulty-btn small {
  display: block;
}

.difficulty-btn strong {
  font-size: 13px;
  font-weight: 950;
}

.difficulty-btn small {
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.difficulty-btn.active {
  color: white;
  border-color: rgba(37, 99, 235, 0.62);
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.24);
}

.difficulty-btn.active small {
  color: rgba(255, 255, 255, 0.82);
}

.difficulty-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.difficulty-note {
  margin: 12px 0 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.4;
}

.controls-card h3 {
  margin: 0 0 10px;
  color: #1e293b;
  font-size: 15px;
  font-weight: 950;
}

.control-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #475569;
  font-size: 12px;
  font-weight: 850;
}

.control-row:nth-child(n + 4) {
  grid-template-columns: auto 1fr;
}

.control-row:last-child {
  border-bottom: none;
}

kbd {
  min-width: 24px;
  height: 21px;
  padding: 0 7px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  color: white;
  background: #1e293b;
  font-size: 11px;
  font-weight: 950;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.primary-actions {
  display: grid;
}

.start-btn,
.pause-btn,
.restart-btn {
  min-height: 42px;
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
}

.start-btn {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 16px 42px rgba(37, 99, 235, 0.28);
}

.pause-btn {
  background: linear-gradient(135deg, #0f766e, #2563eb);
}

.restart-btn {
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.18);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: none;
}

.start-btn:disabled,
.pause-btn:disabled,
.restart-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  box-shadow: none;
}

/* =========================================================
   SECTION 5: Board
========================================================= */
.board-zone {
  min-width: 0;
}

.board-header {
  display: none;
}

.game-board-frame {
  position: relative;
  width: min(100%, 320px);
  margin: 0 auto;
  padding: 12px;
  border-radius: 24px;
  border: 1px solid rgba(37, 99, 235, 0.28);
  background:
    radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.2), transparent 38%),
    #0b1222;
  box-shadow:
    0 26px 80px rgba(37, 99, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.game-board {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  grid-template-rows: repeat(15, minmax(0, 1fr));
  aspect-ratio: 10 / 15;
  overflow: hidden;
  border-radius: 14px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    #0f172a;
  background-size: 10% 6.666%, 10% 6.666%, auto;
}

.board-cell,
.preview-cell {
  border: 1px solid rgba(96, 165, 250, 0.07);
  background: rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
}

.board-cell.filled,
.preview-cell.filled {
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    inset 0 -8px 14px rgba(15, 23, 42, 0.24),
    0 0 16px rgba(96, 165, 250, 0.16);
}

.board-cell.active {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 0 20px rgba(168, 85, 247, 0.48);
}

.type-i { background: linear-gradient(135deg, #22d3ee, #2563eb); }
.type-o { background: linear-gradient(135deg, #facc15, #f59e0b); }
.type-t { background: linear-gradient(135deg, #c084fc, #7c3aed); }
.type-s { background: linear-gradient(135deg, #86efac, #16a34a); }
.type-z { background: linear-gradient(135deg, #fb7185, #dc2626); }
.type-j { background: linear-gradient(135deg, #60a5fa, #1d4ed8); }
.type-l { background: linear-gradient(135deg, #fdba74, #ea580c); }

.board-overlay {
  position: absolute;
  inset: 12px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.58);
  backdrop-filter: blur(10px);
  text-align: center;
}

.board-overlay strong {
  color: white;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.board-overlay span {
  color: #bfdbfe;
  font-size: 14px;
  font-weight: 850;
}

.board-overlay.game-over strong {
  color: #fca5a5;
}

.spectator-badge {
  position: absolute;
  right: 24px;
  top: 24px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.42);
  color: #bfdbfe;
  background: rgba(15, 23, 42, 0.72);
  font-size: 12px;
  font-weight: 950;
  backdrop-filter: blur(10px);
}

/* =========================================================
   SECTION 6: Right Stats / Preview
========================================================= */
.next-card,
.room-info-card {
  min-height: 128px;
}

.preview-grid {
  width: 88px;
  height: 88px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: #0f172a;
}

.preview-cell {
  border-radius: 6px;
}

.room-role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 28px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.room-role-row span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.room-role-row strong {
  max-width: 145px;
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.watcher-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.empty-watchers {
  min-height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #64748b;
  background: rgba(241, 245, 249, 0.78);
  font-size: 12px;
  font-weight: 850;
  text-align: center;
}

.watcher-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 9px;
  border-radius: 13px;
  background: rgba(239, 246, 255, 0.82);
}

.watcher-chip span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  font-size: 11px;
  font-weight: 950;
}

.watcher-chip strong {
  overflow: hidden;
  color: #1e293b;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}

.stats-card .panel-heading {
  grid-column: 1 / -1;
  margin-bottom: 0;
}

.stat-row {
  min-height: 58px;
  padding: 8px 6px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.72);
  text-align: center;
}

.stat-row:last-child {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.stat-row span,
.stat-row small {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.stat-row strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.stat-row small {
  margin-top: 2px;
  color: #2563eb;
}

.mini-pause-btn {
  width: 38px;
  height: 34px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 12px;
  color: #2563eb;
  background: rgba(239, 246, 255, 0.92);
  cursor: pointer;
}

.mini-pause-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.side-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.side-actions .secondary-back-btn {
  width: 100%;
  color: #334155;
}

/* =========================================================
   SECTION 6.5: Run Control Summary
   Purpose:
   - Fill lower-right empty space with useful live session data
   - Keep the section compact and consistent with the glass UI
========================================================= */
.run-command-card {
  min-height: 158px;
  display: grid;
  gap: 12px;
  align-content: start;
}

.run-command-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.run-command-item {
  min-height: 58px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at 90% 0%, rgba(37, 99, 235, 0.08), transparent 36%),
    rgba(248, 250, 252, 0.74);
}

.run-command-item span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.run-command-item strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.level-progress-card {
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: rgba(239, 246, 255, 0.62);
}

.level-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.level-progress-header span {
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.level-progress-header strong {
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.level-progress-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
}

.level-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  box-shadow: 0 0 18px rgba(79, 70, 229, 0.32);
  transition: width 0.22s ease;
}

.run-command-note {
  margin: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
}

/* =========================================================
   SECTION 7: Responsive Layout
========================================================= */
@media (max-width: 1180px) {
  .falling-layout {
    grid-template-columns: minmax(230px, 280px) minmax(300px, 1fr);
  }

  .right-panel {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .right-panel .stats-card,
  .right-panel .side-actions,
  .right-panel .run-command-card {
    grid-column: auto;
  }

  .stats-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-card .panel-heading {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .falling-blocks-screen {
    padding: 14px 14px 84px;
  }

  .falling-topbar,
  .topbar-left,
  .role-control-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .role-control-strip {
    width: 100%;
  }

  .watch-btn,
  .runner-select-btn,
  .topbar-status {
    width: 100%;
    justify-content: center;
  }

  .falling-layout {
    grid-template-columns: 1fr;
  }

  .right-panel {
    grid-template-columns: 1fr;
  }

  .right-panel .stats-card,
  .right-panel .side-actions,
  .right-panel .run-command-card {
    grid-column: auto;
  }

  .stats-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .game-board-frame {
    width: min(100%, 340px);
  }

  .side-actions {
    grid-template-columns: 1fr;
  }
}

/* =========================================================
   SECTION 8: v0.83 Fit Pass
   Purpose:
   - Keep the whole Falling Blocks game visible inside Stage 2
   - Restore better proportions after the first ratio polish
========================================================= */
@media (min-width: 1181px) {
  .falling-blocks-screen {
    padding-top: 8px;
    padding-bottom: 18px;
  }

  .falling-topbar {
    min-height: 56px;
    margin-bottom: 10px;
  }

  .falling-layout {
    grid-template-columns: 250px 370px minmax(430px, 1fr);
    gap: 14px;
  }

  .game-board-frame {
    width: min(100%, 356px);
  }

  .right-panel {
    grid-template-columns: 190px minmax(260px, 1fr);
    gap: 12px;
  }

  .stats-card {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .controls-card {
    padding-top: 11px;
    padding-bottom: 11px;
  }

  .control-row {
    min-height: 25px;
  }

  .difficulty-grid,
  .role-mini-grid {
    gap: 8px;
  }

  .side-actions {
    grid-template-columns: 1fr 1fr;
  }

  .run-command-card {
    min-height: 176px;
  }
}

/* =========================================================
   SECTION 9: Compact Falling Blocks Patch
   Purpose:
   - Remove visual overload
   - Keep right side useful but not crowded
   - Improve board / side panel ratio
========================================================= */
@media (min-width: 1181px) {
  .falling-blocks-screen {
    padding: 8px 16px 18px;
  }

  .falling-topbar {
    min-height: 50px;
    margin-bottom: 10px;
    padding: 8px 12px;
  }

  .falling-layout {
    grid-template-columns: 250px 390px minmax(420px, 1fr);
    gap: 14px;
    align-items: start;
  }

  .game-board-frame {
    width: min(100%, 382px);
    padding: 12px;
  }

  .compact-right-panel {
    display: grid;
    grid-template-columns: 190px minmax(260px, 1fr);
    gap: 12px;
    align-content: start;
  }

  .compact-right-panel .stats-card,
  .compact-right-panel .side-actions {
    grid-column: 1 / -1;
  }

  .next-card,
  .room-info-card {
    min-height: 126px;
  }

  .preview-grid {
    width: 82px;
    height: 82px;
  }

  .compact-stats-card {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .compact-stats-card .panel-heading {
    grid-column: 1 / -1;
  }

  .stat-row {
    min-height: 54px;
    padding: 7px 6px;
  }

  .stat-row strong {
    font-size: 19px;
  }

  .compact-side-actions {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .run-command-card {
    display: none !important;
  }
}

</style>