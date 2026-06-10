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
const gameSession = useGameSession({
  socket: () => props.socket,
  roomCode: () => props.roomCode,
  gameId: "falling-blocks",
  defaultRole: "player"
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

const sessionLabel = computed(() => {
  if (gameSession.isPlayer.value) return "Player"
  if (gameSession.isSpectator.value) return "Spectator"
  return "Connecting"
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
    if (gameStatus.value === "playing") {
      elapsedSeconds.value += 1
    }
  }, 1000)
}

function scheduleNextDrop() {
  clearDropTimer()

  if (gameStatus.value !== "playing") return

  dropTimer = setTimeout(() => {
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
      <button
        type="button"
        class="back-btn"
        @click="handleBackToLibrary"
      >
        ← Back to Library
      </button>

      <div class="topbar-status">
        <span>{{ props.roomCode || "VOXYN" }}</span>
        <strong>
          {{ sessionLabel }} ·
          {{ gameSession.playerCount.value }}/{{ gameSession.maxPlayers.value }}
          · 👁 {{ gameSession.spectatorCount.value }}
        </strong>
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
            <span>{{ sessionLabel }}</span>
          </div>

          <div class="stat-row compact">
            <span>Players</span>
            <strong>
              {{ gameSession.playerCount.value }}/{{ gameSession.maxPlayers.value }}
            </strong>
          </div>

          <div class="stat-row compact">
            <span>Spectators</span>
            <strong>{{ gameSession.spectatorCount.value }}</strong>
          </div>

          <button
            v-if="gameSession.isSpectator.value && gameSession.hasOpenPlayerSlot.value"
            type="button"
            class="start-btn"
            @click="gameSession.joinAsPlayer()"
          >
            Take Player Slot
          </button>

          <p
            v-if="gameSession.isSpectator.value"
            class="difficulty-note"
          >
            You are watching this solo run. Controls are locked.
          </p>

          <p
            v-else-if="gameSession.isPlayer.value"
            class="difficulty-note"
          >
            You are controlling this run. Spectators can watch live.
          </p>

          <p
            v-else
            class="difficulty-note"
          >
            Connecting to live game session...
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
            <span v-if="canControlGame">Choose difficulty and start.</span>
            <span v-else>Waiting for the player to start.</span>
          </div>

          <div
            v-if="gameStatus === 'paused'"
            class="board-overlay"
          >
            <strong>Paused</strong>
            <span v-if="canControlGame">Press P or Resume.</span>
            <span v-else>The player paused this run.</span>
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
            👁 Watching Live
          </div>
        </div>
      </main>

      <!-- ===================================================
          SECTION 2.3: Right Status Panel
          Purpose:
          - Next piece
          - Score / lines / level / timer
          - Restart / back actions
      ==================================================== -->
      <aside class="falling-panel right-panel">
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

        <div class="panel-card stats-card">
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

        <div class="side-actions">
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
   - Fit inside VOXYN Stage 2 Game Area
========================================================= */
.falling-blocks-screen {
  width: 100%;
  min-height: 100%;
  padding: 22px;
  color: #e5edff;
  box-sizing: border-box;
}

.falling-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.back-btn,
.secondary-back-btn {
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.62);
  border-radius: 12px;
  min-height: 42px;
  padding: 0 18px;
  font-weight: 900;
  cursor: pointer;
}

.back-btn:hover,
.secondary-back-btn:hover {
  border-color: rgba(96, 165, 250, 0.52);
  background: rgba(30, 64, 175, 0.34);
}

.topbar-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  background: rgba(2, 6, 23, 0.48);
}

.topbar-status span {
  color: #60a5fa;
  font-size: 13px;
  font-weight: 950;
}

.topbar-status strong {
  color: #86efac;
  font-size: 13px;
}

/* =========================================================
   SECTION 2: Main Layout
========================================================= */
.falling-layout {
  display: grid;
  grid-template-columns: minmax(230px, 300px) minmax(300px, 430px) minmax(230px, 290px);
  gap: 18px;
  align-items: start;
}

.falling-panel {
  display: grid;
  gap: 14px;
}

.game-title-card,
.panel-card {
  border: 1px solid rgba(148, 163, 184, 0.17);
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.42));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 50px rgba(2, 6, 23, 0.28);
}

.game-title-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
}

