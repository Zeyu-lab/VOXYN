<script setup>
/* =========================================================
   SECTION 1: Props / Emits
========================================================= */
const props = defineProps({
  game: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(["launch-game"])

/* =========================================================
   SECTION 2: Actions
========================================================= */
function launchGame(mode) {
  emit("launch-game", {
    gameId: props.game.id,
    gameTitle: props.game.title,
    gameNumber: props.game.number,
    mode: mode.toLowerCase(),
    modeLabel: mode,
    ready: props.game.ready
  })
}
</script>

<template>
  <article
    class="game-card"
    :class="{ ready: game.ready }"
  >
    <div
      class="game-cover"
      :class="`cover-${game.cover}`"
    >
      <span
        v-if="game.ready"
        class="ready-badge"
      >
        Ready
      </span>

      <div class="cover-shape one"></div>
      <div class="cover-shape two"></div>
      <div class="cover-line"></div>
    </div>

    <div class="game-content">
      <p>{{ game.number }}</p>
      <h3>{{ game.title }}</h3>
      <span>{{ game.subtitle }}</span>
    </div>

    <div class="mode-row">
      <button
        v-for="mode in game.modes"
        :key="`${game.id}-${mode}`"
        type="button"
        class="mode-btn"
        :class="mode.toLowerCase()"
        @click="launchGame(mode)"
      >
        {{ mode === "AI" ? "🤖" : "👥" }}
        {{ mode }}
      </button>
    </div>

    <div class="game-meta">
      <span>● {{ game.players }}</span>
      <strong>{{ game.ready ? "Playable" : "Preview" }}</strong>
    </div>
  </article>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Card Shell
========================================================= */
.game-card {
  min-width: 0;
  min-height: 310px;
  padding: 14px;

  display: flex;
  flex-direction: column;

  border-radius: 21px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.42)),
    rgba(2, 6, 23, 0.44);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 20px 58px rgba(2, 6, 23, 0.32);

  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.game-card:hover {
  transform: translateY(-3px);
  border-color: rgba(96, 165, 250, 0.56);
}

.game-card.ready {
  border-color: rgba(96, 165, 250, 0.34);
}

/* =========================================================
   SECTION 2: Cover Art
========================================================= */
.game-cover {
  height: 126px;
  border-radius: 17px;
  position: relative;
  overflow: hidden;

  background:
    radial-gradient(circle at 50% 50%, rgba(96, 165, 250, 0.35), transparent 42%),
    linear-gradient(135deg, #020617, #172554);
}

.game-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 30%, rgba(96, 165, 250, 0.42), transparent 24%),
    radial-gradient(circle at 82% 70%, rgba(168, 85, 247, 0.38), transparent 26%),
    repeating-linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.09) 0,
      rgba(96, 165, 250, 0.09) 1px,
      transparent 1px,
      transparent 34px
    );
}

.cover-shape {
  position: absolute;
  width: 62px;
  height: 62px;
  top: 32px;

  border-radius: 18px;
  border: 2px solid rgba(147, 197, 253, 0.78);
  box-shadow: 0 0 24px rgba(96, 165, 250, 0.72);
}

.cover-shape.one {
  left: 36px;
  transform: rotate(45deg);
}

.cover-shape.two {
  right: 36px;
  transform: rotate(45deg);
  border-color: rgba(216, 180, 254, 0.86);
  box-shadow: 0 0 26px rgba(168, 85, 247, 0.7);
}

.cover-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 112px;
  height: 3px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa, white, #a855f7);
  box-shadow: 0 0 24px rgba(96, 165, 250, 0.9);
}

.cover-grid .cover-shape {
  transform: rotate(0);
  border-radius: 10px;
}

.cover-orbit .cover-shape.one {
  width: 116px;
  height: 58px;
  border-radius: 999px;
  transform: rotate(-20deg);
}

.cover-orbit .cover-shape.two {
  width: 138px;
  height: 72px;
  border-radius: 999px;
  transform: rotate(18deg);
}

.cover-hex .cover-shape {
  border-radius: 8px;
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  transform: rotate(0);
}

.ready-badge {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 4;

  padding: 5px 9px;
  border-radius: 999px;

  background: rgba(34, 197, 94, 0.16);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #bbf7d0;

  font-size: 11px;
  font-weight: 950;
}

/* =========================================================
   SECTION 3: Text
========================================================= */
.game-content {
  padding: 14px 2px 0;
}

.game-content p {
  margin: 0 0 4px;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 950;
}

.game-content h3 {
  margin: 0 0 5px;
  color: white;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.game-content span {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 750;
}

/* =========================================================
   SECTION 4: Mode Buttons
========================================================= */
.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 16px;
}

.mode-btn {
  min-height: 40px;
  padding: 0 15px;

  border: none;
  border-radius: 12px;

  color: white;
  background: linear-gradient(135deg, #2563eb, #3b82f6);

  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;

  transition:
    transform 0.16s ease,
    filter 0.16s ease;
}

.mode-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.mode-btn.multiplayer {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
}

/* =========================================================
   SECTION 5: Meta
========================================================= */
.game-meta {
  margin-top: auto;
  padding-top: 15px;

  display: flex;
  justify-content: space-between;
  gap: 10px;

  border-top: 1px solid rgba(148, 163, 184, 0.14);

  color: #94a3b8;
  font-size: 12px;
  font-weight: 850;
}

.game-meta strong {
  color: #60a5fa;
}
</style>