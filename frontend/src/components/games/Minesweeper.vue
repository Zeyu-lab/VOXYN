<script setup>
/* VOXYN 1.01 — one player, live spectators, server-owned board. */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = defineProps({
  socket: { type: Object, default: null },
  roomCode: { type: String, default: "" },
  session: { type: Object, default: null },
  gameState: { type: Object, default: null },
  role: { type: String, default: "none" },
  readonly: { type: Boolean, default: true },
  sessionError: { type: String, default: "" },
})
const emit = defineEmits(["back-to-library", "retry-session", "take-seat"])

const state = ref(null)
const receivedAt = ref(Date.now())
const now = ref(Date.now())
const connected = ref(Boolean(props.socket?.connected))
const pending = ref(false)
const actionError = ref("")
const flagMode = ref(false)
const boardRef = ref(null)
let timer = null
let actionTimer = null
let requestId = 0
let boundSocket = null

function acceptState(snapshot) {
  if (!snapshot?.roundId || !Array.isArray(snapshot.board)) return
  if (state.value?.roundId === snapshot.roundId && state.value.revision > snapshot.revision) return
  state.value = snapshot
  receivedAt.value = Date.now()
  now.value = Date.now()
}
watch(() => props.gameState, acceptState, { immediate: true })

const player = computed(() => props.session?.playerSlots?.find(slot => slot.occupied)?.player)
const isPlayer = computed(() => connected.value && !props.readonly && player.value?.socketId === props.socket?.id)
const canPlay = computed(() => isPlayer.value && connected.value && Boolean(state.value) && !pending.value)
const isFinished = computed(() => ["won", "lost"].includes(state.value?.status))
const elapsed = computed(() => {
  if (!state.value) return 0
  const extra = state.value.status === "playing" ? Math.floor((now.value - receivedAt.value) / 1000) : 0
  return Math.max(0, (state.value.elapsedSeconds || 0) + extra)
})
const timeLabel = computed(() => `${String(Math.floor(elapsed.value / 60)).padStart(2, "0")}:${String(elapsed.value % 60).padStart(2, "0")}`)
const statusTitle = computed(() => {
  if (!connected.value) return "Connection lost. Reconnect to continue."
  if (props.sessionError) return "Game connection needs attention"
  if (!state.value) return "Connecting to the board…"
  if (state.value.status === "won") return "Board cleared. Nicely done."
  if (state.value.status === "lost") return "A mine was hit. Try another board."
  if (!isPlayer.value) return player.value ? `Watching ${player.value.username || "the player"}` : "Waiting for a player"
  return state.value.status === "ready" ? "Choose your first square" : "Find the safe path"
})

function cancelPending() {
  requestId++
  clearTimeout(actionTimer)
  actionTimer = null
  pending.value = false
}
function onConnect() {
  connected.value = true
  // RoomView must finish joining the room before the user retries this session.
}
function onDisconnect() {
  connected.value = false
  cancelPending()
  actionError.value = "Connection lost. After reconnecting, click Rejoin game."
}
watch(() => props.socket, socket => {
  if (boundSocket) {
    boundSocket.off("connect", onConnect)
    boundSocket.off("disconnect", onDisconnect)
  }
  boundSocket = socket
  connected.value = Boolean(socket?.connected)
  socket?.on("connect", onConnect)
  socket?.on("disconnect", onDisconnect)
}, { immediate: true })

function sendAction(type, details = {}) {
  if (!canPlay.value) return
  const id = ++requestId
  pending.value = true
  actionError.value = ""
  actionTimer = setTimeout(() => {
    if (id !== requestId) return
    pending.value = false
    actionError.value = "The server did not respond. Click Rejoin game to refresh the board."
  }, 7000)
  props.socket.emit("game:minesweeper-action", {
    roomCode: props.roomCode, type, ...details,
    roundId: state.value.roundId, revision: state.value.revision,
  }, response => {
    if (id !== requestId) return
    clearTimeout(actionTimer)
    actionTimer = null
    pending.value = false
    if (response?.gameState) acceptState(response.gameState)
    if (!response?.ok) actionError.value = response?.error || "That move could not be applied."
  })
}

