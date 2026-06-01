<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Keep this component frontend-only for local mic test
========================================================= */
import { computed, onBeforeUnmount, ref } from "vue"

/* =========================================================
   SECTION 2: Component Events
   Purpose:
   - Leave small hooks for future backend voice status sync
   - Parent does not need to listen yet
========================================================= */
const emit = defineEmits([
  "mic-test-start",
  "mic-test-stop",
  "speaking-change"
])

/* =========================================================
   SECTION 3: Voice Test State
   Purpose:
   - Store microphone permission
   - Store mic level
   - Store speaking / silent state
========================================================= */
const micTesting = ref(false)
const micPermission = ref("Not tested")
const micStatus = ref("Idle")
const micLevel = ref(0)
const peakLevel = ref(0)
const isSpeaking = ref(false)
const errorMessage = ref("")

const speakingThreshold = 12

let micStream = null
let audioContext = null
let analyser = null
let sourceNode = null
let micAnimationFrame = null

/* =========================================================
   SECTION 4: Display Helpers
   Purpose:
   - Format UI labels
   - Build level bar display
========================================================= */
const statusLabel = computed(() => {
  if (errorMessage.value) return "Error"
  if (!micTesting.value) return micStatus.value
  return isSpeaking.value ? "Speaking" : "Silent"
})

const activeBars = computed(() => {
  return Math.min(Math.ceil((micLevel.value / 100) * 14), 14)
})

const permissionClass = computed(() => {
  if (micPermission.value === "Allowed") return "good"
  if (micPermission.value === "Denied") return "bad"
  if (micPermission.value === "Unsupported") return "bad"
  return "neutral"
})

const statusClass = computed(() => {
  if (errorMessage.value) return "bad"
  if (isSpeaking.value) return "good"
  if (micTesting.value) return "neutral"
  return "neutral"
})

/* =========================================================
   SECTION 5: Lifecycle
   Purpose:
   - Stop microphone when user leaves page/component
========================================================= */
onBeforeUnmount(() => {
  stopMicTest()
})

/* =========================================================
   SECTION 6: Start Mic Test
   Purpose:
   - Ask browser for microphone permission
   - Create audio analyser
   - Start local voice activity detection
========================================================= */
async function startMicTest() {
  errorMessage.value = ""

  if (micTesting.value) return

  if (!navigator.mediaDevices?.getUserMedia) {
    micPermission.value = "Unsupported"
    micStatus.value = "Unsupported"
    errorMessage.value = "This browser does not support microphone access."
    return
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      micPermission.value = "Unsupported"
      micStatus.value = "Unsupported"
      errorMessage.value = "This browser does not support Web Audio API."
      return
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    audioContext = new AudioContextClass()
    analyser = audioContext.createAnalyser()
    sourceNode = audioContext.createMediaStreamSource(micStream)

    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.72

    sourceNode.connect(analyser)

    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    micTesting.value = true
    micPermission.value = "Allowed"
    micStatus.value = "Listening"
    micLevel.value = 0
    peakLevel.value = 0
    isSpeaking.value = false

    emit("mic-test-start")

    runMicLevelLoop()
  } catch (error) {
    console.error("Mic test error:", error)

    micTesting.value = false
    micPermission.value = "Denied"
    micStatus.value = "Permission denied"
    micLevel.value = 0
    peakLevel.value = 0
    isSpeaking.value = false

    errorMessage.value = "Microphone permission denied or microphone is unavailable."
  }
}

/* =========================================================
   SECTION 7: Mic Level Detection
   Purpose:
   - Read microphone waveform
   - Convert RMS volume into 0-100 level
   - Detect Speaking / Silent
========================================================= */
function runMicLevelLoop() {
  if (!analyser) return

  const dataArray = new Uint8Array(analyser.fftSize)

  function updateMicLevel() {
    if (!analyser || !micTesting.value) return

    analyser.getByteTimeDomainData(dataArray)

    let sum = 0

    for (let i = 0; i < dataArray.length; i++) {
      const centeredValue = (dataArray[i] - 128) / 128
      sum += centeredValue * centeredValue
    }

    const rms = Math.sqrt(sum / dataArray.length)
    const nextLevel = Math.min(Math.round(rms * 260), 100)
    const nextSpeaking = nextLevel >= speakingThreshold

    micLevel.value = nextLevel
    peakLevel.value = Math.max(peakLevel.value, nextLevel)

    if (isSpeaking.value !== nextSpeaking) {
      isSpeaking.value = nextSpeaking
      emit("speaking-change", {
        isSpeaking: nextSpeaking,
        level: nextLevel
      })
    }

    micStatus.value = nextSpeaking ? "Speaking" : "Silent"

    micAnimationFrame = requestAnimationFrame(updateMicLevel)
  }

  updateMicLevel()
}

