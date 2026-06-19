<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"

/* =========================================================
   SECTION 1: Emits
   ========================================================= */

const emit = defineEmits(["close", "verified"])

/* =========================================================
   SECTION 2: Verification Config
   ========================================================= */

const VERIFY_TIMEOUT_MS = 5000

const PIECE_SIZE = 58
const PUZZLE_PADDING = 24
const THUMB_SIZE = 54
const TOLERANCE = 12

/* =========================================================
   SECTION 3: Template Refs
   ========================================================= */

const puzzleRef = ref(null)
const trackRef = ref(null)

/* =========================================================
   SECTION 4: Challenge State
   ========================================================= */

const puzzleWidth = ref(0)
const trackWidth = ref(0)

const targetX = ref(0)
const dragX = ref(0)

const isDragging = ref(false)
const status = ref("idle") // idle | success | failed

let activePointerId = null
let grabOffsetX = 0

let timeoutId = null
let resetId = null
let rafId = null
let pendingDragX = null

/* =========================================================
   SECTION 5: Derived Position Values
   ========================================================= */

const maxDragX = computed(() => {
  return Math.max(0, trackWidth.value - THUMB_SIZE)
})

const maxPuzzleTravel = computed(() => {
  return Math.max(0, puzzleWidth.value - PIECE_SIZE - PUZZLE_PADDING * 2)
})

const pieceX = computed(() => {
  if (maxDragX.value <= 0) return PUZZLE_PADDING

  const progress = dragX.value / maxDragX.value
  return PUZZLE_PADDING + progress * maxPuzzleTravel.value
})

const trackFillWidth = computed(() => {
  return Math.min(trackWidth.value, dragX.value + THUMB_SIZE / 2)
})

const helperText = computed(() => {
  if (status.value === "success") return "Verified. Sending email code..."
  if (status.value === "failed") return "Verification failed. Try again."
  if (isDragging.value) return "Release when aligned"

  return "Slide to match the square"
})

/* =========================================================
   SECTION 6: Utility Helpers
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function measureLayout() {
  puzzleWidth.value = puzzleRef.value?.clientWidth || 0
  trackWidth.value = trackRef.value?.clientWidth || 0
}

function createRandomTargetX() {
  const maxX = Math.max(
    PUZZLE_PADDING,
    puzzleWidth.value - PIECE_SIZE - PUZZLE_PADDING
  )

  const preferredMinX = Math.round(puzzleWidth.value * 0.52)
  const minX = Math.min(
    maxX,
    Math.max(PUZZLE_PADDING + 90, preferredMinX)
  )

  if (maxX <= minX) return maxX

  return Math.floor(Math.random() * (maxX - minX + 1)) + minX
}

function clearTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  if (resetId) {
    clearTimeout(resetId)
    resetId = null
  }
}

function clearAnimationFrame() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  pendingDragX = null
}

function stopDragging() {
  isDragging.value = false
  activePointerId = null

  window.removeEventListener("pointermove", onPointerMove)
  window.removeEventListener("pointerup", onPointerUp)
  window.removeEventListener("pointercancel", onPointerCancel)
}

function flushPendingDrag() {
  if (pendingDragX !== null) {
    dragX.value = pendingDragX
  }

  clearAnimationFrame()
}

/* =========================================================
   SECTION 7: Internal Timer
   ========================================================= */

function startInternalTimer() {
  if (timeoutId) clearTimeout(timeoutId)

  timeoutId = setTimeout(() => {
    if (status.value === "success") return
    failChallenge()
  }, VERIFY_TIMEOUT_MS)
}

/* =========================================================
   SECTION 8: Challenge Lifecycle
   ========================================================= */

async function resetChallenge() {
  clearTimers()
  clearAnimationFrame()
  stopDragging()

  status.value = "idle"
  dragX.value = 0

  await nextTick()

  measureLayout()
  targetX.value = createRandomTargetX()

  startInternalTimer()
}

function failChallenge() {
  if (status.value === "success") return

  clearAnimationFrame()
  stopDragging()

  status.value = "failed"
  dragX.value = 0

  resetId = setTimeout(() => {
    resetChallenge()
  }, 720)
}

function verifyChallenge() {
  const distance = Math.abs(pieceX.value - targetX.value)

  if (distance <= TOLERANCE) {
    clearTimers()
    clearAnimationFrame()
    stopDragging()

    status.value = "success"

    setTimeout(() => {
      emit("verified")
    }, 420)

    return
  }

  failChallenge()
}

/* =========================================================
   SECTION 9: Drag Logic
   ========================================================= */

function scheduleDragX(nextX) {
  pendingDragX = clamp(nextX, 0, maxDragX.value)

  if (rafId) return

  rafId = requestAnimationFrame(() => {
    dragX.value = pendingDragX ?? dragX.value
    rafId = null
    pendingDragX = null
  })
}

