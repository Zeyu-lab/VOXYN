<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Load router / route
   - Load Supabase client
   - Load Socket.IO client
========================================================= */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { supabase, socket } from "../lib/supabaseClient"

/* =========================================================
   SECTION 2: Router
   Purpose:
   - Read room code from URL
   - Navigate between dashboard and room pages
========================================================= */
const route = useRoute()
const router = useRouter()

const roomCode = computed(() => {
  return String(route.params.roomCode || "").toUpperCase()
})

/* =========================================================
   SECTION 3: Page State
   Purpose:
   - Store auth user
   - Store current room
   - Store room members
   - Store loading and error state
========================================================= */
const loading = ref(true)
const actionLoading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")
const chatInput = ref("")
const user = ref(null)
const room = ref(null)
const members = ref([])

/* =========================================================
   SECTION 3.1: Socket State
   Purpose:
   - Store realtime socket connection state
   - Store online users from Socket.IO
========================================================= */
const socketConnected = ref(false)
const onlineUsers = ref([])

/* =========================================================
   SECTION 4: Create Room Strip State
   Purpose:
   - Allow user to create a new room from RoomView
   - Free MVP rule: new room replaces previous owned room
========================================================= */
const newRoomName = ref("")
const newMaxMembers = ref(5)
const memberLimitOptions = [5, 8, 10]

/* =========================================================
   SECTION 5: UI State
   Purpose:
   - Control room workspace tabs and selected voice channel
========================================================= */
const selectedTab = ref("Game")
const selectedVoiceChannel = ref("Lounge")

const tabs = ["Game", "Voice", "Settings"]

const voiceChannels = computed(() => [
  {
    name: "Lounge",
    count: memberCount.value
  },
  {
    name: "Strategy",
    count: 0
  },
  {
    name: "AFK",
    count: 0
  }
])

const chatMessages = ref([
  {
    id: "local-system-ready",
    sender: "System",
    text: "Room workspace is ready.",
    time: "Now",
    type: "system"
  }
])

/* =========================================================
   SECTION 6: Computed Room Data
   Purpose:
   - Format room title, owner, members and progress
========================================================= */
const roomTitle = computed(() => {
  return room.value?.room_name || "Untitled Room"
})

const maxMembers = computed(() => {
  return room.value?.max_members || 5
})

const memberCount = computed(() => {
  return onlineUsers.value.length || members.value.length || 1
})

const isOwner = computed(() => {
  if (!user.value || !room.value) return false
  return user.value.id === room.value.owner_id
})

const ownerLabel = computed(() => {
  return isOwner.value ? "You" : "Host"
})

const memberProgressWidth = computed(() => {
  return `${Math.min((memberCount.value / maxMembers.value) * 100, 100)}%`
})

const displayName = computed(() => {
  if (!user.value) return "Guest"

  return (
    user.value.user_metadata?.display_name ||
    user.value.email ||
    "Guest"
  )
})

/* =========================================================
   SECTION 7: Page Init
   Purpose:
   - Check auth
   - Load room
   - Join room_members if needed
   - Connect to Socket.IO room
========================================================= */
onMounted(async () => {
  await loadRoomPage()
})

onBeforeUnmount(() => {
  leaveSocketRoom(true)
})

async function loadRoomPage() {
  loading.value = true
  errorMessage.value = ""

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError.message)

      localStorage.clear()
      sessionStorage.clear()

      loading.value = false
      router.push("/login")
      return
    }

    if (!sessionData.session) {
      loading.value = false
      router.push("/login")
      return
    }

  user.value = sessionData.session.user

  const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", roomCode.value)
    .single()

  if (roomError || !roomData) {
    errorMessage.value = "Room not found."
    loading.value = false
    return
  }

  room.value = roomData

  await ensureRoomMembership()
  await loadRoomMembers()

  loading.value = false

  connectSocketRoom()
}

/* =========================================================
   SECTION 8: Room Membership
   Purpose:
   - Add current user into room_members
   - Owner should already be added by database trigger
========================================================= */
async function ensureRoomMembership() {
  if (!room.value || !user.value) return

  const { data: existingMember } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", room.value.id)
    .eq("user_id", user.value.id)
    .maybeSingle()

  if (existingMember) return

  const { error } = await supabase
    .from("room_members")
    .insert({
      room_id: room.value.id,
      user_id: user.value.id,
      member_role: "member"
    })

  if (error) {
    errorMessage.value = error.message || "Could not join room."
  }
}

