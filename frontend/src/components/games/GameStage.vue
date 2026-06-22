<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue helpers
   - Load Game Library
   - Load playable game modules
========================================================= */
import { computed, onBeforeUnmount, ref, watch } from "vue"
import GameLibrary from "./GameLibrary.vue"
import TicTacToe from "./TicTacToe.vue"
import FallingBlocks from "./FallingBlocks.vue"
import Game2048 from "./Game2048.vue"

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
const selectedRoomsGame = ref(null)
const isRoomsDrawerOpen = ref(false)
const activeRooms = ref([])
const isLoadingRooms = ref(false)
const roomsError = ref("")

const activeSession = ref(null)
const activeRole = ref("player")
const activeSlotId = ref("")
const syncedGameState = ref(null)

let boundRoomsSocket = null

/* =========================================================
   SECTION 4: Game Component Registry
   Purpose:
   - Central registry for playable game screens
   - Registry key must match GameLibrary game.id
   - If gameId is not registered here, GameStage shows Coming Soon
========================================================= */
const gameComponentRegistry = {
  "tic-tac-toe": TicTacToe,
  "falling-blocks": FallingBlocks,
  "2048": Game2048,
}

const gameMetaRegistry = {
  "tic-tac-toe": {
    gameTitle: "Tic Tac Toe",
    mode: "Multiplayer",
    maxPlayers: 2,
  },

  "falling-blocks": {
    gameTitle: "Falling Blocks",
    mode: "Single Player",
    maxPlayers: 1,
  },

  "2048": {
    gameTitle: "2048",
    mode: "Single Player",
    maxPlayers: 1,
  },
}

let hasAppliedUrlGameLaunch = false

/* =========================================================
   SECTION 5: Active Game Computeds
========================================================= */
const selectedGameId = computed(() => {
  return selectedGame.value?.gameId || selectedGame.value?.id || ""
})

const selectedGameTitle = computed(() => {
  return (
    selectedGame.value?.gameTitle ||
    selectedGame.value?.title ||
    gameMetaRegistry[selectedGameId.value]?.gameTitle ||
    ""
  )
})

const selectedGameMode = computed(() => {
  return (
    selectedGame.value?.mode ||
    gameMetaRegistry[selectedGameId.value]?.mode ||
    ""
  )
})

const activeGameComponent = computed(() => {
  if (!selectedGameId.value) return null
  return gameComponentRegistry[selectedGameId.value] || null
})

const isPlayableGame = computed(() => {
  return Boolean(activeGameComponent.value)
})

const isActiveGameReadOnly = computed(() => {
  return (
    selectedGame.value?.defaultRole === "spectator" ||
    selectedGame.value?.defaultRole === "watcher" ||
    activeRole.value !== "player"
  )
})

const roomsDrawerTitle = computed(() => {
  return selectedRoomsGame.value?.gameTitle
    ? `${selectedRoomsGame.value.gameTitle} Rooms`
    : "Live Rooms"
})

const liveRoomCount = computed(() => {
  return activeRooms.value.length
})

const selectedRoomsGameId = computed(() => {
  return selectedRoomsGame.value?.gameId || selectedRoomsGame.value?.id || ""
})

const hasActiveRooms = computed(() => {
  return activeRooms.value.length > 0
})

/* =========================================================
   SECTION 6: URL Game Launch Helpers
   Purpose:
   - Let Live Rooms navigate to /room/:code?game=...&role=...
   - Once Stage 2 opens, auto-load the requested game screen
========================================================= */
function getGameMeta(gameId) {
  return gameMetaRegistry[gameId] || {
    gameTitle: gameId || "Game",
    gameNumber: "Game",
    players: "Players",
    ready: false
  }
}

