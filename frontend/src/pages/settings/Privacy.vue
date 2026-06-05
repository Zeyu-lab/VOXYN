<template>
  <!-- =========================================================
       SECTION 1: Privacy Settings Card
       Purpose:
       - Prepare privacy and room safety controls
       - Keep real controls as future features
  ========================================================= -->
  <section class="settings-section-card">
    <header class="section-header">
      <p class="section-kicker">PRIVACY</p>
      <h2>Privacy & Safety</h2>
      <span>
        Control profile visibility, room discovery, and safety rules for future VOXYN rooms.
      </span>
    </header>

    <div class="settings-list">
      <div class="settings-row">
        <div>
          <h3>Profile visibility</h3>
          <p>Choose who can see your profile card, avatar, and status message.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Room discovery</h3>
          <p>Decide whether future public rooms can appear in discovery pages.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Invite protection</h3>
          <p>Prepare controls for invite links, room codes, and guest access.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>

      <div class="privacy-note">
        <span>◇</span>
        <p>
          v0.54 only builds the settings structure. Real privacy rules should be connected after room permissions are finalized.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
/* =========================================================
   SECTION 2: Privacy Logic
   Purpose:
   - Static placeholder for v0.54
========================================================= */
</script>

<style scoped>
.settings-section-card {
  display: grid;
  gap: 18px;
}

.section-header,
.settings-row,
.privacy-note {
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

.settings-row p,
.privacy-note p {
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
  color: #64748b;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 950;
}

.privacy-note {
  padding: 16px 18px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border-radius: 20px;
}

.privacy-note span {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #4f46e5;
  background: #eef2ff;
  font-weight: 950;
}

.privacy-note p {
  margin: 0;
}

@media (max-width: 720px) {
  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
