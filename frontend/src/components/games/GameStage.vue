<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue helpers
   - Load Game Library
   - Load playable game modules
========================================================= */
import { computed, ref } from "vue"
import GameLibrary from "./GameLibrary.vue"
import TicTacToe from "./TicTacToe.vue"
import FallingBlocks from "./FallingBlocks.vue"

/* =========================================================
   SECTION 2: Props / Emits
========================================================= */
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

/* =========================================================
   SECTION 3: Stage Game State
========================================================= */
const selectedGame = ref(null)

/* =========================================================
   SECTION 4: Game Component Registry
   Purpose:
   - Central registry for playable game screens
   - Add future games here only
   Notes:
   - Registry key must match GameLibrary game.id
   - If a game is not registered here, it falls back to Coming Soon
========================================================= */
const gameComponentRegistry = {
  "tic-tac-toe": TicTacToe,
  "falling-blocks": FallingBlocks
  // "click-battle": ClickBattle
  // "game-2048": Game2048
}

/* =========================================================
   SECTION 5: Active Game Computeds
========================================================= */
const selectedGameTitle = computed(() => {
  return selectedGame.value?.gameTitle || ""
})

const selectedGameMode = computed(() => {
  return selectedGame.value?.mode || ""
})

const activeGameComponent = computed(() => {
  if (!selectedGame.value?.gameId) return null
  return gameComponentRegistry[selectedGame.value.gameId] || null
})

const isPlayableGame = computed(() => {
  return Boolean(activeGameComponent.value)
})

/* =========================================================
   SECTION 6: Actions
========================================================= */
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

    <component
        :is="activeGameComponent"
        v-else-if="isPlayableGame"
        :mode="selectedGameMode"
        :room-code="props.roomCode"
        :user="props.user"
        :socket="props.socket"
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
   SECTION 1: Game Stage Shell - White Liquid Glass Base
   Notes:
   - Style-only change
   - No component registry / game launch behavior changed
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
  color: #101828;

  border-radius: 30px;
  background:
    radial-gradient(circle at 18% 8%, rgba(96, 165, 250, 0.18), transparent 30%),
    radial-gradient(circle at 84% 14%, rgba(168, 85, 247, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.72), rgba(244,248,255,0.68));
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

  padding: 44px 22px;
  box-sizing: border-box;
}

.cube-mark-local,
.coming-icon {
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 26px;
  color: white;
  background: linear-gradient(135deg, #0a84ff, #4f46e5);
  font-size: 32px;
  box-shadow:
    0 22px 54px rgba(37, 99, 235, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.stage-one-intro p,
.coming-soon-screen p {
  margin: 24px 0 0;
  color: #101828;
  font-size: 40px;
  font-weight: 950;
  letter-spacing: 0.34em;
  text-shadow: none;
}

.stage-one-intro h2,
.coming-soon-screen h2 {
  margin: 10px 0 20px;
  color: #667085;
  font-size: 17px;
  text-transform: uppercase;
  letter-spacing: 0.26em;
}

.stage-one-intro span,
.coming-soon-screen span {
  color: #0a84ff;
  font-size: 18px;
  font-weight: 950;
}

.stage-one-intro small,
.coming-soon-screen small {
  display: block;
  margin-top: 8px;
  color: #667085;
  font-size: 14px;
  font-weight: 750;
}

.stage-one-intro button,
.coming-soon-screen button {
  margin-top: 30px;
  min-height: 54px;
  padding: 0 34px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #0a84ff, #4f46e5);
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.22);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    filter 0.16s ease;
}

.stage-one-intro button:hover,
.coming-soon-screen button:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 22px 48px rgba(37, 99, 235, 0.28);
}
</style>