function applyUrlGameLaunch() {
  if (hasAppliedUrlGameLaunch) return
  if (!props.isStageTwo) return

  const params = new URLSearchParams(window.location.search)
  const gameId = String(params.get("game") || "").trim()
  const role = String(params.get("role") || "spectator")
    .trim()
    .toLowerCase()

  if (!gameId) return

  const gameMeta = getGameMeta(gameId)
  const defaultRole = role === "player" ? "player" : "spectator"

  selectedGame.value = {
    gameId,
    ...gameMeta,
    mode: defaultRole === "player" ? "multiplayer" : "spectator",
    modeLabel: defaultRole === "player" ? "Multiplayer" : "Watch",
    defaultRole,
    watchRoomCode: props.roomCode
  }

  hasAppliedUrlGameLaunch = true
  setupGameSession(selectedGame.value, defaultRole)
}

/* =========================================================
   SECTION 7: Live Room Helpers
========================================================= */
function normalizeRooms(payload) {
  if (!payload) return []

  const rooms = Array.isArray(payload.rooms)
    ? payload.rooms
    : Array.isArray(payload)
      ? payload
      : []

  return rooms.map((room) => {
    const maxPlayers = Number(room?.maxPlayers || 0)
    const playerCount = Number(room?.playerCount || 0)

    return {
      ...room,
      openSlotCount: Number.isFinite(Number(room?.openSlotCount))
        ? Number(room.openSlotCount)
        : Math.max(maxPlayers - playerCount, 0)
    }
  })
}

function getPlayerSlot(room, index) {
  return room?.playerSlots?.[index] || null
}

function getPlayerInitial(slot, fallback = "?") {
  return slot?.player?.initial || fallback
}

function getPlayerName(slot, fallback = "Open Slot") {
  return slot?.player?.username || fallback
}

function getSpectatorLabel(room) {
  const count = Number(room?.spectatorCount || 0)
  return count === 1 ? "1 spectator" : `${count} spectators`
}

function getOpenSlotCount(room) {
  return Number(room?.openSlotCount || 0)
}

function getRoomLabel(room, index) {
  return room?.roomCode ? `Room ${room.roomCode}` : `Room ${index + 1}`
}

function bindRoomsSocket(nextSocket) {
  if (boundRoomsSocket && boundRoomsSocket !== nextSocket) {
    boundRoomsSocket.off("game:active-rooms-update", handleActiveRoomsUpdate)
    boundRoomsSocket.off("game:session-update", handleGameSessionUpdate)
    boundRoomsSocket.off("game:state-update", handleGameStateUpdate)
  }

  if (!nextSocket) {
    boundRoomsSocket = null
    return
  }

  nextSocket.off("game:active-rooms-update", handleActiveRoomsUpdate)
  nextSocket.off("game:session-update", handleGameSessionUpdate)
  nextSocket.off("game:state-update", handleGameStateUpdate)

  nextSocket.on("game:active-rooms-update", handleActiveRoomsUpdate)
  nextSocket.on("game:session-update", handleGameSessionUpdate)
  nextSocket.on("game:state-update", handleGameStateUpdate)

  boundRoomsSocket = nextSocket
}

function handleActiveRoomsUpdate(payload) {
  if (!selectedRoomsGameId.value) return
  if (payload?.gameId !== selectedRoomsGameId.value) return

  activeRooms.value = normalizeRooms(payload)
}

function handleGameSessionUpdate(session) {
  if (!selectedGameId.value) return
  if (session?.gameId !== selectedGameId.value) return
  if (session?.roomCode && session.roomCode !== props.roomCode) return

  activeSession.value = session
  syncedGameState.value = session?.gameState || null
}

function handleGameStateUpdate(payload) {
  if (!selectedGameId.value) return
  if (payload?.gameId !== selectedGameId.value) return

  const nextSession = payload?.session || null

  if (nextSession?.roomCode && nextSession.roomCode !== props.roomCode) return

  activeSession.value = nextSession || activeSession.value
  syncedGameState.value = payload?.gameState || nextSession?.gameState || null
}