/* =========================================================
   SECTION 8: Stop Mic Test
   Purpose:
   - Stop animation loop
   - Stop microphone tracks
   - Close audio context
========================================================= */
function stopMicTest() {
  if (micAnimationFrame) {
    cancelAnimationFrame(micAnimationFrame)
    micAnimationFrame = null
  }

  if (sourceNode) {
    try {
      sourceNode.disconnect()
    } catch {
      // Ignore disconnect errors
    }

    sourceNode = null
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => {
      track.stop()
    })

    micStream = null
  }

  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  analyser = null

  const wasTesting = micTesting.value

  micTesting.value = false
  micLevel.value = 0
  isSpeaking.value = false

  if (micPermission.value === "Allowed") {
    micStatus.value = "Stopped"
  }

  if (wasTesting) {
    emit("speaking-change", {
      isSpeaking: false,
      level: 0
    })

    emit("mic-test-stop")
  }
}

/* =========================================================
   SECTION 9: Reset Test
   Purpose:
   - Clear UI state after test
========================================================= */
function resetMicTest() {
  stopMicTest()

  micPermission.value = "Not tested"
  micStatus.value = "Idle"
  micLevel.value = 0
  peakLevel.value = 0
  isSpeaking.value = false
  errorMessage.value = ""
}
</script>

<template>
  <section class="voice-panel">
    <!-- =====================================================
         SECTION 1: Header
    ====================================================== -->
    <div class="voice-panel-header">
      <div>
        <p>VOICE SETTINGS</p>
        <h2>Mic Test</h2>
        <span>
          Test your microphone before connecting to real voice channels.
        </span>
      </div>

      <div
        class="voice-status-orb"
        :class="{ active: micTesting, speaking: isSpeaking }"
      >
        <span></span>
      </div>
    </div>

    <!-- =====================================================
         SECTION 2: Status Cards
    ====================================================== -->
    <div class="voice-status-grid">
      <div class="status-card">
        <span>Permission</span>
        <strong :class="permissionClass">
          {{ micPermission }}
        </strong>
      </div>

      <div class="status-card">
        <span>Status</span>
        <strong :class="statusClass">
          {{ statusLabel }}
        </strong>
      </div>

      <div class="status-card">
        <span>Current Level</span>
        <strong>
          {{ micLevel }}%
        </strong>
      </div>

      <div class="status-card">
        <span>Peak Level</span>
        <strong>
          {{ peakLevel }}%
        </strong>
      </div>
    </div>

    <!-- =====================================================
         SECTION 3: Mic Level Meter
    ====================================================== -->
    <div class="mic-meter-card">
      <div class="mic-meter-top">
        <div>
          <p>Voice Activity</p>
          <h3>
            {{ isSpeaking ? "Speaking detected" : "No voice detected" }}
          </h3>
        </div>

        <span :class="{ speaking: isSpeaking }">
          {{ isSpeaking ? "LIVE" : "IDLE" }}
        </span>
      </div>

      <div class="mic-bars" aria-label="Microphone level">
        <span
          v-for="bar in 14"
          :key="bar"
          :class="{ active: bar <= activeBars }"
        ></span>
      </div>

      <div class="mic-level-track">
        <div :style="{ width: `${micLevel}%` }"></div>
      </div>

      <p class="mic-help">
        Speak normally. The level bar should move when your microphone detects sound.
      </p>
    </div>

    <!-- =====================================================
         SECTION 4: Error Message
    ====================================================== -->
    <p v-if="errorMessage" class="voice-error">
      {{ errorMessage }}
    </p>

    <!-- =====================================================
         SECTION 5: Actions
    ====================================================== -->
    <div class="voice-actions">
      <button
        v-if="!micTesting"
        class="primary-action"
        @click="startMicTest"
      >
        Start Mic Test
      </button>

      <button
        v-else
        class="danger-action"
        @click="stopMicTest"
      >
        Stop Mic Test
      </button>

      <button
        class="secondary-action"
        @click="resetMicTest"
      >
        Reset
      </button>
    </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Panel Shell
