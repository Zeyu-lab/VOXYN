<template>
  <!-- =========================================================
       SECTION 1: Notifications Settings Card
       Purpose:
       - Prepare room/chat/voice/game notification controls
       - Use local placeholder toggles for visual development
  ========================================================= -->
  <section class="settings-section-card">
    <header class="section-header">
      <p class="section-kicker">NOTIFICATIONS</p>
      <h2>Notifications</h2>
      <span>
        Prepare alert controls for rooms, messages, voice channels, and multiplayer game events.
      </span>
    </header>

    <div class="settings-list">
      <div
        v-for="item in notificationItems"
        :key="item.id"
        class="settings-row"
      >
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>

        <button
          class="toggle-pill"
          :class="{ active: item.enabled }"
          @click="item.enabled = !item.enabled"
        >
          <span></span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
/* =========================================================
   SECTION 2: Local Placeholder State
========================================================= */
import { ref } from "vue"

const notificationItems = ref([
  {
    id: "room-invites",
    title: "Room invites",
    description: "Notify me when someone sends or shares a room invite.",
    enabled: true
  },
  {
    id: "chat-messages",
    title: "Chat messages",
    description: "Prepare alerts for unread room chat messages.",
    enabled: true
  },
  {
    id: "voice-activity",
    title: "Voice activity",
    description: "Prepare alerts when friends join or leave a voice channel.",
    enabled: false
  },
  {
    id: "game-events",
    title: "Game events",
    description: "Prepare alerts for future mini-game rounds and score changes.",
    enabled: false
  }
])
</script>

<style scoped>
.settings-section-card {
  display: grid;
  gap: 18px;
}

.section-header,
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

.toggle-pill {
  width: 56px;
  height: 32px;
  flex: 0 0 56px;
  padding: 3px;
  border: none;
  border-radius: 999px;
  background: #cbd5e1;
  cursor: pointer;
  transition: background 0.18s ease;
}

.toggle-pill span {
  width: 26px;
  height: 26px;
  display: block;
  border-radius: 999px;
  background: white;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
  transition: transform 0.18s ease;
}

.toggle-pill.active {
  background: #4f46e5;
}

.toggle-pill.active span {
  transform: translateX(24px);
}

@media (max-width: 720px) {
  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
