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
   SECTION 1: Card Shell - White Liquid Glass
   Notes:
   - Style-only change
   - No props / emits / launch logic changed
========================================================= */
.game-card {
  min-width: 0;
  min-height: 310px;
  padding: 14px;

  display: flex;
  flex-direction: column;

  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.56)),
    rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow:
    0 20px 54px rgba(30, 64, 175, 0.10),
    0 4px 18px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.26);
  box-shadow:
    0 26px 68px rgba(30, 64, 175, 0.16),
    0 8px 24px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.game-card.ready {
  border-color: rgba(59, 130, 246, 0.28);
}

/* =========================================================
   SECTION 2: Cover Art - Soft Apple Glass Graphic
========================================================= */
.game-cover {
  height: 126px;
  border-radius: 20px;
  position: relative;
  overflow: hidden;

  background:
    radial-gradient(circle at 25% 18%, rgba(59, 130, 246, 0.26), transparent 34%),
    radial-gradient(circle at 82% 70%, rgba(168, 85, 247, 0.18), transparent 36%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(232, 240, 255, 0.74));
  border: 1px solid rgba(255, 255, 255, 0.86);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 30px rgba(59, 130, 246, 0.10);
}

.game-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 35%, rgba(96, 165, 250, 0.28), transparent 24%),
    radial-gradient(circle at 78% 62%, rgba(196, 181, 253, 0.26), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(37, 99, 235, 0.04));
}

.game-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 10%, rgba(255, 255, 255, 0.42) 46%, transparent 72%);
  transform: translateX(-42%);
  opacity: 0.45;
}

.cover-shape {
  position: absolute;
  width: 62px;
  height: 62px;
  top: 32px;
  z-index: 2;

  border-radius: 18px;
  background: rgba(255, 255, 255, 0.34);
  border: 2px solid rgba(96, 165, 250, 0.48);
  box-shadow:
    0 14px 36px rgba(59, 130, 246, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cover-shape.one {
  left: 36px;
  transform: rotate(45deg);
}

.cover-shape.two {
  right: 36px;
  transform: rotate(45deg);
  border-color: rgba(168, 85, 247, 0.42);
  box-shadow:
    0 14px 36px rgba(168, 85, 247, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.cover-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 112px;
  height: 3px;
  z-index: 3;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa, rgba(255,255,255,0.96), #a78bfa);
  box-shadow: 0 0 24px rgba(96, 165, 250, 0.42);
}

.cover-grid .cover-shape {
  transform: rotate(0);
  border-radius: 12px;
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
  z-index: 5;

  padding: 5px 10px;
  border-radius: 999px;

  background: rgba(52, 199, 89, 0.14);
  border: 1px solid rgba(52, 199, 89, 0.22);
  color: #16803a;
  box-shadow: 0 8px 18px rgba(52, 199, 89, 0.10);

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
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.game-content h3 {
  margin: 0 0 5px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.game-content span {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
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

  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 13px;

  color: #ffffff;
  background: linear-gradient(135deg, #0a84ff, #3b82f6);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);

  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;

  transition:
    transform 0.16s ease,
    filter 0.16s ease,
    box-shadow 0.16s ease;
}

.mode-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);
}

.mode-btn.ai,
.mode-btn.single,
.mode-btn.player {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.10);
  border-color: rgba(37, 99, 235, 0.14);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
}

.mode-btn.multiplayer {
  background: linear-gradient(135deg, #0a84ff, #4f46e5);
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

  border-top: 1px solid rgba(15, 23, 42, 0.07);

  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.game-meta strong {
  color: #2563eb;
}
</style>