========================================================= */
.voice-panel,
.voice-panel *,
.voice-panel *::before,
.voice-panel *::after {
  box-sizing: border-box;
}

.voice-panel {
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 26px;
  color: #0f172a;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.22), transparent 34%),
    rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.07);
}

/* =========================================================
   SECTION 2: Header
========================================================= */
.voice-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.voice-panel-header p {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.28em;
}

.voice-panel-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.voice-panel-header span {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.45;
}

.voice-status-orb {
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: linear-gradient(135deg, #e2e8f0, #f8fafc);
  border: 1px solid #cbd5e1;
}

.voice-status-orb span {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 8px rgba(148, 163, 184, 0.12);
}

.voice-status-orb.active {
  background: linear-gradient(135deg, #dbeafe, #eef2ff);
  border-color: #bfdbfe;
}

.voice-status-orb.active span {
  background: #3b82f6;
  box-shadow: 0 0 0 10px rgba(59, 130, 246, 0.14);
}

.voice-status-orb.speaking {
  background: linear-gradient(135deg, #4f46e5, #38bdf8);
  border-color: transparent;
}

.voice-status-orb.speaking span {
  background: white;
  box-shadow:
    0 0 0 10px rgba(255, 255, 255, 0.18),
    0 0 34px rgba(56, 189, 248, 0.9);
}

/* =========================================================
   SECTION 3: Status Grid
========================================================= */
.voice-status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.status-card {
  min-width: 0;
  padding: 16px;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid #e2e8f0;
}

.status-card span {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-card strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
  overflow-wrap: anywhere;
}

.status-card strong.good {
  color: #16a34a;
}

.status-card strong.bad {
  color: #dc2626;
}

.status-card strong.neutral {
  color: #4f46e5;
}

/* =========================================================
   SECTION 4: Mic Meter
========================================================= */
.mic-meter-card {
  padding: 18px;
  border-radius: 22px;
  color: white;
  background:
    radial-gradient(circle at center, rgba(99, 102, 241, 0.34), transparent 38%),
    linear-gradient(135deg, #020617, #111c44);
  overflow: hidden;
}

.mic-meter-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.mic-meter-top p {
  margin: 0 0 6px;
  color: #93c5fd;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.mic-meter-top h3 {
  margin: 0;
  color: white;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.mic-meter-top span {
  min-height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
}

.mic-meter-top span.speaking {
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
}

.mic-bars {
  height: 76px;
  margin-top: 24px;
  display: flex;
  align-items: end;
  gap: 7px;
}

.mic-bars span {
  flex: 1;
  min-width: 0;
  height: 18%;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.16);
  transition:
    height 0.08s linear,
    background 0.08s linear,
    box-shadow 0.08s linear;
}

.mic-bars span:nth-child(2n) {
  height: 28%;
}

.mic-bars span:nth-child(3n) {
  height: 42%;
}

.mic-bars span.active {
  height: 100%;
  background: linear-gradient(180deg, #38bdf8, #6366f1);
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.34);
}

.mic-level-track {
  height: 10px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.18);
}

.mic-level-track div {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  transition: width 0.08s linear;
}

.mic-help {
  margin: 14px 0 0;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

/* =========================================================
   SECTION 5: Error
========================================================= */
.voice-error {
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 6: Actions
========================================================= */
.voice-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.voice-actions button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.voice-actions button:hover {
  transform: translateY(-1px);
}

.primary-action {
  border: none;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  box-shadow: 0 16px 34px rgba(79, 70, 229, 0.22);
}

.danger-action {
  border: none;
  color: white;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 16px 34px rgba(220, 38, 38, 0.18);
}

.secondary-action {
  color: #334155;
  background: white;
  border: 1px solid #cbd5e1;
}

/* =========================================================
   SECTION 7: Responsive
========================================================= */
@media (max-width: 900px) {
  .voice-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .voice-panel {
    padding: 18px;
    border-radius: 22px;
  }

  .voice-panel-header {
    align-items: flex-start;
  }

  .voice-panel-header h2 {
    font-size: 24px;
  }

  .voice-status-orb {
    width: 56px;
    height: 56px;
    flex-basis: 56px;
    border-radius: 18px;
  }

  .voice-status-grid {
    grid-template-columns: 1fr;
  }

  .voice-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .voice-actions button {
    width: 100%;
  }
}
</style>