async function loadRoomMembers() {
  if (!room.value) return

  const { data, error } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", room.value.id)
    .order("joined_at", { ascending: true })

  if (error) {
    errorMessage.value = error.message
    return
  }

  members.value = data || []
}

/* =========================================================
   SECTION 9: Room Helpers
   Purpose:
   - Generate room code
   - Copy room code
   - Navigate back
========================================================= */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function copyRoomCode() {
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await navigator.clipboard.writeText(roomCode.value)
    successMessage.value = `Room code ${roomCode.value} copied.`
  } catch {
    errorMessage.value = "Could not copy room code."
  }
}

function backToDashboard() {
  leaveSocketRoom(true)
  router.push("/dashboard")
}

/* =========================================================
   SECTION 10: Create New Room From RoomView
   Purpose:
   - Free MVP rule: user can only own one active room
   - Creating a new room removes old owned rooms
   - Redirect to the new room
========================================================= */
async function createNewRoomFromWorkspace() {
  errorMessage.value = ""
  successMessage.value = ""

  if (!user.value) {
    errorMessage.value = "You must be logged in first."
    return
  }

  actionLoading.value = true

  const generatedCode = generateRoomCode()
  const cleanRoomName = newRoomName.value.trim() || "New VOXYN Room"

  const { error: deleteError } = await supabase
    .from("rooms")
    .delete()
    .eq("owner_id", user.value.id)

  if (deleteError) {
    actionLoading.value = false
    errorMessage.value = deleteError.message
    return
  }

  const { error } = await supabase
    .from("rooms")
    .insert({
      room_code: generatedCode,
      room_name: cleanRoomName,
      owner_id: user.value.id,
      max_members: newMaxMembers.value
    })

  actionLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  leaveSocketRoom(false)

  router.push(`/room/${generatedCode}`)
  await loadRoomPage()
}

/* =========================================================
   SECTION 11: Socket.IO Room Connection
   Purpose:
   - Connect current RoomView to backend Socket.IO room
   - Receive history, new messages, online users, and system messages
========================================================= */
function connectSocketRoom() {
  if (!roomCode.value || !user.value) return

  registerSocketListeners()

  if (!socket.connected) {
    socket.connect()
    return
  }

  joinSocketRoom()
}

function registerSocketListeners() {
  socket.off("connect", handleSocketConnect)
  socket.off("disconnect", handleSocketDisconnect)
  socket.off("room:history", handleRoomHistory)
  socket.off("chat:new", handleNewChatMessage)
  socket.off("room:users", handleRoomUsers)
  socket.off("room:system", handleSystemMessage)

  socket.on("connect", handleSocketConnect)
  socket.on("disconnect", handleSocketDisconnect)
  socket.on("room:history", handleRoomHistory)
  socket.on("chat:new", handleNewChatMessage)
  socket.on("room:users", handleRoomUsers)
  socket.on("room:system", handleSystemMessage)
}

function handleSocketConnect() {
  socketConnected.value = true
  joinSocketRoom()
}

function handleSocketDisconnect() {
  socketConnected.value = false
}

function joinSocketRoom() {
  socket.emit(
    "room:join",
    {
      roomCode: roomCode.value,
      username: displayName.value
    },
    (response) => {
      if (!response?.ok) {
        errorMessage.value = response?.error || "Could not connect to room chat."
      }
    }
  )
}

function handleRoomHistory(oldMessages) {
  const normalizedMessages = Array.isArray(oldMessages)
    ? oldMessages.map(normalizeSocketMessage)
    : []

  chatMessages.value = [
    {
      id: "local-system-ready",
      sender: "System",
      text: "Room workspace is ready.",
      time: "Now",
      type: "system"
    },
    ...normalizedMessages
  ]
}

function handleNewChatMessage(newMessage) {
  chatMessages.value.push(normalizeSocketMessage(newMessage))
}

function handleRoomUsers(users) {
  onlineUsers.value = Array.isArray(users) ? users : []
}