function fetchActiveRooms(gameId = selectedRoomsGameId.value) {
  if (!gameId) return

  const currentSocket = props.socket

  roomsError.value = ""

  if (!currentSocket) {
    activeRooms.value = []
    roomsError.value = "Socket is not connected yet."
    return
  }

  isLoadingRooms.value = true

  currentSocket.emit(
    "game:get-active-rooms",
    { gameId },
    (response) => {
      isLoadingRooms.value = false

      if (!response?.ok) {
        activeRooms.value = []

        if (response?.error === "Invalid game id.") {
          roomsError.value = ""
          return
        }

        roomsError.value = response?.error || "Failed to load active rooms."
        return
      }

      activeRooms.value = normalizeRooms(response)
    }
  )
}


function openGameRooms(payload) {
  selectedRoomsGame.value = payload
  isRoomsDrawerOpen.value = true
  activeRooms.value = []
  roomsError.value = ""
  fetchActiveRooms(payload?.gameId)
}

function closeGameRooms() {
  isRoomsDrawerOpen.value = false
}

function refreshGameRooms() {
  fetchActiveRooms()
}

function launchRoomFromDrawer(room, role = "spectator") {
  if (!selectedRoomsGame.value) return

  const nextGame = {
    ...selectedRoomsGame.value,
    mode: role === "player" ? "multiplayer" : "spectator",
    modeLabel: role === "player" ? "Multiplayer" : "Watch",
    defaultRole: role,
    watchRoomCode: room?.roomCode || props.roomCode
  }

  if (!room?.roomCode || room.roomCode === props.roomCode) {
    selectedGame.value = nextGame
    isRoomsDrawerOpen.value = false
    setupGameSession(nextGame, role)
    return
  }

  const targetRoom = encodeURIComponent(room.roomCode)
  const targetGame = encodeURIComponent(selectedRoomsGame.value.gameId)
  const targetRole = encodeURIComponent(role)

  window.location.href = `/room/${targetRoom}?game=${targetGame}&role=${targetRole}`
}

function watchRoom(room) {
  launchRoomFromDrawer(room, "spectator")
}

function joinOpenRoom(room) {
  launchRoomFromDrawer(room, "player")
}

/* =========================================================
   SECTION 8: Actions
========================================================= */
function handleLaunchGame(payload) {
  const nextGame = {
    ...payload,
    defaultRole: payload?.defaultRole || "player",
    watchRoomCode: payload?.watchRoomCode || props.roomCode,
  }

  selectedGame.value = nextGame
  isRoomsDrawerOpen.value = false

  setupGameSession(nextGame, nextGame.defaultRole)
}

function backToLibrary() {
  resetActiveSession()
  selectedGame.value = null
}

function resetActiveSession() {
  activeSession.value = null
  activeRole.value = "player"
  activeSlotId.value = ""
  syncedGameState.value = null
}

function normalizeServerRole(role) {
  const value = String(role || "").toLowerCase()

  if (value === "spectator" || value === "watcher" || value === "watch") {
    return "spectator"
  }

  return "player"
}

function setupGameSession(payload, role = "player") {
  const gameId = String(payload?.gameId || payload?.id || "").trim()

  if (!gameId) return
  if (!props.socket) return
  if (!props.roomCode) return

  props.socket.emit(
    "game:join-session",
    {
      roomCode: props.roomCode,
      gameId,
      role,
    },
    (response) => {
      if (!response?.ok) {
        console.warn("[GameStage] Failed to setup game session:", response?.error)
        return
      }

      activeRole.value = normalizeServerRole(response.role)
      activeSlotId.value = response.slotId || ""
      activeSession.value = response.session || null
      syncedGameState.value = response.session?.gameState || null

      fetchActiveRooms(gameId)
    }
  )
}

