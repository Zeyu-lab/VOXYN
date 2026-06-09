<script setup>
import { computed, ref } from "vue"
import GameLibrary from "./GameLibrary.vue"
import TicTacToe from "./TicTacToe.vue"

const props = defineProps({
  isStageTwo: {
    type: Boolean,
    default: false
  },
  roomCode: {
    type: String,
    default: ""
  },
  roomTitle: {
    type: String,
    default: "VOXYN Room"
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

const emit = defineEmits(["enter-stage-two"])

const selectedGame = ref(null)

const selectedGameTitle = computed(() => {
  return selectedGame.value?.gameTitle || ""
})

const selectedGameMode = computed(() => {
  return selectedGame.value?.mode || ""
})

function handleLaunchGame(payload) {
  selectedGame.value = payload
}

function backToLibrary() {
  selectedGame.value = null
}
</script>

<template>
  <section class="game-stage-shell">
    <div
      v-if="!props.isStageTwo"
      class="stage-one-intro"
    >
      <div class="cube-mark-local">◆</div>

      <p>VOXYN</p>
      <h2>Game Area</h2>
      <span>The game is ready.</span>
      <small>Gather your team and start playing.</small>

      <button
        type="button"
        @click="emit('enter-stage-two')"
      >
        ▶ Start Game
      </button>
    </div>

    <GameLibrary
      v-else-if="!selectedGame"
      @launch-game="handleLaunchGame"
    />

    <TicTacToe
      v-else-if="selectedGame.gameId === 'tic-tac-toe'"
      :mode="selectedGameMode"
      :room-code="props.roomCode"
      :user="props.user"
      @back-to-library="backToLibrary"
    />

    <div
      v-else
      class="coming-soon-screen"
    >
      <div class="coming-icon">◇</div>

      <p>{{ selectedGameTitle }}</p>
      <h2>{{ selectedGame?.modeLabel }} Mode</h2>
      <span>This game screen is not implemented yet.</span>
      <small>
        The library flow is working. This slot is ready for future game modules.
      </small>

      <button
        type="button"
        @click="backToLibrary"
      >
        ← Back to Game Library
      </button>
    </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Game Stage Shell
   Purpose:
   - Let GameLibrary / game pages control their own layout
   - Avoid forcing every game screen into center grid
   - Allow parent Game Area to scroll when content is taller
========================================================= */
.game-stage-shell {
  position: relative;
  z-index: 2;

  width: 100%;
  min-width: 0;
  min-height: 100%;

  display: block;

  text-align: center;
  overflow: visible;
  box-sizing: border-box;
}

/* =========================================================
   SECTION 2: Centered Empty / Coming Soon Screens
========================================================= */
.stage-one-intro,
.coming-soon-screen {
  min-height: 520px;

  display: grid;
  align-content: center;
  justify-items: center;
}

.cube-mark-local,
.coming-icon {
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  font-size: 32px;
  box-shadow:
    0 22px 58px rgba(59, 130, 246, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.stage-one-intro p,
.coming-soon-screen p {
  margin: 24px 0 0;
  color: white;
  font-size: 40px;
  font-weight: 950;
  letter-spacing: 0.34em;
  text-shadow: 0 16px 50px rgba(15, 23, 42, 0.68);
}

.stage-one-intro h2,
.coming-soon-screen h2 {
  margin: 10px 0 20px;
  color: #cbd5e1;
  font-size: 17px;
  text-transform: uppercase;
  letter-spacing: 0.26em;
}

.stage-one-intro span,
.coming-soon-screen span {
  color: #60a5fa;
  font-size: 18px;
  font-weight: 950;
}

.stage-one-intro small,
.coming-soon-screen small {
  display: block;
  margin-top: 8px;
  color: #dbeafe;
  font-size: 14px;
  font-weight: 750;
}

.stage-one-intro button,
.coming-soon-screen button {
  margin-top: 30px;
  min-height: 54px;
  padding: 0 34px;
  border: none;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 18px 44px rgba(59, 130, 246, 0.34);
}
</style>