function handleSystemMessage(systemMessage) {
  chatMessages.value.push(normalizeSocketMessage(systemMessage))
}

function leaveSocketRoom(disconnectSocket = false) {
  if (socket.connected) {
    socket.emit("room:leave")
  }

  socket.off("connect", handleSocketConnect)
  socket.off("disconnect", handleSocketDisconnect)
  socket.off("room:history", handleRoomHistory)
  socket.off("chat:new", handleNewChatMessage)
  socket.off("room:users", handleRoomUsers)
  socket.off("room:system", handleSystemMessage)

  onlineUsers.value = []
  socketConnected.value = false

  if (disconnectSocket) {
    socket.disconnect()
  }
}

/* =========================================================
   SECTION 12: Chat Input
   Purpose:
   - Send chat messages through Socket.IO backend
   - Backend broadcasts message to everyone in the same room
========================================================= */
function sendChatMessage() {
  const text = chatInput.value.trim()

  if (!text) return

  if (!socket.connected) {
    errorMessage.value = "Chat server is not connected."
    return
  }

  socket.emit(
    "chat:send",
    {
      roomCode: roomCode.value,
      username: displayName.value,
      message: text
    },
    (response) => {
      if (!response?.ok) {
        errorMessage.value = response?.error || "Message could not be sent."
      }
    }
  )

  chatInput.value = ""
}

function normalizeSocketMessage(item) {
  const isSystem = item?.type === "system"

  return {
    id: item?.id || `${Date.now()}-${Math.random()}`,
    sender: isSystem ? "System" : item?.username || "Guest",
    text: item?.message || "",
    time: formatChatTime(item?.createdAt),
    type: isSystem ? "system" : "user",
    isOwn: item?.socketId === socket.id
  }
}

function formatChatTime(timestamp) {
  if (!timestamp) return "Now"

  const date = new Date(timestamp)

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })
}
</script>

