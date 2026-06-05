<template>
  <!-- =========================================================
       SECTION 1: Advanced Settings Card
       Purpose:
       - Show local development and client environment info
       - Prepare future debug tools
  ========================================================= -->
  <section class="settings-section-card">
    <header class="section-header">
      <p class="section-kicker">ADVANCED</p>
      <h2>Advanced</h2>
      <span>
        Development information for testing VOXYN rooms, sockets, voice, and deployment behavior.
      </span>
    </header>

    <div class="debug-grid">
      <div class="debug-card">
        <small>Client Origin</small>
        <strong>{{ clientOrigin }}</strong>
      </div>

      <div class="debug-card">
        <small>App Mode</small>
        <strong>{{ appMode }}</strong>
      </div>

      <div class="debug-card">
        <small>Socket URL</small>
        <strong>{{ socketUrl }}</strong>
      </div>
    </div>

    <div class="settings-list">
      <div class="settings-row">
        <div>
          <h3>Voice diagnostics</h3>
          <p>Prepare tools for WebRTC connection, ICE state, and remote stream checks.</p>
        </div>

        <span class="status-pill">v0.6 polish</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Local storage tools</h3>
          <p>Future reset controls for local room cache, debug flags, and demo state.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Browser</h3>
          <p>{{ browserInfo }}</p>
        </div>

        <span class="status-pill muted">Read only</span>
      </div>
    </div>
  </section>
</template>

<script setup>
/* =========================================================
   SECTION 2: Environment Info
========================================================= */
const clientOrigin = typeof window !== "undefined" ? window.location.origin : "Unknown"
const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown browser"
const appMode = import.meta.env.MODE || "development"
const socketUrl = import.meta.env.VITE_SOCKET_URL || "Same origin / default"
</script>

<style scoped>
.settings-section-card {
  display: grid;
  gap: 18px;
}

.section-header,
.debug-card,
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

.debug-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.debug-card {
  min-width: 0;
  padding: 18px;
  display: grid;
  gap: 8px;
}

.debug-card small {
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.debug-card strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  word-break: break-word;
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
  .debug-grid {
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
