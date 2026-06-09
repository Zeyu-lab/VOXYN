<script setup>
import { computed, ref, watch } from "vue"

const props = defineProps({
  mode: {
    type: String,
    default: "ai"
  },
  roomCode: {
    type: String,
    default: ""
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(["back-to-library"])

const board = ref(Array(9).fill(""))
const currentPlayer = ref("X")
const isAiThinking = ref(false)

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

const modeLabel = computed(() => {
  return props.mode === "multiplayer" ? "Local Multiplayer" : "AI Mode"
})

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

const gameStatus = computed(() => {
  if (winner.value) {
    return `${winner.value} wins`
  }

  if (isDraw.value) {
    return "Draw game"
  }

  if (isAiThinking.value) {
    return "AI is thinking..."
  }

  return `${currentPlayer.value}'s turn`
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

function makeMove(index) {
  if (board.value[index]) return
  if (winner.value || isDraw.value) return
  if (isAiThinking.value) return

  board.value[index] = currentPlayer.value

  if (winner.value || isDraw.value) return

  if (props.mode === "ai") {
    currentPlayer.value = "O"
    runAiMove()
    return
  }

  currentPlayer.value = currentPlayer.value === "X" ? "O" : "X"
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

    const playerCount = values.filter((value) => {
      return value === player
    }).length

    const emptyCount = values.filter((value) => {
      return value === ""
    }).length

    if (playerCount === 2 && emptyCount === 1) {
      return line[values.indexOf("")]
    }
  }

  return -1
}

function resetGame() {
  board.value = Array(9).fill("")
  currentPlayer.value = "X"
  isAiThinking.value = false
}

watch(
  () => props.mode,
  () => {
    resetGame()
  }
)
</script>

<template>
  <section class="tic-page">
    <header class="tic-header">
      <div>
        <p>Game 1</p>
        <h2>Tic Tac Toe</h2>
        <span>{{ modeLabel }} · Room {{ props.roomCode }}</span>
      </div>

      <div class="tic-actions">
        <button
          type="button"
          @click="resetGame"
        >
          Reset
        </button>

        <button
          type="button"
          class="secondary"
          @click="emit('back-to-library')"
        >
          ← Game Library
        </button>
      </div>
    </header>

    <div class="tic-layout">
      <section class="tic-board-card">
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
              winner: winningCells.includes(index)
            }"
            @click="makeMove(index)"
          >
            {{ cell }}
          </button>
        </div>
      </section>

      <aside class="tic-side">
        <div class="tic-info-card">
          <p>Mode</p>
          <h3>{{ modeLabel }}</h3>
          <span v-if="props.mode === 'ai'">
            You are X. The local AI plays O.
          </span>
          <span v-else>
            Two players can play on the same screen for now.
          </span>
        </div>

        <div class="tic-info-card">
          <p>Status</p>
          <h3>{{ gameStatus }}</h3>
          <span>
            This is the first playable game module inside VOXYN Stage 2.
          </span>
        </div>

        <div class="tic-info-card muted">
          <p>Next</p>
          <h3>Future Multiplayer</h3>
          <span>
            Later this can sync moves through Socket.IO instead of local state.
          </span>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.tic-page {
  width: 100%;
  min-height: 100%;
  padding: 34px 34px 100px;
  color: #e5edff;
  text-align: left;
  position: relative;
  z-index: 2;
}

.tic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 26px;
}

.tic-header p {
  margin: 0 0 4px;
  color: #60a5fa;
  font-size: 13px;
  font-weight: 950;
}

.tic-header h2 {
  margin: 0;
  color: white;
  font-size: 38px;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.tic-header span {
  display: block;
  margin-top: 7px;
  color: #c7d2fe;
  font-size: 14px;
  font-weight: 800;
}

.tic-actions {
  display: flex;
  gap: 10px;
}

.tic-actions button {
  min-height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 13px;
  color: white;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

.tic-actions button.secondary {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.tic-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 22px;
  align-items: stretch;
}

.tic-board-card {
  min-height: 520px;
  padding: 28px;
  display: grid;
  place-items: center;
  position: relative;
  border-radius: 26px;
  background:
    radial-gradient(circle at 50% 20%, rgba(96, 165, 250, 0.22), transparent 36%),
    rgba(2, 6, 23, 0.36);
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.status-pill {
  position: absolute;
  top: 20px;
  left: 20px;
  min-height: 36px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #bfdbfe;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(96, 165, 250, 0.25);
  font-size: 13px;
  font-weight: 950;
}

.tic-board {
  width: min(390px, 100%);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.tic-cell {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  color: white;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.52)),
    rgba(2, 6, 23, 0.44);
  font-size: 54px;
  font-weight: 950;
  cursor: pointer;
  transition: 0.16s ease;
}

.tic-cell:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.55);
}

.tic-cell.x {
  color: #60a5fa;
  text-shadow: 0 0 26px rgba(96, 165, 250, 0.65);
}

.tic-cell.o {
  color: #c084fc;
  text-shadow: 0 0 26px rgba(168, 85, 247, 0.65);
}

.tic-cell.winner {
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.82), rgba(124, 58, 237, 0.82));
  border-color: rgba(191, 219, 254, 0.6);
}

.tic-side {
  display: grid;
  gap: 14px;
}

.tic-info-card {
  padding: 18px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.tic-info-card p {
  margin: 0 0 8px;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.tic-info-card h3 {
  margin: 0 0 8px;
  color: white;
  font-size: 18px;
  font-weight: 950;
}

.tic-info-card span {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.55;
}

.tic-info-card.muted {
  opacity: 0.72;
}

@media (max-width: 1080px) {
  .tic-layout {
    grid-template-columns: 1fr;
  }

  .tic-side {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>