<template>
  <main class="room-page">
    <!-- =====================================================
         SECTION 1: Left Rail
    ====================================================== -->
    <aside class="left-rail">
      <div class="rail-logo">◆</div>

      <nav class="rail-nav">
        <button @click="backToDashboard">
          ⌂
          <span>Home</span>
        </button>

        <button class="active">
          ◆
          <span>Rooms</span>
        </button>

        <button>
          ○
          <span>Profile</span>
        </button>

        <button>
          ⚙
          <span>Settings</span>
        </button>
      </nav>

      <div class="rail-user">
        {{ user?.email?.charAt(0)?.toUpperCase() || "U" }}
        <span></span>
      </div>
    </aside>

    <!-- =====================================================
         SECTION 2: Main Workspace
    ====================================================== -->
    <section class="room-main">
      <button class="back-btn" @click="backToDashboard">
        ← Back to Dashboard
      </button>

      <section v-if="loading" class="loading-card">
        Loading room...
      </section>

      <section v-else-if="errorMessage && !room" class="error-card">
        <p class="eyebrow">ROOMS</p>
        <h1>Room unavailable</h1>
        <p>{{ errorMessage }}</p>
      </section>

      <template v-else>
        <!-- ===============================================
             SECTION 3: Header
        ================================================ -->
        <header class="room-header">
          <div>
            <p class="eyebrow">ROOMS</p>
            <h1>Room Workspace</h1>
          </div>

          <span class="live-pill">
            <span></span>
            Live
          </span>
        </header>

        <!-- ===============================================
             SECTION 4: Create Room Strip
        ================================================ -->
        <section class="create-strip">
          <div class="create-strip-left">
            <div class="plus-box">＋</div>

            <div>
              <h2>Create a New Room</h2>
              <p>Set the maximum members and create a new room.</p>
            </div>
          </div>

          <div class="create-strip-control">
            <label>
              Room name
              <input
                v-model="newRoomName"
                type="text"
                placeholder="New VOXYN Room"
              />
            </label>

            <div>
              <span class="strip-label">Max members</span>

              <div class="limit-options">
                <button
                  v-for="option in memberLimitOptions"
                  :key="option"
                  :class="{ active: newMaxMembers === option }"
                  @click="newMaxMembers = option"
                >
                  {{ option }}
                </button>
              </div>
            </div>

            <button
              class="create-room-btn"
              :disabled="actionLoading"
              @click="createNewRoomFromWorkspace"
            >
              {{ actionLoading ? "Creating..." : "Create Room" }}
            </button>
          </div>
        </section>

        <!-- ===============================================
             SECTION 5: Workspace Grid
        ================================================ -->
        <section class="workspace-grid">
          <!-- =============================================
               SECTION 5A: Left Workspace Sidebar
          ============================================== -->
          <aside class="workspace-sidebar">
            <div class="room-code-card">
              <button class="copy-btn" @click="copyRoomCode">
                ⧉
              </button>

              <p>Room Code</p>
              <h2>{{ roomCode }}</h2>
              <span>Share this code to invite others.</span>
            </div>

            <div class="channels-card">
              <div class="card-title">
                Voice Channels
              </div>

              <button
                v-for="channel in voiceChannels"
                :key="channel.name"
                class="channel-item"
                :class="{ active: selectedVoiceChannel === channel.name }"
                @click="selectedVoiceChannel = channel.name"
              >
                <span>◁ {{ channel.name }}</span>
                <small>{{ channel.count }}</small>
              </button>

              <div class="card-divider"></div>

              <div class="card-title">
                Room Sections
              </div>

              <button class="channel-item simple">
                Rules
              </button>

              <button class="channel-item simple">
                About Room
              </button>
            </div>
          </aside>

          <!-- =============================================
               SECTION 5B: Center Workspace
          ============================================== -->
          <section class="center-workspace">
            <div class="member-bar">
              <div class="member-left">
                <strong>{{ memberCount }} / {{ maxMembers }} members</strong>
                <span>Owner: {{ ownerLabel }}</span>
              </div>

              <div class="member-progress">
                <div :style="{ width: memberProgressWidth }"></div>
              </div>

              <div class="member-avatars">
                <span
                  v-for="member in members.slice(0, 4)"
                  :key="member.id"
                  class="avatar"
                  :class="{ owner: member.member_role === 'owner' }"
                >
                  {{ member.member_role === "owner" ? "Z" : "U" }}
                </span>

                <span class="avatar add">+</span>
              </div>

              <button class="invite-btn">
                ✉ Invite
              </button>
            </div>

            <div class="game-area">
              <div class="cube-mark">◆</div>

              <p>VOXYN</p>
              <h2>Game Area</h2>
              <span>The game is ready.</span>
              <small>Gather your team and start playing.</small>

              <button>
                ▶ Start Game
              </button>
            </div>

            <div class="bottom-tabs">
              <button
                v-for="tab in tabs"
                :key="tab"
                :class="{ active: selectedTab === tab }"
                @click="selectedTab = tab"
              >
                {{ tab }}
              </button>
            </div>
          </section>

          <!-- =============================================
               SECTION 5C: Chat Panel
          ============================================== -->
          <aside class="chat-card">
            <div class="chat-header">
              <div>
                <h2>Chat</h2>
                <p>Room messages</p>
              </div>

              <button>☷</button>
            </div>

            <div class="chat-list">
              <div
                v-for="(message, index) in chatMessages"
                :key="`${message.sender}-${index}`"
                class="chat-message"
                :class="{ system: message.type === 'system' }"
              >
                <div class="chat-avatar">
                  {{ message.sender.charAt(0) }}
                </div>

                <div class="chat-bubble">
                  <div>
                    <strong>{{ message.sender }}</strong>
                    <small>{{ message.time }}</small>
                  </div>

                  <p>{{ message.text }}</p>
                </div>
              </div>
            </div>

            <div class="chat-input">
              <input
                v-model="chatInput"
                type="text"
                placeholder="Type a message..."
                @keyup.enter="sendChatMessage"
              />

              <button @click="sendChatMessage">
                ➤
              </button>
            </div>
          </aside>
        </section>

        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" class="success-message">
          {{ successMessage }}
        </p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.room-page,
.room-page *,
.room-page *::before,
.room-page *::after {
  box-sizing: border-box;
}
/* =========================================================
   SECTION 1: Page Shell
========================================================= */

.room-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 84px 1fr;
  background: #eef5fb;
  color: #0f172a;
}

.room-main {
  min-width: 0;
  padding: 18px 22px;
}

.back-btn {
  margin-bottom: 14px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  font-weight: 900;
  cursor: pointer;
}