function getDragXFromPointer(event) {
  const trackRect = trackRef.value?.getBoundingClientRect()

  if (!trackRect) return dragX.value

  return event.clientX - trackRect.left - grabOffsetX
}

function onPointerDown(event) {
  if (status.value !== "idle") return

  const thumbRect = event.currentTarget.getBoundingClientRect()

  activePointerId = event.pointerId
  grabOffsetX = event.clientX - thumbRect.left
  isDragging.value = true

  event.currentTarget.setPointerCapture?.(event.pointerId)

  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerCancel)
}

function onPointerMove(event) {
  if (!isDragging.value) return
  if (activePointerId !== null && event.pointerId !== activePointerId) return

  scheduleDragX(getDragXFromPointer(event))
}

function onPointerUp(event) {
  if (!isDragging.value) return
  if (activePointerId !== null && event.pointerId !== activePointerId) return

  flushPendingDrag()
  stopDragging()
  verifyChallenge()
}

function onPointerCancel() {
  failChallenge()
}

/* =========================================================
   SECTION 10: Close Handler
   ========================================================= */

function handleClose() {
  clearTimers()
  clearAnimationFrame()
  stopDragging()

  emit("close")
}

/* =========================================================
   SECTION 11: Lifecycle
   ========================================================= */

onMounted(() => {
  resetChallenge()
  window.addEventListener("resize", resetChallenge)
})

onBeforeUnmount(() => {
  clearTimers()
  clearAnimationFrame()
  stopDragging()

  window.removeEventListener("resize", resetChallenge)
})
</script>

<template>
  <div class="voxyn-verify-overlay">
    <section class="voxyn-verify-modal">
      <!-- =====================================================
           SECTION 1: Close Button
           ===================================================== -->

      <button class="verify-close" type="button" @click="handleClose">
        ×
      </button>

      <!-- =====================================================
           SECTION 2: Header
           ===================================================== -->

      <div class="verify-icon">
        ◆
      </div>

      <h2>Security Check</h2>

      <p class="verify-subtitle">
        Drag the square into the matching slot to continue.
      </p>

      <!-- =====================================================
           SECTION 3: Puzzle Area
           ===================================================== -->

      <div
        ref="puzzleRef"
        class="verify-puzzle"
        :class="{
          'is-success': status === 'success',
          'is-failed': status === 'failed'
        }"
      >
        <div
          class="target-slot"
          :style="{
            transform: `translate3d(${targetX}px, -50%, 0)`
          }"
        />

        <div
          class="puzzle-piece"
          :style="{
            transform: `translate3d(${pieceX}px, -50%, 0)`
          }"
        >
          <span>◆</span>
        </div>

        <div class="puzzle-light" />
      </div>

      <!-- =====================================================
        SECTION 4: Slider Control
        ===================================================== -->

        <div class="verify-slider-wrap">
            <div ref="trackRef" class="verify-track">
                <div
                class="verify-track-fill"
                :style="{ width: `${trackFillWidth}px` }"
            />

            <button
                class="verify-thumb"
                type="button"
                :class="{ dragging: isDragging }"
                :style="{
                    transform: `translate3d(${dragX}px, 0, 0)`
                }"
                @pointerdown.prevent="onPointerDown"
            >
                <span class="thumb-arrow">›</span>
                <span class="thumb-shine" />
            </button>
        </div>

            <p
                class="verify-helper"
                :class="{
                    success: status === 'success',
                    failed: status === 'failed'
                }"
            >
                {{ helperText }}
            </p>
        </div>

      

      <!-- =====================================================
           SECTION 5: Footer
           ===================================================== -->

      <div class="verify-divider" />

      <button class="verify-cancel" type="button" @click="handleClose">
        Cancel
      </button>

      <p class="verify-note">
        Email verification will be sent after successful verification.
      </p>
    </section>
  </div>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Overlay
   ========================================================= */

.voxyn-verify-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 18%, rgba(124, 92, 255, 0.12), transparent 34%),
    rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* =========================================================
   SECTION 2: Modal
   ========================================================= */

.voxyn-verify-modal {
  position: relative;
  width: min(460px, 100%);
  padding: 34px 34px 28px;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.93), rgba(245, 248, 255, 0.8)),
    radial-gradient(circle at 82% 18%, rgba(109, 90, 255, 0.12), transparent 38%);
  box-shadow:
    0 30px 80px rgba(20, 35, 80, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  color: #0f172a;
  overflow: hidden;
}

.voxyn-verify-modal::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.72), transparent 38%),
    radial-gradient(circle at 12% 100%, rgba(67, 127, 255, 0.1), transparent 36%);
}

/* =========================================================
   SECTION 3: Header
   ========================================================= */

