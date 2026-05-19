<script setup>
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

const router = useRouter()

const user = ref(null)
const userEmail = ref("")
const loading = ref(true)
const actionLoading = ref(false)

const roomName = ref("")
const joinCode = ref("")
const errorMessage = ref("")

onMounted(async () => {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    router.push("/login")
    return
  }

  user.value = data.session.user
  userEmail.value = data.session.user.email
  loading.value = false
})

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function createRoom() {
  errorMessage.value = ""

  if (!user.value) {
    errorMessage.value = "You must be logged in first."
    return
  }

  actionLoading.value = true

  const newRoomCode = generateRoomCode()

  const { error } = await supabase.from("rooms").insert({
    room_code: newRoomCode,
    room_name: roomName.value.trim() || "Untitled Room",
    created_by: user.value.id
  })

  actionLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  router.push(`/room/${newRoomCode}`)
}

async function joinRoom() {
  errorMessage.value = ""

  const code = joinCode.value.trim().toUpperCase()

  if (!code) {
    errorMessage.value = "Please enter a room code."
    return
  }

  actionLoading.value = true

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", code)
    .single()

  actionLoading.value = false

  if (error || !data) {
    errorMessage.value = "Room not found."
    return
  }

  router.push(`/room/${code}`)
}

async function signOut() {
  await supabase.auth.signOut()
  router.push("/")
}
</script>

<template>
  <main class="dashboard-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">V</div>
        <span>VOXYN</span>
      </div>

      <nav class="side-nav">
        <a class="nav-item active">Dashboard</a>
        <a class="nav-item">Rooms</a>
        <a class="nav-item">Voice</a>
        <a class="nav-item">Chat</a>
        <a class="nav-item">Games</a>
        <a class="nav-item">Profile</a>
      </nav>

      <div class="sidebar-footer">
        <p>Server Mode</p>
        <strong>Local MVP</strong>
      </div>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <div>
          <p class="page-label">Dashboard</p>
          <h1>VOXYN Control Center</h1>
        </div>

        <div class="topbar-actions">
          <span v-if="loading" class="user-pill">Loading...</span>
          <span v-else class="user-pill">{{ userEmail }}</span>

          <button class="logout-btn" @click="signOut">
            Sign out
          </button>
        </div>
      </header>

      <section v-if="loading" class="loading-card">
        Loading dashboard...
      </section>

      <template v-else>
        <section class="stats-grid">
          <div class="stat-card">
            <p>Active Rooms</p>
            <h2>1</h2>
            <span>Room system online</span>
          </div>

          <div class="stat-card">
            <p>Online Users</p>
            <h2>1</h2>
            <span>You are connected</span>
          </div>

          <div class="stat-card">
            <p>Voice Status</p>
            <h2>Ready</h2>
            <span>Voice UI coming later</span>
          </div>

          <div class="stat-card slim">
            <p>Server</p>
            <h2>88%</h2>
            <span>MVP health</span>
          </div>
        </section>

        <section class="content-grid">
          <div class="panel large-panel">
            <div class="panel-header">
              <div>
                <p class="panel-label">Rooms</p>
                <h2>Create or Join Room</h2>
              </div>
              <span class="status-dot">Live</span>
            </div>

            <div class="room-actions">
              <div class="room-box">
                <h3>Create Room</h3>
                <p>Start a new room and share the generated code with friends.</p>

                <input
                  v-model="roomName"
                  type="text"
                  placeholder="Room name optional"
                />

                <button @click="createRoom" :disabled="actionLoading">
                  {{ actionLoading ? "Creating..." : "Create Room" }}
                </button>
              </div>

              <div class="room-box">
                <h3>Join Room</h3>
                <p>Enter an existing room code to join the same VOXYN room.</p>

                <input
                  v-model="joinCode"
                  type="text"
                  placeholder="Enter room code"
                />

                <button class="secondary-btn" @click="joinRoom" :disabled="actionLoading">
                  Join Room
                </button>
              </div>
            </div>

            <p v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </p>
          </div>

          <div class="panel side-panel">
            <p class="panel-label">Next Features</p>
            <h2>Build Queue</h2>

            <ul class="feature-list">
              <li>
                <span>01</span>
                Room page layout
              </li>
              <li>
                <span>02</span>
                Online users
              </li>
              <li>
                <span>03</span>
                Realtime chat
              </li>
              <li>
                <span>04</span>
                Mini games
              </li>
              <li>
                <span>05</span>
                Voice room UI
              </li>
            </ul>
          </div>
        </section>

        <section class="bottom-panel">
          <div>
            <p class="panel-label">Activity</p>
            <h2>Server Activity Preview</h2>
          </div>

          <div class="fake-chart">
            <span style="height: 38%"></span>
            <span style="height: 54%"></span>
            <span style="height: 46%"></span>
            <span style="height: 70%"></span>
            <span style="height: 62%"></span>
            <span style="height: 84%"></span>
            <span style="height: 48%"></span>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.dashboard-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #eef3f8;
  color: #1f2937;
  font-family: Inter, system-ui, sans-serif;
}