function syncGameState(nextState) {
  if (!props.socket) return
  if (!selectedGameId.value) return
  if (activeRole.value !== "player") return

  props.socket.emit(
    "game:state-sync",
    {
      roomCode: props.roomCode,
      gameId: selectedGameId.value,
      gameState: nextState,
    },
    (response) => {
      if (!response?.ok) {
        console.warn("[GameStage] state sync failed:", response?.error)
      }
    }
  )
}

watch(
  () => props.isStageTwo,
  () => {
    applyUrlGameLaunch()
  },
  { immediate: true }
)

watch(
  () => props.socket,
  (nextSocket) => {
    bindRoomsSocket(nextSocket)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (!boundRoomsSocket) return

  boundRoomsSocket.off("game:active-rooms-update", handleActiveRoomsUpdate)
  boundRoomsSocket.off("game:session-update", handleGameSessionUpdate)
  boundRoomsSocket.off("game:state-update", handleGameStateUpdate)

  boundRoomsSocket = null
})
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

    <div
      v-else-if="!selectedGame"
      class="library-live-shell"
      :class="{ 'rooms-open': isRoomsDrawerOpen }"
    >
      <GameLibrary
        @launch-game="handleLaunchGame"
        @open-game-rooms="openGameRooms"
      />

      <button
        v-if="selectedRoomsGame"
        type="button"
        class="live-edge-tab"
        :class="{ open: isRoomsDrawerOpen }"
        @click="isRoomsDrawerOpen ? closeGameRooms() : openGameRooms(selectedRoomsGame)"
      >
        <span>👁</span>
        <strong>{{ liveRoomCount }}</strong>
        <em>Live</em>
      </button>

      <aside
        v-if="isRoomsDrawerOpen"
        class="live-rooms-drawer"
      >
        <header class="live-rooms-header">
          <div>
            <p>{{ roomsDrawerTitle }}</p>
            <span>Live matches you can watch or join</span>
          </div>

          <div class="drawer-actions">
            <button
              type="button"
              class="drawer-icon-btn"
              :disabled="isLoadingRooms"
              @click="refreshGameRooms"
            >
              ↻
            </button>

            <button
              type="button"
              class="drawer-icon-btn"
              @click="closeGameRooms"
            >
              ×
            </button>
          </div>
        </header>

        <div
          v-if="isLoadingRooms"
          class="rooms-empty-state"
        >
          <strong>Loading rooms...</strong>
          <small>Scanning active VOXYN game sessions.</small>
        </div>

        <div
          v-else-if="roomsError"
          class="rooms-empty-state warning"
        >
          <strong>Rooms unavailable</strong>
          <small>{{ roomsError }}</small>
        </div>

        <div
          v-else-if="!hasActiveRooms"
          class="rooms-empty-state"
        >
          <strong>No live rooms yet</strong>
          <small>Start this game first, then friends can watch from here.</small>
        </div>

        <div
          v-else
          class="live-room-list"
        >
          <article
            v-for="(room, index) in activeRooms"
            :key="room.id || `${room.roomCode}-${index}`"
            class="live-room-card"
            :class="{ joinable: getOpenSlotCount(room) > 0 }"
          >
            <div class="room-card-topline">
              <span
                class="status-pill"
                :class="{ open: getOpenSlotCount(room) > 0 }"
              >
                {{ getOpenSlotCount(room) > 0 ? `${getOpenSlotCount(room)} SLOT OPEN` : 'LIVE' }}
              </span>

              <small>👁 {{ getSpectatorLabel(room) }}</small>
            </div>

            <div class="room-code-line">
              {{ getRoomLabel(room, index) }}
            </div>

            <div class="matchup-row">
              <div class="player-preview">
                <div class="player-orb blue">
                  {{ getPlayerInitial(getPlayerSlot(room, 0), 'A') }}
                </div>
                <span>{{ getPlayerName(getPlayerSlot(room, 0), 'Open Slot') }}</span>
              </div>

              <strong>VS</strong>

              <div class="player-preview">
                <div
                  class="player-orb purple"
                  :class="{ empty: !getPlayerSlot(room, 1)?.occupied }"
                >
                  {{ getPlayerSlot(room, 1)?.occupied ? getPlayerInitial(getPlayerSlot(room, 1), 'B') : '+' }}
                </div>
                <span>{{ getPlayerName(getPlayerSlot(room, 1), 'Open Slot') }}</span>
              </div>
            </div>

            <button
              type="button"
              class="watch-room-btn"
              @click="watchRoom(room)"
            >
              👁 Watch
            </button>

            <button
              v-if="getOpenSlotCount(room) > 0"
              type="button"
              class="join-room-btn"
              @click="joinOpenRoom(room)"
            >
              🎮 Join Game
            </button>
          </article>
        </div>

        <footer class="rooms-drawer-footer">
          ⓘ Watch active matches and join when a slot opens.
        </footer>
      </aside>
    </div>

    <component
        :is="activeGameComponent"
        v-else-if="isPlayableGame"
        :mode="selectedGameMode"
        :default-role="selectedGame?.defaultRole || 'player'"
        :watch-room-code="selectedGame?.watchRoomCode || props.roomCode"
        :room-code="props.roomCode"
        :user="props.user"
        :socket="props.socket"
        :session="activeSession"
        :game-state="syncedGameState"
        :role="activeRole"
        :slot-id="activeSlotId"
        :readonly="isActiveGameReadOnly"
        @state-change="syncGameState"
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