/* =========================================================
   SECTION 2: Left Rail
========================================================= */
.left-rail {
  min-height: 100vh;
  padding: 22px 12px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: rgba(255, 255, 255, 0.72);
  border-right: 1px solid #e2e8f0;
}

.rail-logo {
  width: 42px;
  height: 42px;
  margin: 0 auto 32px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  font-weight: 950;
}

.rail-nav {
  display: grid;
  align-content: start;
  gap: 14px;
}

.rail-nav button {
  min-height: 58px;
  display: grid;
  place-items: center;
  gap: 4px;
  border: none;
  border-radius: 18px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 850;
}

.rail-nav button span {
  font-size: 11px;
}

.rail-nav button.active {
  color: #4f46e5;
  background: #eef2ff;
}

.rail-user {
  position: relative;
  width: 42px;
  height: 42px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  font-weight: 950;
}

.rail-user span {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #22c55e;
  border: 2px solid white;
}

/* =========================================================
   SECTION 3: Header
========================================================= */
.room-header {
  min-height: 72px;
  padding: 0 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.32em;
}

.room-header h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  color: #15803d;
  background: #dcfce7;
  font-weight: 950;
}

.live-pill span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
}

/* =========================================================
   SECTION 4: Create Strip
========================================================= */
.create-strip {
  margin-top: 14px;
  min-height: 92px;
  padding: 16px 22px;
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 30px;
  align-items: center;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.create-strip-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.plus-box {
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  font-size: 26px;
  font-weight: 950;
  box-shadow: 0 16px 34px rgba(99, 102, 241, 0.22);
}

.create-strip h2 {
  margin: 0 0 6px;
  font-size: 18px;
  white-space: nowrap;
}

.create-strip p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.create-strip-control {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 320px 260px;
  gap: 14px;
  align-items: end;
}

.create-strip label,
.strip-label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}

.create-strip input {
  width: 100%;
  max-width: 100%;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  outline: none;
  font-weight: 800;
  box-sizing: border-box;
}

.limit-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

.limit-options button {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  font-weight: 950;
  cursor: pointer;
  box-sizing: border-box;
}

.limit-options button.active {
  color: white;
  border-color: transparent;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
}

.create-room-btn {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border: none;
  border-radius: 14px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  font-weight: 950;
  cursor: pointer;
  box-sizing: border-box;
}
/* =========================================================
   SECTION 5: Workspace Grid
========================================================= */
.workspace-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 292px minmax(560px, 1fr) 390px;
  gap: 16px;
  align-items: stretch;
}

/* =========================================================
   SECTION 6: Sidebar Cards
========================================================= */
.workspace-sidebar {
  display: grid;
  gap: 14px;
}

.room-code-card,
.channels-card,
.member-bar,
.game-area,
.bottom-tabs,
.chat-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
}

.room-code-card {
  position: relative;
  min-height: 178px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 22px;
}

.copy-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
}

.room-code-card p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.room-code-card h2 {
  margin: 12px 0;
  color: #4f46e5;
  font-size: 38px;
  letter-spacing: 0.12em;
}

.room-code-card span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.channels-card {
  padding: 16px;
}