.verify-close {
  position: absolute;
  top: 16px;
  right: 18px;
  z-index: 2;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #64748b;
  font-size: 30px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgba(148, 163, 184, 0.22);
}

.verify-icon {
  position: relative;
  z-index: 1;
  width: 58px;
  height: 58px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 18px;
  background: linear-gradient(135deg, #3b82f6, #7057ff);
  box-shadow:
    0 16px 34px rgba(80, 92, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

h2 {
  position: relative;
  z-index: 1;
  margin: 0;
  text-align: center;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.055em;
  color: #0f172a;
}

.verify-subtitle {
  position: relative;
  z-index: 1;
  margin: 10px auto 26px;
  text-align: center;
  max-width: 330px;
  font-size: 15px;
  font-weight: 760;
  line-height: 1.38;
  color: #64748b;
}

/* =========================================================
   SECTION 4: Puzzle
   ========================================================= */

.verify-puzzle {
  position: relative;
  z-index: 1;
  height: 270px;
  border-radius: 30px;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background:
    radial-gradient(circle at 25% 70%, rgba(97, 123, 255, 0.16), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 255, 0.72));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 18px 46px rgba(64, 84, 150, 0.12);
}

.verify-puzzle::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.62;
  background-image:
    radial-gradient(rgba(93, 115, 255, 0.16) 1.4px, transparent 1.4px);
  background-size: 20px 20px;
  mask-image: linear-gradient(110deg, black, transparent 64%);
}

.verify-puzzle::after {
  content: "";
  position: absolute;
  inset: -40px -70px;
  opacity: 0.48;
  background:
    radial-gradient(circle at 15% 85%, rgba(255, 255, 255, 0.92), transparent 28%),
    linear-gradient(145deg, transparent 42%, rgba(255, 255, 255, 0.66), transparent 64%);
  transform: rotate(-7deg);
}

.target-slot {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 2;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  border: 3px dashed rgba(104, 84, 255, 0.58);
  background: rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 10px 24px rgba(104, 84, 255, 0.08);
  pointer-events: none;
  will-change: transform;
}

.puzzle-piece {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 3;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  color: white;
  font-size: 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #725cff 100%);
  box-shadow:
    0 20px 38px rgba(71, 85, 255, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.46);
  pointer-events: none;
  will-change: transform;
}

.puzzle-piece span {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12));
}

.puzzle-light {
  position: absolute;
  left: 70px;
  right: 70px;
  top: 50%;
  height: 90px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(103, 92, 255, 0.14), transparent 68%);
  z-index: 1;
  pointer-events: none;
}

.verify-puzzle.is-success {
  border-color: rgba(34, 197, 94, 0.42);
  box-shadow:
    inset 0 0 0 1px rgba(34, 197, 94, 0.15),
    0 18px 46px rgba(34, 197, 94, 0.12);
}

.verify-puzzle.is-failed {
  border-color: rgba(239, 68, 68, 0.3);
  animation: verifyShake 0.28s ease;
}
/* =========================================================
   SECTION 4: Puzzle
   ========================================================= */

.verify-puzzle {
  position: relative;
  z-index: 1;
  height: 205px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background:
    radial-gradient(circle at 25% 70%, rgba(97, 123, 255, 0.16), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 255, 0.72));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 16px 38px rgba(64, 84, 150, 0.1);
}

.verify-puzzle::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.58;
  background-image:
    radial-gradient(rgba(93, 115, 255, 0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: linear-gradient(110deg, black, transparent 64%);
}

.verify-puzzle::after {
  content: "";
  position: absolute;
  inset: -40px -70px;
  opacity: 0.44;
  background:
    radial-gradient(circle at 15% 85%, rgba(255, 255, 255, 0.92), transparent 28%),
    linear-gradient(145deg, transparent 42%, rgba(255, 255, 255, 0.66), transparent 64%);
  transform: rotate(-7deg);
}

.target-slot {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 2;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  border: 2.5px dashed rgba(104, 84, 255, 0.58);
  background: rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 10px 24px rgba(104, 84, 255, 0.08);
  pointer-events: none;
  will-change: transform;
}

.puzzle-piece {
  position: absolute;
  top: 50%;
  left: 0;
  z-index: 3;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #725cff 100%);
  box-shadow:
    0 18px 34px rgba(71, 85, 255, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.46);
  pointer-events: none;
  will-change: transform;
}

.puzzle-piece span {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12));
}

.puzzle-light {
  position: absolute;
  left: 56px;
  right: 56px;
  top: 50%;
  height: 70px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(103, 92, 255, 0.14), transparent 68%);
  z-index: 1;
  pointer-events: none;
}

.verify-puzzle.is-success {
  border-color: rgba(34, 197, 94, 0.42);
  box-shadow:
    inset 0 0 0 1px rgba(34, 197, 94, 0.15),
    0 18px 46px rgba(34, 197, 94, 0.12);
}