function clickCell(index) {
  if (isFinished.value) return
  const cell = state.value.board[index]
  sendAction(flagMode.value && !cell.revealed ? "flag" : "reveal", { index })
}
function flagCell(index) {
  if (!isFinished.value) sendAction("flag", { index })
}
function restart(difficulty = state.value?.difficulty || "beginner") {
  sendAction("new-game", { difficulty })
}
function cellLabel(cell, index) {
  const coordinate = `Row ${Math.floor(index / state.value.cols) + 1}, column ${index % state.value.cols + 1}`
  const content = cell.wrongFlag ? "incorrect flag" : cell.mine ? "mine" : cell.flagged ? "flagged" : cell.revealed ? `${cell.adjacent || 0} adjacent mines` : "unopened"
  return `${coordinate}: ${content}`
}
function cellText(cell) {
  if (cell.wrongFlag) return "×"
  if (cell.flagged) return "⚑"
  if (cell.mine) return "✹"
  return cell.revealed && cell.adjacent ? cell.adjacent : ""
}
function cellKey(event, index) {
  if (event.key.toLowerCase() === "f") {
    event.preventDefault()
    flagCell(index)
    return
  }
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.value.cols, ArrowDown: state.value.cols }
  if (!(event.key in offsets)) return
  event.preventDefault()
  const next = index + offsets[event.key]
  if (next >= 0 && next < state.value.board.length) boardRef.value?.querySelector(`[data-cell="${next}"]`)?.focus()
}
function rejoin() {
  cancelPending()
  actionError.value = ""
  emit("retry-session")
}

onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 250) })
onBeforeUnmount(() => {
  cancelPending()
  clearInterval(timer)
  boundSocket?.off("connect", onConnect)
  boundSocket?.off("disconnect", onDisconnect)
})
</script>

<template>
  <section class="mines-game">
    <header class="mines-header">
      <div>
        <p class="eyebrow">GAME 4 · MINESWEEPER</p>
        <h2>A little focus.<br />A clear board.</h2>
        <p class="subtitle">One player. Everyone can follow along.</p>
      </div>
      <button class="button quiet" type="button" @click="emit('back-to-library')">← Game Library</button>
    </header>

    <div class="toolbar">
      <div class="difficulties" aria-label="Difficulty">
        <button v-for="item in [{ id: 'beginner', label: 'Beginner' }, { id: 'intermediate', label: 'Intermediate' }, { id: 'expert', label: 'Expert' }]"
          :key="item.id" type="button" :class="{ selected: state?.difficulty === item.id }"
          :disabled="!canPlay" :aria-pressed="state?.difficulty === item.id" @click="restart(item.id)">{{ item.label }}</button>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="button" :class="{ 'flag-selected': flagMode }" :disabled="!isPlayer"
          :aria-pressed="flagMode" @click="flagMode = !flagMode">⚑ {{ flagMode ? 'Flag mode' : 'Reveal mode' }}</button>
        <button type="button" class="button primary" :disabled="!canPlay" @click="restart()">↻ New game</button>
      </div>
    </div>

    <div class="scorebar">
      <div><small>MINES LEFT</small><strong>{{ state?.minesRemaining ?? '—' }}</strong></div>
      <div><small>TIME</small><strong>{{ timeLabel }}</strong></div>
      <div><small>SAFE SQUARES</small><strong>{{ state?.revealedCount ?? 0 }}<span> / {{ state ? state.rows * state.cols - state.mineCount : '—' }}</span></strong></div>
      <div><small>ROOM</small><strong class="role-text">{{ isPlayer ? 'Playing' : 'Watching' }}<span> · {{ session?.spectatorCount ?? 0 }} watching</span></strong></div>
    </div>

    <div class="status-line" :class="state?.status" role="status" aria-live="polite">
      <span class="status-dot"></span><strong>{{ statusTitle }}</strong>
      <span v-if="pending" class="muted">Updating…</span>
      <button v-if="connected && session && !player && !pending" type="button" class="button" @click="emit('take-seat')">Take player seat</button>
    </div>
    <div v-if="sessionError || actionError || !connected" class="notice" role="alert">
      <span>{{ sessionError || actionError || 'Waiting for the connection to return.' }}</span>
      <button type="button" class="button" :disabled="!connected" @click="rejoin">Rejoin game</button>
    </div>

    <div v-if="state" class="board-scroll" tabindex="0" aria-label="Scrollable Minesweeper board">
      <div ref="boardRef" class="mine-board" :style="{ gridTemplateColumns: `repeat(${state.cols}, var(--cell-size))` }"
        role="group" aria-label="Minesweeper board" :aria-busy="pending">
        <button v-for="(cell, index) in state.board" :key="`${state.roundId}-${index}`" type="button" class="cell"
          :data-cell="index" :class="{ revealed: cell.revealed, flagged: cell.flagged, mine: cell.mine, exploded: cell.exploded, wrong: cell.wrongFlag, [`n${cell.adjacent}`]: cell.revealed }"
          :aria-label="cellLabel(cell, index)" :aria-disabled="!canPlay || isFinished"
          @click="clickCell(index)" @contextmenu.prevent="flagCell(index)" @keydown="cellKey($event, index)">{{ cellText(cell) }}</button>
      </div>
    </div>
    <div v-else class="empty-board">Your board will appear here when the game session connects.</div>

    <footer class="instructions">
      <p><strong>How to play</strong> Click to reveal. Right-click or press F on a square to flag. On touch screens, switch to Flag mode.</p>
      <p>Your first reveal and its neighbors are safe. Click an open number again to clear its neighbors when the matching number of flags is placed. Incorrect flags can still trigger a mine.</p>
      <p v-if="isPlayer">Changing difficulty or choosing New game starts a fresh round for everyone watching.</p>
    </footer>
  </section>