.card-title {
  margin: 8px 0 12px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.channel-item {
  width: 100%;
  min-height: 42px;
  margin-bottom: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  border-radius: 14px;
  color: #334155;
  background: transparent;
  font-weight: 850;
  cursor: pointer;
}

.channel-item.active {
  color: #4f46e5;
  background: #eef2ff;
}

.channel-item small {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #4f46e5;
  background: #e0e7ff;
}

.channel-item.simple {
  justify-content: flex-start;
}

.card-divider {
  height: 1px;
  margin: 12px 0;
  background: #e2e8f0;
}

/* =========================================================
   SECTION 7: Center Workspace
========================================================= */
.center-workspace {
  display: grid;
  grid-template-rows: 86px minmax(360px, 1fr) 58px;
  gap: 14px;
}

.member-bar {
  min-height: 86px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 170px 1fr auto auto;
  align-items: center;
  gap: 16px;
}

.member-left strong {
  display: block;
  font-size: 14px;
}

.member-left span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.member-progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.member-progress div {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
}

.member-avatars {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: white;
  background: #94a3b8;
  font-size: 13px;
  font-weight: 950;
}

.avatar.owner {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
}

.avatar.add {
  color: #64748b;
  background: white;
  border: 1px dashed #cbd5e1;
}

.invite-btn {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
  font-weight: 950;
  cursor: pointer;
}

.game-area {
  min-height: 390px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 28px;
  color: white;
  background:
    radial-gradient(circle at center, rgba(99, 102, 241, 0.28), transparent 30%),
    linear-gradient(135deg, #020617, #111c44);
  overflow: hidden;
}

.cube-mark {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  font-size: 32px;
  box-shadow: 0 20px 56px rgba(59, 130, 246, 0.28);
}

.game-area p {
  margin: 22px 0 0;
  color: white;
  font-size: 32px;
  font-weight: 950;
  letter-spacing: 0.34em;
}

.game-area h2 {
  margin: 8px 0 22px;
  color: #cbd5e1;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.game-area span {
  color: #60a5fa;
  font-size: 18px;
  font-weight: 950;
}

.game-area small {
  display: block;
  margin-top: 8px;
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.game-area button {
  margin-top: 28px;
  min-height: 52px;
  padding: 0 30px;
  border: none;
  border-radius: 999px;
  color: #4f46e5;
  background: white;
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;
}

.bottom-tabs {
  min-height: 58px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.bottom-tabs button {
  border: none;
  border-radius: 15px;
  background: transparent;
  color: #64748b;
  font-weight: 950;
  cursor: pointer;
}

.bottom-tabs button.active {
  color: #4f46e5;
  background: #eef2ff;
}

/* =========================================================
   SECTION 8: Chat
========================================================= */
.chat-card {
  min-height: 100%;
  max-height: none;
  padding: 16px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
}

.chat-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.chat-header button {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
}

.chat-list {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px 0;
}

.chat-message {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 10px;
}

.chat-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  font-size: 13px;
  font-weight: 950;
}

.chat-bubble {
  padding: 12px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.chat-message.system .chat-bubble {
  background: #eef2ff;
}

.chat-bubble div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.chat-bubble strong {
  color: #4f46e5;
  font-size: 13px;
}

.chat-bubble small {
  color: #94a3b8;
  font-size: 11px;
}

.chat-bubble p {
  margin: 6px 0 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.45;
}

.chat-input {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px;
  gap: 10px;
  padding-top: 12px;
}

.chat-input input {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid #cbd5e1;
  outline: none;
  color: #0f172a;
  background: white;
  font-weight: 800;
  pointer-events: auto;
}

.chat-input button {
  border: none;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  cursor: pointer;
}

/* =========================================================
   SECTION 9: Messages
========================================================= */
.error-message,
.success-message {
  margin: 16px 0 0;
  padding: 14px 16px;
  border-radius: 16px;
  font-weight: 850;
}

.error-message {
  color: #dc2626;
  background: #fef2f2;
}

.success-message {
  color: #15803d;
  background: #f0fdf4;
}

.loading-card,
.error-card {
  padding: 32px;
  border-radius: 24px;
  background: white;
  border: 1px solid #e2e8f0;
}

/* =========================================================
   SECTION 10: Responsive
========================================================= */
@media (max-width: 1240px) {
  .workspace-grid {
    grid-template-columns: 260px minmax(520px, 1fr) 340px;
  }

  .create-strip {
    grid-template-columns: 500px minmax(0, 1fr);
    gap: 20px;
  }

  .create-strip-control {
    padding-left: 14px;
    grid-template-columns: minmax(280px, 1fr) 280px 220px;
  }
}

@media (max-width: 1240px) {
  .room-page {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    grid-template-columns: 1fr 1fr;
  }

  .create-strip {
    grid-template-columns: 1fr;
  }

  .create-strip-control {
    grid-template-columns: 1fr;
  }

  .chat-card {
    min-height: 420px;
  }
}

@media (max-width: 720px) {
  .room-main {
    padding: 14px;
  }

  .room-header,
  .create-strip,
  .workspace-sidebar {
    grid-template-columns: 1fr;
  }

  .member-bar {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    display: grid;
  }

  .game-area {
    min-height: 340px;
  }

  .room-code-card h2 {
    font-size: 30px;
  }
}
</style>