.sidebar {
  background: #031d35;
  color: white;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 1px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #38bdf8;
  color: #031d35;
  font-weight: 900;
}

.side-nav {
  display: grid;
  gap: 8px;
}

.nav-item {
  padding: 15px 18px;
  border-radius: 14px;
  color: #cbd5e1;
  cursor: pointer;
  font-weight: 700;
}

.nav-item.active,
.nav-item:hover {
  background: #1d9bf0;
  color: white;
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-footer p {
  margin: 0 0 6px;
  color: #94a3b8;
  font-size: 13px;
}

.main-area {
  padding: 28px;
}

.topbar {
  height: 84px;
  background: white;
  border-radius: 24px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
  margin-bottom: 24px;
}

.page-label {
  margin: 0;
  color: #64748b;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
}

h1 {
  margin: 4px 0 0;
  font-size: 28px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-pill {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 11px 16px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-weight: 700;
}

.logout-btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  background: #0f172a;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.loading-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 1.2fr 0.7fr;
  gap: 18px;
  margin-bottom: 20px;
}

.stat-card,
.panel,
.bottom-panel {
  background: white;
  border-radius: 22px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
  border: 1px solid #e5e7eb;
}

.stat-card {
  padding: 22px;
}

.stat-card p {
  margin: 0;
  color: #8a8f98;
  font-weight: 700;
}

.stat-card h2 {
  margin: 14px 0 8px;
  font-size: 32px;
}

.stat-card span {
  color: #64748b;
  font-size: 14px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 20px;
  margin-bottom: 20px;
}

.panel {
  padding: 26px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.panel-label {
  margin: 0 0 8px;
  color: #1d9bf0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.panel h2 {
  margin: 0;
  font-size: 24px;
}

.status-dot {
  padding: 8px 12px;
  border-radius: 999px;
  background: #dcfce7;
  color: #15803d;
  font-size: 13px;
  font-weight: 900;
}

.room-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.room-box {
  padding: 22px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.room-box h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.room-box p {
  color: #64748b;
  line-height: 1.6;
  min-height: 52px;
}

input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 14px 15px;
  outline: none;
  margin: 12px 0 16px;
  font-size: 15px;
}

button {
  border: none;
  border-radius: 14px;
  padding: 14px 18px;
  background: #1d9bf0;
  color: white;
  font-weight: 900;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.room-box button {
  width: 100%;
}

.secondary-btn {
  background: #0f172a;
}

.error-message {
  margin-top: 18px;
  color: #dc2626;
  font-weight: 800;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: grid;
  gap: 14px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #475569;
  font-weight: 700;
}

.feature-list span {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 13px;
  font-weight: 900;
}

.bottom-panel {
  padding: 26px;
}

.fake-chart {
  height: 190px;
  display: flex;
  align-items: end;
  gap: 18px;
  padding-top: 28px;
}

.fake-chart span {
  width: 48px;
  border-radius: 12px 12px 0 0;
  background: #60a5fa;
}

@media (max-width: 1000px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .stats-grid,
  .content-grid,
  .room-actions {
    grid-template-columns: 1fr;
  }

  .topbar {
    height: auto;
    padding: 22px;
    align-items: flex-start;
    gap: 18px;
    flex-direction: column;
  }
}
</style>