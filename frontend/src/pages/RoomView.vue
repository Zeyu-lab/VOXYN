<template>
  <main class="room-page">
    <button class="back-button" @click="router.push('/dashboard')">
      ← Back to Dashboard
    </button>

    <section class="room-card">
      <p class="label">VOXYN ROOM</p>
      <h1>Room {{ roomCode }}</h1>

      <p class="description">
        This is the room page placeholder. Later we will add online users,
        chat, voice room UI, and mini games here.
      </p>

      <div class="room-box">
        <h2>Room Area</h2>
        <p>Voice room, chat, and mini game system will be built here.</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const roomCode = route.params.roomCode
</script>

<style scoped>
.room-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(11, 111, 201, 0.28), transparent 35%),
    linear-gradient(135deg, #03080b, #071013);
  color: white;
  font-family: Inter, system-ui, sans-serif;
  padding: 40px;
}

.back-button {
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 12px 18px;
  border-radius: 14px;
  background: transparent;
  color: white;
  font-weight: 800;
  cursor: pointer;
  margin-bottom: 28px;
}

.room-card {
  max-width: 900px;
  margin: 0 auto;
  padding: 44px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 35px 90px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(20px);
}

.label {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
}

h1 {
  margin: 14px 0;
  font-size: 42px;
}

.description {
  color: #cbd5e1;
  line-height: 1.7;
}

.room-box {
  margin-top: 28px;
  padding: 28px;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.room-box h2 {
  margin-top: 0;
}

.room-box p {
  color: #cbd5e1;
}
</style>