.game-icon {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 34px;
  background:
    radial-gradient(circle at 30% 20%, rgba(244, 114, 182, 0.74), transparent 34%),
    linear-gradient(135deg, #7c3aed, #2563eb);
  box-shadow: 0 18px 48px rgba(124, 58, 237, 0.32);
}

.game-title-card p,
.board-header p {
  margin: 0 0 6px;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 950;
}

.game-title-card h2,
.board-header h3 {
  margin: 0;
  color: white;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.game-title-card span {
  display: inline-flex;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #bfdbfe;
  background: rgba(37, 99, 235, 0.28);
  font-size: 12px;
  font-weight: 950;
}

.game-title-card small {
  display: block;
  margin-top: 10px;
  color: #aab8d6;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}

.panel-card {
  padding: 16px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-heading h3 {
  margin: 0;
  color: #dbeafe;
  font-size: 15px;
  font-weight: 950;
}

.panel-heading span {
  color: #60a5fa;
  font-size: 12px;
  font-weight: 950;
}

/* =========================================================
   SECTION 3: Difficulty / Controls
========================================================= */
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.difficulty-btn {
  min-height: 62px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.55);
  cursor: pointer;
  text-align: left;
  padding: 10px;
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
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.difficulty-btn.active {
  color: white;
  border-color: rgba(96, 165, 250, 0.8);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(79, 70, 229, 0.76));
  box-shadow: 0 14px 34px rgba(37, 99, 235, 0.28);
}

.difficulty-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.difficulty-note {
  margin: 12px 0 0;
  color: #93c5fd;
  font-size: 12px;
  font-weight: 800;
}

.controls-card h3 {
  margin: 0 0 12px;
  color: #dbeafe;
  font-size: 15px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 800;
}

.control-row:last-child {
  border-bottom: none;
}

kbd {
  min-width: 30px;
  height: 26px;
  padding: 0 8px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  color: white;
  background: rgba(51, 65, 85, 0.88);
  font-size: 12px;
  font-weight: 950;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.primary-actions {
  display: grid;
}

.start-btn,
.pause-btn,
.restart-btn {
  min-height: 54px;
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
}

.start-btn {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 16px 42px rgba(37, 99, 235, 0.32);
}

.pause-btn {
  background: linear-gradient(135deg, #0f766e, #2563eb);
}

.restart-btn {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  box-shadow: 0 16px 42px rgba(239, 68, 68, 0.22);
}

/* =========================================================
   SECTION 4: Board
========================================================= */
.board-zone {
  min-width: 0;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.7);
}

.status-pill.playing {
  color: #86efac;
}

.status-pill.paused {
  color: #fde68a;
}

.status-pill.game-over {
  color: #fca5a5;
}

.game-board-frame {
  position: relative;
  width: min(100%, 430px);
  margin: 0 auto;
  padding: 14px;
  border-radius: 24px;
  border: 1px solid rgba(96, 165, 250, 0.64);
  background:
    radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.28), transparent 36%),
    rgba(2, 6, 23, 0.72);
  box-shadow:
    0 26px 80px rgba(37, 99, 235, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.game-board {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  grid-template-rows: repeat(15, minmax(0, 1fr));
  aspect-ratio: 10 / 15;
  overflow: hidden;
  border-radius: 14px;
  background:
    linear-gradient(rgba(96, 165, 250, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(96, 165, 250, 0.09) 1px, transparent 1px),
    rgba(15, 23, 42, 0.76);
  background-size: 10% 6.666%, 10% 6.666%, auto;
}

.board-cell,
.preview-cell {
  border: 1px solid rgba(96, 165, 250, 0.08);
  background: rgba(15, 23, 42, 0.34);
  box-sizing: border-box;
}

.board-cell.filled,
.preview-cell.filled {
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.38),
    inset 0 -8px 14px rgba(15, 23, 42, 0.24),
    0 0 16px rgba(96, 165, 250, 0.18);
}

.board-cell.active {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.48),
    0 0 20px rgba(168, 85, 247, 0.44);
}

.type-i {
  background: linear-gradient(135deg, #22d3ee, #2563eb);
}

.type-o {
  background: linear-gradient(135deg, #facc15, #f59e0b);
}

.type-t {
  background: linear-gradient(135deg, #c084fc, #7c3aed);
}

.type-s {
  background: linear-gradient(135deg, #86efac, #16a34a);
}

.type-z {
  background: linear-gradient(135deg, #fb7185, #dc2626);
}

.type-j {
  background: linear-gradient(135deg, #60a5fa, #1d4ed8);
}

.type-l {
  background: linear-gradient(135deg, #fdba74, #ea580c);
}

.board-overlay {
  position: absolute;
  inset: 14px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.64);
  backdrop-filter: blur(10px);
  text-align: center;
}

.board-overlay strong {
  color: white;
  font-size: 30px;
  font-weight: 950;
}

.board-overlay span {
  color: #bfdbfe;
  font-size: 14px;
  font-weight: 850;
}

.board-overlay.game-over strong {
  color: #fca5a5;
}

/* =========================================================
   SECTION 5: Right Stats / Preview
========================================================= */
.preview-grid {
  width: 112px;
  height: 112px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.28);
  background: rgba(2, 6, 23, 0.52);
}

.preview-cell {
  border-radius: 6px;
}

.stat-row {
  padding: 13px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-row span,
.stat-row small {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 900;
}

.stat-row strong {
  display: block;
  margin-top: 5px;
  color: white;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.stat-row small {
  margin-top: 3px;
  color: #93c5fd;
}

.mini-pause-btn {
  width: 38px;
  height: 34px;
  border: 1px solid rgba(96, 165, 250, 0.28);
  border-radius: 11px;
  color: white;
  background: rgba(37, 99, 235, 0.28);
  cursor: pointer;
}

.mini-pause-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.side-actions {
  display: grid;
  gap: 12px;
}

.secondary-back-btn {
  width: 100%;
}

/* =========================================================
   SECTION 6: Responsive Layout
========================================================= */
@media (max-width: 1180px) {
  .falling-layout {
    grid-template-columns: minmax(230px, 280px) minmax(300px, 1fr);
  }

  .right-panel {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .side-actions {
    align-content: start;
  }
}

@media (max-width: 760px) {
  .falling-blocks-screen {
    padding: 16px;
  }

  .falling-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .falling-layout {
    grid-template-columns: 1fr;
  }

  .right-panel {
    grid-template-columns: 1fr;
  }

  .game-title-card {
    align-items: flex-start;
  }

  .game-board-frame {
    width: min(100%, 360px);
  }
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

</style>