/* =========================================================
   SECTION 3: Game Room Watcher Drawer
   Purpose:
   - v0.83 per-card live room browser
   - Keep GameCard clean, draw room list from GameStage
========================================================= */
.library-live-shell {
  position: relative;
  min-height: 100%;
}

.live-edge-tab {
  position: absolute;
  top: 128px;
  right: 14px;
  z-index: 12;

  width: 54px;
  min-height: 116px;
  padding: 10px 0;

  display: grid;
  justify-items: center;
  align-content: center;
  gap: 6px;

  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 999px;
  color: #2563eb;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.88), rgba(239,246,255,0.70)),
    rgba(255, 255, 255, 0.70);
  box-shadow:
    0 18px 44px rgba(37, 99, 235, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);

  font-family: inherit;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.live-edge-tab:hover,
.live-edge-tab.open {
  transform: translateX(-2px);
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow:
    0 22px 52px rgba(37, 99, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.live-edge-tab span,
.live-edge-tab strong,
.live-edge-tab em {
  display: block;
  line-height: 1;
}

.live-edge-tab strong {
  font-size: 20px;
  font-weight: 950;
}

.live-edge-tab em {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  letter-spacing: 0.04em;
}

.live-rooms-drawer {
  position: absolute;
  top: 44px;
  right: 24px;
  z-index: 20;

  width: min(318px, calc(100% - 48px));
  max-height: calc(100% - 76px);
  padding: 18px;
  box-sizing: border-box;
  overflow: auto;

  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  background:
    radial-gradient(circle at 18% 0%, rgba(96, 165, 250, 0.16), transparent 34%),
    radial-gradient(circle at 90% 18%, rgba(168, 85, 247, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,0.88), rgba(244,248,255,0.76));
  box-shadow:
    0 28px 78px rgba(30, 64, 175, 0.16),
    0 10px 28px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255,255,255,0.96);
  backdrop-filter: blur(30px) saturate(190%);
  -webkit-backdrop-filter: blur(30px) saturate(190%);
  text-align: left;
}

.live-rooms-drawer::-webkit-scrollbar {
  width: 8px;
}

.live-rooms-drawer::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.28);
}

