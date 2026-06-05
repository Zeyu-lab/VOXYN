<template>
  <!-- =========================================================
       SECTION 1: Appearance Settings Card
       Purpose:
       - Prepare theme and layout options
       - Keep controls visual/local only for v0.54
  ========================================================= -->
  <section class="settings-section-card">
    <header class="section-header">
      <p class="section-kicker">APPEARANCE</p>
      <h2>Appearance</h2>
      <span>
        Tune the visual direction of VOXYN without changing the current product structure.
      </span>
    </header>

    <div class="theme-grid">
      <button
        v-for="theme in themes"
        :key="theme.id"
        class="theme-card"
        :class="{ active: selectedTheme === theme.id }"
        @click="selectedTheme = theme.id"
      >
        <span class="theme-preview" :class="theme.id"></span>
        <strong>{{ theme.label }}</strong>
        <small>{{ theme.description }}</small>
      </button>
    </div>

    <div class="settings-list">
      <div class="settings-row">
        <div>
          <h3>Compact room layout</h3>
          <p>Prepare a tighter layout option for smaller screens and laptop windows.</p>
        </div>

        <span class="status-pill">Planned</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Liquid glass intensity</h3>
          <p>Future option for controlling how strong the glass effect should be.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>
    </div>
  </section>
</template>

<script setup>
/* =========================================================
   SECTION 2: Local Appearance State
========================================================= */
import { ref } from "vue"

const selectedTheme = ref("liquid")

const themes = [
  {
    id: "liquid",
    label: "Liquid Light",
    description: "Current VOXYN glass style"
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Future darker voice-room style"
  },
  {
    id: "clean",
    label: "Clean",
    description: "Simple portfolio-safe style"
  }
]
</script>

<style scoped>
.settings-section-card {
  display: grid;
  gap: 18px;
}

.section-header,
.theme-card,
.settings-row {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
}

.section-header {
  padding: 26px;
}

.section-kicker {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.22em;
}

.section-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.section-header span {
  display: block;
  margin-top: 10px;
  color: #64748b;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.5;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.theme-card {
  min-width: 0;
  padding: 18px;
  display: grid;
  gap: 10px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.theme-card:hover,
.theme-card.active {
  transform: translateY(-2px);
  border-color: rgba(79, 70, 229, 0.36);
  box-shadow: 0 20px 46px rgba(79, 70, 229, 0.12);
}

.theme-preview {
  height: 86px;
  border-radius: 22px;
  border: 1px solid #e2e8f0;
}

.theme-preview.liquid {
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.42), transparent 40%),
    linear-gradient(135deg, #eff6ff, #ffffff);
}

.theme-preview.midnight {
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.44), transparent 42%),
    linear-gradient(135deg, #0f172a, #1e293b);
}

.theme-preview.clean {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.theme-card strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.theme-card small {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
}

.settings-list {
  display: grid;
  gap: 14px;
}

.settings-row {
  min-height: 92px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.settings-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
}

.settings-row p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}

.status-pill {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #4f46e5;
  background: #eef2ff;
  font-size: 12px;
  font-weight: 950;
}

.status-pill.muted {
  color: #64748b;
  background: #f1f5f9;
}

@media (max-width: 900px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