</template>

<style scoped>
.mines-game { --cell-size: 34px; width: 100%; min-width: 0; box-sizing: border-box; padding: clamp(18px, 3vw, 38px); color: #172133; text-align: left; font-family: inherit; }
.mines-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
.eyebrow { margin: 0 0 12px; font-size: 11px; letter-spacing: .17em; font-weight: 800; color: #64748b; }
h2 { margin: 0; font-size: clamp(27px, 3.2vw, 40px); line-height: 1.12; letter-spacing: -.045em; font-weight: 800; }
.subtitle { margin: 12px 0 0; color: #64748b; font-size: 13px; }
.toolbar, .toolbar-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.toolbar { justify-content: space-between; margin-bottom: 18px; }
.difficulties { display: flex; flex-wrap: wrap; padding: 4px; gap: 3px; background: #eaf0f6; border-radius: 14px; }
.difficulties button { border: 0; background: transparent; border-radius: 10px; color: #526176; padding: 10px 13px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.difficulties .selected { color: #146be0; background: #fff; box-shadow: 0 2px 7px #1721330d; }
.button { border: 1px solid #dce5ef; border-radius: 12px; background: #ffffffd9; color: #42516a; padding: 10px 14px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.primary { color: white; background: #087df1; border-color: #087df1; }
.flag-selected { color: #0c64cc; border-color: #83b9ff; background: #eaf4ff; }
button:disabled { cursor: default; opacity: .5; }
button:focus-visible, .board-scroll:focus-visible { outline: 3px solid #1688f8; outline-offset: 3px; }
.scorebar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid #e1e9f1; background: #ffffffb8; border-radius: 18px; padding: 18px 12px; gap: 12px; }
.scorebar > div { padding: 0 10px; }
.scorebar small { display: block; font-size: 9px; font-weight: 800; letter-spacing: .1em; color: #748198; margin-bottom: 7px; }
.scorebar strong { display: block; font-size: 24px; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
.scorebar strong span { font-size: 12px; letter-spacing: 0; color: #748198; font-weight: 500; }
.scorebar .role-text { font-size: 15px; letter-spacing: -.02em; line-height: 1.8; }
.status-line { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; min-height: 48px; padding: 8px 2px; font-size: 12px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #1688f8; flex: 0 0 auto; }
.won .status-dot { background: #179665; }.lost .status-dot { background: #e45858; }
.muted { color: #748198; }.notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-radius: 12px; background: #fff4dc; color: #795715; padding: 12px; margin-bottom: 14px; font-size: 12px; }
.board-scroll { max-width: 100%; overflow: auto; padding: 16px; border: 1px solid #e0e8f1; border-radius: 20px; box-sizing: border-box; background: #edf2f7b3; }
.mine-board { display: grid; gap: 4px; width: max-content; margin: 0 auto; }
.cell { width: var(--cell-size); height: var(--cell-size); border: 1px solid #d5e0ed; border-radius: 7px; background: linear-gradient(#fff, #f0f6fc); box-shadow: 0 2px 2px #17213308; color: #253b57; font: inherit; font-size: 16px; font-weight: 800; text-align: center; padding: 0; cursor: pointer; touch-action: manipulation; user-select: none; }
.cell:hover { border-color: #70adf2; background: #e6f1ff; }.cell.revealed { background: #e5ecf3; border-color: #e1e8f0; box-shadow: none; }.cell.flagged { color: #d08016; background: #fff9e9; }.cell.mine { color: #b74b53; }.cell.exploded { background: #fbd6da; border-color: #e997a2; }.cell.wrong { color: #d34552; }
.cell.n1 { color: #1675d2; }.cell.n2 { color: #248458; }.cell.n3 { color: #d14e58; }.cell.n4 { color: #7852b6; }.cell.n5 { color: #a65530; }.cell.n6 { color: #148990; }.cell.n7 { color: #333b4c; }.cell.n8 { color: #697386; }
.instructions { margin-top: 20px; color: #6b7a90; font-size: 12px; line-height: 1.7; }.instructions p { margin: 7px 0; }.instructions strong { color: #34445c; margin-right: 8px; }.empty-board { padding: 64px 20px; text-align: center; color: #748198; border-radius: 20px; background: #edf2f7; font-size: 13px; }
@media (max-width: 680px) { .scorebar { grid-template-columns: repeat(2, minmax(0, 1fr)); }.mines-header { flex-wrap: wrap; }.mines-game { --cell-size: 30px; }.board-scroll { padding: 10px; }.mine-board { gap: 3px; } }
</style>