.verify-puzzle.is-failed {
  border-color: rgba(239, 68, 68, 0.3);
  animation: verifyShake 0.28s ease;
}
/* =========================================================
   SECTION 5: Slider
   ========================================================= */

.verify-slider-wrap {
  position: relative;
  z-index: 1;
  margin-top: 24px;
}

.verify-track {
  position: relative;
  height: 56px;
  border-radius: 999px;
  touch-action: none;
  user-select: none;
}

/* Track base */
.verify-track::before {
  content: "";
  position: absolute;
  left: 28px;
  right: 0;
  top: 18px;
  height: 20px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(226, 232, 240, 0.9), rgba(203, 213, 225, 0.74));
  box-shadow:
    inset 0 2px 5px rgba(15, 23, 42, 0.16),
    inset 0 -1px 0 rgba(255, 255, 255, 0.76),
    0 10px 24px rgba(99, 102, 241, 0.08);
}

/* Filled progress */
.verify-track-fill {
  position: absolute;
  left: 28px;
  top: 18px;
  height: 20px;
  max-width: calc(100% - 28px);
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(59, 130, 246, 0.42), rgba(112, 87, 255, 0.48));
  box-shadow:
    0 0 22px rgba(99, 102, 241, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

/* Slider thumb */
.verify-thumb {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  left: 0;
  top: 1px;
  width: 56px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  cursor: grab;
  color: #4f46e5;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 255, 0.9));
  box-shadow:
    0 16px 30px rgba(69, 88, 255, 0.24),
    0 6px 12px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgba(99, 102, 241, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  touch-action: none;
  user-select: none;
  will-change: transform;
  overflow: hidden;
}

.verify-thumb::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: inherit;
  background:
    radial-gradient(circle at 35% 20%, rgba(255, 255, 255, 0.96), transparent 42%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(238, 242, 255, 0.5));
  pointer-events: none;
}

.verify-thumb::after {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.14), transparent 58%);
  opacity: 0;
  transition: opacity 0.16s ease;
  pointer-events: none;
}

.verify-thumb:hover::after,
.verify-thumb.dragging::after {
  opacity: 1;
}

.verify-thumb.dragging {
  cursor: grabbing;
  box-shadow:
    0 18px 34px rgba(69, 88, 255, 0.3),
    0 8px 16px rgba(15, 23, 42, 0.1),
    inset 0 0 0 1px rgba(99, 102, 241, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.thumb-arrow {
  position: relative;
  z-index: 2;
  display: block;
  transform: translateY(-1px);
  font-size: 38px;
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.08em;
  color: #4f46e5;
  text-shadow:
    0 8px 18px rgba(79, 70, 229, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.75);
  pointer-events: none;
}

.thumb-shine {
  position: absolute;
  top: 7px;
  left: 12px;
  width: 24px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  filter: blur(0.2px);
  opacity: 0.7;
  pointer-events: none;
}

.verify-helper {
  margin: 12px 0 0;
  text-align: center;
  min-height: 20px;
  font-size: 14px;
  font-weight: 850;
  color: #64748b;
}

.verify-helper.success {
  color: #16a34a;
}

.verify-helper.failed {
  color: #ef4444;
}

/* =========================================================
   SECTION 6: Footer
   ========================================================= */

.verify-divider {
  position: relative;
  z-index: 1;
  height: 1px;
  margin: 22px 0 16px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(148, 163, 184, 0.34),
    transparent
  );
}

.verify-cancel {
  position: relative;
  z-index: 1;
  display: block;
  margin: 0 auto;
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}

.verify-note {
  position: relative;
  z-index: 1;
  margin: 20px 0 0;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
}

/* =========================================================
   SECTION 7: Animations
   ========================================================= */

@keyframes verifyShake {
  0%,
  100% {
    transform: translateX(0);
  }

  30% {
    transform: translateX(-6px);
  }

  70% {
    transform: translateX(6px);
  }
}
/* =========================================================
   SECTION 8: Responsive
   ========================================================= */

@media (max-width: 520px) {
  .voxyn-verify-overlay {
    padding: 16px;
  }

  .voxyn-verify-modal {
    width: 100%;
    padding: 30px 22px 24px;
    border-radius: 28px;
  }

  .verify-close {
    width: 34px;
    height: 34px;
    font-size: 26px;
  }

  .verify-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 25px;
  }

  .verify-subtitle {
    font-size: 14px;
    margin-bottom: 22px;
  }

  .verify-puzzle {
    height: 185px;
    border-radius: 20px;
  }

  .verify-helper {
    font-size: 13px;
  }

  .verify-cancel {
    font-size: 14px;
  }

  .verify-note {
    font-size: 11.5px;
  }
}

</style>