.live-rooms-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.live-rooms-header p {
  margin: 0 0 5px;
  color: #101828;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.live-rooms-header span {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

.drawer-icon-btn {
  width: 34px;
  height: 34px;

  display: grid;
  place-items: center;

  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 999px;
  color: #475467;
  background: rgba(255, 255, 255, 0.70);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.90);

  font-family: inherit;
  font-size: 16px;
  font-weight: 950;
  cursor: pointer;
}

.drawer-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rooms-empty-state {
  padding: 24px 14px;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.12);
  background: rgba(255, 255, 255, 0.58);
  text-align: center;
}

.rooms-empty-state strong {
  display: block;
  color: #101828;
  font-size: 15px;
  font-weight: 950;
}

.rooms-empty-state small {
  display: block;
  margin-top: 7px;
  color: #667085;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.rooms-empty-state.warning {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(255, 251, 235, 0.60);
}

.live-room-list {
  display: grid;
  gap: 12px;
}

.live-room-card {
  padding: 13px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58)),
    rgba(255, 255, 255, 0.68);
  box-shadow:
    0 16px 38px rgba(30, 64, 175, 0.10),
    inset 0 1px 0 rgba(255,255,255,0.92);
}

.live-room-card.joinable {
  border-color: rgba(245, 158, 11, 0.30);
}

.room-card-topline,
.matchup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.room-card-topline small {
  color: #667085;
  font-size: 11px;
  font-weight: 850;
}

.status-pill {
  padding: 5px 8px;
  border-radius: 999px;
  color: #7c3aed;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.16);
  font-size: 10px;
  font-weight: 950;
}

.status-pill.open {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.22);
}

.room-code-line {
  margin: 10px 0 12px;
  color: #475467;
  font-size: 12px;
  font-weight: 900;
}

.matchup-row {
  margin-bottom: 12px;
}

.matchup-row > strong {
  color: #475467;
  font-size: 13px;
  font-weight: 950;
}

.player-preview {
  min-width: 0;
  flex: 1;
  display: grid;
  justify-items: center;
  gap: 6px;
}

.player-preview span {
  max-width: 92px;
  color: #344054;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-orb {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 950;
  box-shadow:
    0 12px 26px rgba(37, 99, 235, 0.12),
    inset 0 1px 0 rgba(255,255,255,0.88);
}

.player-orb.blue {
  color: #2563eb;
  background: linear-gradient(135deg, rgba(219,234,254,0.94), rgba(191,219,254,0.76));
  border: 1px solid rgba(59, 130, 246, 0.20);
}

.player-orb.purple {
  color: #7c3aed;
  background: linear-gradient(135deg, rgba(243,232,255,0.94), rgba(221,214,254,0.76));
  border: 1px solid rgba(168, 85, 247, 0.20);
}

.player-orb.empty {
  color: #98a2b3;
  background: rgba(255,255,255,0.62);
  border-style: dashed;
}

.watch-room-btn,
.join-room-btn {
  width: 100%;
  min-height: 38px;
  border-radius: 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

.watch-room-btn {
  border: 1px solid rgba(37, 99, 235, 0.16);
  color: #0a84ff;
  background: rgba(37, 99, 235, 0.06);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.86);
}

.join-room-btn {
  margin-top: 8px;
  border: 1px solid rgba(37, 99, 235, 0.34);
  color: #ffffff;
  background: linear-gradient(135deg, #0a84ff, #4f46e5);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.18);
}

.rooms-drawer-footer {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 15px;
  color: #667085;
  background: rgba(239, 246, 255, 0.72);
  border: 1px solid rgba(59, 130, 246, 0.10);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.45;
}

@media (max-width: 900px) {
  .live-edge-tab {
    top: auto;
    right: 18px;
    bottom: 18px;
    width: auto;
    min-height: 42px;
    padding: 0 14px;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
  }

  .live-edge-tab em {
    writing-mode: horizontal-tb;
  }

  .live-rooms-drawer {
    top: 18px;
    right: 18px;
    left: 18px;
    width: auto;
    max-height: calc(100% - 36px);
  }
}

</style>