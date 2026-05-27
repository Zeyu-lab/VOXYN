<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Load router
   - Load Supabase client
========================================================= */
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

/* =========================================================
   SECTION 2: Router
   Purpose:
   - Control page navigation after login / logout / room actions
========================================================= */
const router = useRouter()

/* =========================================================
   SECTION 3: Auth State
   Purpose:
   - Store current user data
   - Control loading state
========================================================= */
const user = ref(null)
const userEmail = ref("")
const loading = ref(true)

const profileAvatarUrl = ref("")
const profileAvatarUpdatedAt = ref("")
const avatarLoadFailed = ref(false)
/* =========================================================
   SECTION 4: Room Form State
   Purpose:
   - Store create room and join room inputs
   - Store room member limit
   - Store action loading and message states
========================================================= */
const actionLoading = ref(false)
const roomName = ref("")
const joinCode = ref("")
const maxMembers = ref(5)
const errorMessage = ref("")
const successMessage = ref("")

const memberLimitOptions = [5, 8, 10]

/* =========================================================
   SECTION 5: Mobile Menu State
   Purpose:
   - In half screen / mobile screen, sidebar becomes topbar menu
========================================================= */
const showMobileMenu = ref(false)

const navItems = [
  "Dashboard",
  "My Rooms",
  "Voice Rooms",
  "Games",
  "Profile",
  "Settings"
]

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function closeMobileMenu() {
  showMobileMenu.value = false
}

/* =========================================================
   SECTION 6: Dashboard Data State
   Purpose:
   - Store recent rooms
   - Store activity feed
   - Store build queue
========================================================= */
const recentRooms = ref([])
const activityFeed = ref([
  {
    title: "Dashboard ready",
    detail: "Create or join a room to start a live session."
  },
  {
    title: "Small room system",
    detail: "Rooms are designed for 5-10 people."
  },
  {
    title: "Room workspace next",
    detail: "Voice, chat, and game panels will live in RoomView."
  }
])

const buildQueue = [
  "Room page layout",
  "Online users",
  "Realtime chat",
  "Host game selection",
  "Voice room UI"
]

const activeRoomsCount = computed(() => recentRooms.value.length)
const onlineUsersCount = computed(() => (user.value ? 1 : 0))
const latestRoomCode = computed(() => {
  if (!recentRooms.value.length) return "None"
  return recentRooms.value[0].room_code
})
/* =========================================================
   SECTION 6.5: Profile Avatar Display
   Purpose:
   - Show uploaded avatar in Dashboard topbar
   - Fall back to first email letter
========================================================= */
const profileInitial = computed(() => {
  if (userEmail.value) {
    return userEmail.value.charAt(0).toUpperCase()
  }

  return "U"
})

const dashboardAvatarUrl = computed(() => {
  if (!profileAvatarUrl.value || avatarLoadFailed.value) return ""

  if (profileAvatarUpdatedAt.value) {
    return `${profileAvatarUrl.value}?v=${profileAvatarUpdatedAt.value}`
  }

  return profileAvatarUrl.value
})

/* =========================================================
   SECTION 7: Auth Check
   Purpose:
   - When dashboard opens, check if user is logged in
   - If not logged in, redirect to login page
   - If logged in, load recent rooms
========================================================= */
onMounted(async () => {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    router.push("/login")
    return
  }

  user.value = data.session.user
  userEmail.value = data.session.user.email || ""

  const metadata = data.session.user.user_metadata || {}

  profileAvatarUrl.value = metadata.avatar_url || ""
  profileAvatarUpdatedAt.value = metadata.avatar_updated_at || ""
  avatarLoadFailed.value = false

  loading.value = false

  await loadRecentRooms()
})

/* =========================================================
   SECTION 8: Room Code Helper
   Purpose:
   - Generate a simple room code for MVP version
========================================================= */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/* =========================================================
   SECTION 9: Format Helper
   Purpose:
   - Keep room timestamps simple and readable
========================================================= */
function formatRoomTime(value) {
  if (!value) return "Just now"

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })
}

/* =========================================================
   SECTION 10: Load Recent Rooms
   Purpose:
   - Load latest rooms owned by the current user
   - Match the new Supabase rooms table using owner_id
========================================================= */
async function loadRecentRooms() {
  if (!user.value) return

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("owner_id", user.value.id)
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) {
    activityFeed.value.unshift({
      title: "Recent rooms unavailable",
      detail: error.message || "Check your Supabase rooms table."
    })
    return
  }

  recentRooms.value = data || []
}

/* =========================================================
   SECTION 11: Create Room
   Purpose:
   - Free MVP rule: each user can only own one room
   - Delete old owned rooms before creating a new one
   - Create a new room in Supabase
   - Redirect user to the new RoomView page
========================================================= */
async function createRoom() {
  errorMessage.value = ""
  successMessage.value = ""

  if (!user.value) {
    errorMessage.value = "You must be logged in first."
    return
  }

  actionLoading.value = true

  const newRoomCode = generateRoomCode()
  const cleanRoomName = roomName.value.trim() || "Untitled Room"

  /*
    Free MVP rule:
    A free user can only own one active room.
    Creating a new room removes the previous one first.
  */
  const { error: deleteError } = await supabase
    .from("rooms")
    .delete()
    .eq("owner_id", user.value.id)

  if (deleteError) {
    actionLoading.value = false
    errorMessage.value = deleteError.message
    return
  }

  const roomPayload = {
    room_code: newRoomCode,
    room_name: cleanRoomName,
    owner_id: user.value.id,
    max_members: maxMembers.value
  }

  const { error } = await supabase
    .from("rooms")
    .insert(roomPayload)

  actionLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  activityFeed.value.unshift({
    title: `Room ${newRoomCode} created`,
    detail: `${cleanRoomName} replaced your previous room.`
  })

  await loadRecentRooms()

  router.push(`/room/${newRoomCode}`)
}
/* =========================================================
   SECTION 12: Join Room
   Purpose:
   - Check if the entered room code exists
   - Redirect user to that room page
========================================================= */
async function joinRoom() {
  errorMessage.value = ""
  successMessage.value = ""

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

  activityFeed.value.unshift({
    title: `Joining ${code}`,
    detail: "Opening room workspace."
  })

  router.push(`/room/${code}`)
}

/* =========================================================
   SECTION 13: Room Quick Actions
   Purpose:
   - Enter a recent room
   - Copy room code for sharing
========================================================= */
function enterRoom(code) {
  router.push(`/room/${code}`)
}

async function copyRoomCode(code) {
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await navigator.clipboard.writeText(code)
    successMessage.value = `Room code ${code} copied.`
  } catch {
    errorMessage.value = "Could not copy room code."
  }
}/* =========================================================
   SECTION 13.5: Delete Room
   Purpose:
   - Allow user to manually delete an owned room
   - Prevent free MVP room data from piling up
========================================================= */
async function deleteRoom(room) {
  errorMessage.value = ""
  successMessage.value = ""

  if (!room?.id) {
    errorMessage.value = "Room data is missing."
    return
  }

  const confirmed = window.confirm(
    `Delete room ${room.room_code}? This cannot be undone.`
  )

  if (!confirmed) return

  actionLoading.value = true

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", room.id)
    .eq("owner_id", user.value.id)

  actionLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  successMessage.value = `Room ${room.room_code} deleted.`

  activityFeed.value.unshift({
    title: `Room ${room.room_code} deleted`,
    detail: "The old room and its members were removed."
  })

  await loadRecentRooms()
}
/* =========================================================
   SECTION 14: Sign Out
   Purpose:
   - Sign user out from Supabase
   - Redirect back to home page
========================================================= */
async function signOut() {
  await supabase.auth.signOut()
  router.push("/")
}
</script>

<template>
  <!-- =====================================================
       SECTION 1: Dashboard Shell
       Purpose:
       - Main full page layout
       - Large screen: sidebar + main area
       - Small screen: main area only, sidebar hidden
  ====================================================== -->
  <main class="dashboard-shell">

    <!-- ===================================================
         SECTION 2: Desktop Sidebar
         Purpose:
         - Visible only on full screen / desktop
         - Hidden on half screen / mobile
    ==================================================== -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">V</div>

        <div>
          <strong>VOXYN</strong>
          <span>Private Rooms</span>
        </div>
      </div>

      <nav class="side-nav">
        <a
          v-for="item in navItems"
          :key="item"
          class="nav-item"
          :class="{ active: item === 'Dashboard' }"
        >
          {{ item }}
        </a>
      </nav>

      <div class="sidebar-footer">
        <p>Server Mode</p>
        <strong>Local MVP</strong>
        <span>Small rooms · 5-10 users</span>
      </div>
    </aside>

    <!-- ===================================================
         SECTION 3: Main Area
         Purpose:
         - Contains topbar, stats, room command center, recent rooms, activity
    ==================================================== -->
    <section class="main-area">

      <!-- =================================================
           SECTION 4: Topbar
           Purpose:
           - Full screen: title + user actions
           - Half screen: sidebar becomes 3-dot menu
           - Keep title and actions aligned in one row
      ================================================== -->
      <!-- =================================================
          SECTION 4: Topbar
          Purpose:
          - Full screen: title + user actions
          - Half screen: sidebar becomes 3-dot menu
          - Keep title and actions aligned in one row
      ================================================== -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu-btn" @click="toggleMobileMenu">
            ⋯
          </button>

          <div class="topbar-title">
            <p class="page-label">Dashboard</p>
            <h1>VOXYN Control Center</h1>
          </div>
        </div>

        <div class="topbar-actions">
          <span class="connection-pill">
            <span class="pulse-dot"></span>
            Connected
          </span>

          <!-- Profile circle button -->
          <button
            class="profile-circle"
            @click="router.push('/profile')"
            title="Open profile"
          >
            <img
              v-if="dashboardAvatarUrl"
              :src="dashboardAvatarUrl"
              alt="Profile avatar"
              class="profile-circle-img"
              @error="avatarLoadFailed = true"
            />

            <span v-else class="profile-initial">
              {{ profileInitial }}
            </span>
          </button>

          <button class="logout-btn" @click="signOut">
            Sign out
          </button>
        </div>
      </header>

      <!-- =================================================
           SECTION 5: Mobile Dropdown Menu
           Purpose:
           - Replaces sidebar on half screen / mobile
           - Shows listed functions after clicking 3 dots
      ================================================== -->
      <div v-if="showMobileMenu" class="mobile-menu-panel">
        <button
          v-for="item in navItems"
          :key="item"
          class="mobile-menu-item"
          :class="{ active: item === 'Dashboard' }"
          @click="closeMobileMenu"
        >
          {{ item }}
        </button>
      </div>

      <!-- =================================================
           SECTION 6: Loading State
           Purpose:
           - Shown while checking user session
      ================================================== -->
      <section v-if="loading" class="loading-card">
        Loading dashboard...
      </section>

      <!-- =================================================
           SECTION 7: Dashboard Content
           Purpose:
           - Main dashboard content after user login is confirmed
      ================================================== -->
      <template v-else>

        <!-- ===============================================
             SECTION 8: Hero Command Header
             Purpose:
             - Keep original bright VOXYN feel
             - Add lightweight liquid glass elements
        ================================================ -->
        <section class="hero-panel">
          <div class="hero-copy">
            <p class="panel-label">Start a Session</p>
            <h2>Launch a private room for voice, chat, and mini games.</h2>
            <p>
              Create a room, share the code, and bring friends into one live VOXYN workspace.
            </p>
          </div>

          <div class="hero-map">
            <span class="map-pill chat-pill">Chat</span>
            <span class="map-pill voice-pill">Voice</span>

            <div class="room-core">
              <span>Room</span>
              <small>5-10 people</small>
            </div>

            <span class="map-pill game-pill">Game</span>
            <span class="map-line line-one"></span>
            <span class="map-line line-two"></span>
            <span class="map-line line-three"></span>
          </div>
        </section>

        <!-- ===============================================
             SECTION 9: Stats Cards
             Purpose:
             - Show useful live MVP summary
             - Use original light dashboard card style
        ================================================ -->
        <section class="stats-grid">
          <div class="stat-card">
            <p>Active Rooms</p>
            <h2>{{ activeRoomsCount }}</h2>
            <span>Created by you</span>
          </div>

          <div class="stat-card">
            <p>Online Users</p>
            <h2>{{ onlineUsersCount }}</h2>
            <span>You are connected</span>
          </div>

          <div class="stat-card">
            <p>Current Room</p>
            <h2>{{ latestRoomCode }}</h2>
            <span>Latest room code</span>
          </div>

          <div class="stat-card">
            <p>Connection</p>
            <h2>Online</h2>
            <span>Supabase active</span>
          </div>
        </section>

        <!-- ===============================================
             SECTION 10: Main Content Grid
             Purpose:
             - Left side: create / join room command panel
             - Right side: activity feed + build queue
        ================================================ -->
        <section class="content-grid">

          <!-- =============================================
               SECTION 11: Create / Join Room Panel
               Purpose:
               - Create new room
               - Choose max members
               - Join existing room by code
          ============================================== -->
          <div class="panel command-panel">
            <div class="panel-header">
              <div>
                <p class="panel-label">Rooms</p>
                <h2>Create or Join Room</h2>
              </div>

              <span class="status-dot">Live</span>
            </div>

            <div class="room-actions">

              <!-- =========================================
                   SECTION 11A: Create Room Box
              ========================================== -->
              <div class="room-box create-box">
                <div class="room-box-top">
                  <span class="room-icon">＋</span>
                  <div>
                    <h3>Create Room</h3>
                    <p>Start a small private room and share the generated code.</p>
                  </div>
                </div>

                <label>
                  Room name
                  <input
                    v-model="roomName"
                    type="text"
                    placeholder="Example: Friday Game Room"
                  />
                </label>

                <div class="member-limit">
                  <span>Max members</span>

                  <div class="limit-options">
                    <button
                      v-for="option in memberLimitOptions"
                      :key="option"
                      type="button"
                      class="limit-btn"
                      :class="{ active: maxMembers === option }"
                      @click="maxMembers = option"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <button
                  class="primary-action liquid-action"
                  @click="createRoom"
                  :disabled="actionLoading"
                >
                  {{ actionLoading ? "Creating..." : "Create Room" }}
                </button>
              </div>

              <!-- =========================================
                   SECTION 11B: Join Room Box
              ========================================== -->
              <div class="room-box join-box">
                <div class="room-box-top">
                  <span class="room-icon dark-icon">↗</span>
                  <div>
                    <h3>Join Room</h3>
                    <p>Enter a room code and open the same VOXYN workspace.</p>
                  </div>
                </div>

                <label>
                  Room code
                  <input
                    v-model="joinCode"
                    type="text"
                    placeholder="Enter room code"
                    @keyup.enter="joinRoom"
                  />
                </label>

                <div class="room-note">
                  Room codes work inside the server instance that created them.
                </div>

                <button
                  class="secondary-action"
                  @click="joinRoom"
                  :disabled="actionLoading"
                >
                  Join Room
                </button>
              </div>
            </div>

            <p v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </p>

            <p v-if="successMessage" class="success-message">
              {{ successMessage }}
            </p>
          </div>

          <!-- =============================================
               SECTION 12: Side Stack
               Purpose:
               - Activity feed
               - Build queue
          ============================================== -->
          <div class="side-stack">

            <!-- ===========================================
                 SECTION 12A: Live Activity Panel
            ============================================ -->
            <div class="panel activity-panel">
              <p class="panel-label">Live Activity</p>
              <h2>Room Feed</h2>

              <ul class="activity-list">
                <li
                  v-for="(item, index) in activityFeed"
                  :key="`${item.title}-${index}`"
                >
                  <span class="activity-node"></span>

                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- ===========================================
                 SECTION 12B: Build Queue Panel
            ============================================ -->
            <div class="panel queue-panel">
              <p class="panel-label">Next Features</p>
              <h2>Build Queue</h2>

              <ul class="feature-list">
                <li
                  v-for="(feature, index) in buildQueue"
                  :key="feature"
                >
                  <span>{{ String(index + 1).padStart(2, "0") }}</span>
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ===============================================
             SECTION 13: Bottom Dashboard Grid
             Purpose:
             - Add more useful bottom elements
             - Recent rooms + session blueprint + access panel
        ================================================ -->
        <section class="bottom-grid">

          <!-- =============================================
               SECTION 13A: Recent Rooms Panel
          ============================================== -->
          <div class="bottom-panel recent-panel">
            <div class="panel-header">
              <div>
                <p class="panel-label">My Rooms</p>
                <h2>Recent Rooms</h2>
              </div>

              <button class="ghost-action" @click="loadRecentRooms">
                Refresh
              </button>
            </div>

            <div v-if="recentRooms.length" class="room-table">
              <div class="room-table-head">
                <span>Room</span>
                <span>Code</span>
                <span>Members</span>
                <span>Action</span>
              </div>

              <div
                v-for="room in recentRooms"
                :key="room.id || room.room_code"
                class="room-row"
              >
                <div class="room-name">
                  <strong>{{ room.room_name || "Untitled Room" }}</strong>
                  <small>{{ formatRoomTime(room.created_at) }}</small>
                </div>

                <button class="code-pill" @click="copyRoomCode(room.room_code)">
                  {{ room.room_code }}
                </button>

                <span class="members-pill">
                  1 / {{ room.max_members || 5 }}
                </span>

                <div class="room-action-buttons">
                  <button
                    class="enter-btn liquid-action"
                    @click="enterRoom(room.room_code)"
                  >
                    Enter
                  </button>

                  <button
                    class="delete-room-btn"
                    @click="deleteRoom(room)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="empty-rooms">
              <div class="empty-icon">◇</div>
              <h3>No rooms yet</h3>
              <p>Create your first room to start building the VOXYN room system.</p>
            </div>
          </div>

          <!-- =============================================
               SECTION 13B: Session Blueprint Panel
               Purpose:
               - Show what happens after entering RoomView
          ============================================== -->
          <div class="bottom-panel blueprint-panel">
            <p class="panel-label">Room Blueprint</p>
            <h2>Inside each room</h2>

            <div class="blueprint-grid">
              <div class="blueprint-item">
                <span>01</span>
                <strong>Voice Lobby</strong>
                <p>Join voice, mute, and see who is connected.</p>
              </div>

              <div class="blueprint-item">
                <span>02</span>
                <strong>Chatroom</strong>
                <p>Realtime messages and room system updates.</p>
              </div>

              <div class="blueprint-item">
                <span>03</span>
                <strong>Host Games</strong>
                <p>Room owner selects and starts mini games.</p>
              </div>

              <div class="blueprint-item">
                <span>04</span>
                <strong>Small Groups</strong>
                <p>Room capacity stays between 5 and 10 users.</p>
              </div>
            </div>
          </div>

          <!-- =============================================
               SECTION 13C: Access Panel
               Purpose:
               - Useful for local MVP / future public testing
          ============================================== -->
          <div class="bottom-panel access-panel">
            <p class="panel-label">Access</p>
            <h2>Server Access</h2>

            <div class="access-list">
              <div>
                <span>Local URL</span>
                <strong>localhost:5173</strong>
              </div>

              <div>
                <span>Public Tunnel</span>
                <strong>Not connected</strong>
              </div>

              <div>
                <span>Room Code Flow</span>
                <strong>Required</strong>
              </div>
            </div>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Design Tokens
   Purpose:
   - Restore original brighter dashboard colors
   - Keep liquid glass on buttons and selected panels
========================================================= */
* {
  box-sizing: border-box;
}

button,
input {
  font-family: inherit;
}

button {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

button:hover {
  transform: translateY(-1px);
}

/* =========================================================
   SECTION 2: Page Shell
   Purpose:
   - Full dashboard page layout
   - Desktop uses sidebar + main content grid
========================================================= */
.dashboard-shell {
  min-height: 100vh;
  display: block;
  padding-left: 260px;
  color: #1f2937;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background:
    radial-gradient(circle at 14% 8%, rgba(56, 189, 248, 0.16), transparent 26%),
    radial-gradient(circle at 86% 5%, rgba(29, 155, 240, 0.11), transparent 28%),
    linear-gradient(135deg, #eef5fb 0%, #f8fbff 48%, #eaf1f8 100%);
  overflow-x: hidden;
}

/* =========================================================
   SECTION 3: Desktop Sidebar
   Purpose:
   - Left navigation panel for full screen
========================================================= */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, #031d35 0%, #02182d 100%);
  color: white;
  overflow-y: auto;
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 42px;
}

.brand-mark {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
  color: #031d35;
  font-size: 22px;
  font-weight: 950;
  box-shadow: 0 18px 36px rgba(29, 155, 240, 0.26);
}

.brand strong {
  display: block;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: 1px;
}

.brand span {
  display: block;
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.side-nav {
  display: grid;
  gap: 8px;
}

.nav-item {
  padding: 15px 16px;
  border-radius: 15px;
  color: #cbd5e1;
  cursor: pointer;
  font-weight: 850;
  text-decoration: none;
}

.nav-item.active,
.nav-item:hover {
  background: #1d9bf0;
  color: white;
  box-shadow: 0 12px 28px rgba(29, 155, 240, 0.22);
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-footer p {
  margin: 0 0 7px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 800;
}

.sidebar-footer strong {
  display: block;
  margin-bottom: 6px;
  color: white;
  font-size: 16px;
}

.sidebar-footer span {
  color: #94a3b8;
  font-size: 13px;
}

/* =========================================================
   SECTION 4: Main Area
   Purpose:
   - Right side content area
========================================================= */
.main-area {
  position: relative;
  min-width: 0;
  width: 100%;
  min-height: 100vh;
  padding: 28px;
}
/* =================================================
   SECTION 4.3: Profile Circle Button
   Purpose:
   - Shows uploaded avatar in dashboard topbar
   - Falls back to user initial when avatar is unavailable
   - Opens Profile page
================================================== */
.profile-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 0;
  overflow: hidden;

  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.profile-circle:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.13);
}

.profile-circle:active {
  transform: translateY(0);
}

.profile-circle-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.profile-initial {
  color: #07111f;
  font-size: 24px;
  font-weight: 950;
  line-height: 1;
}
/* =========================================================
   SECTION 5: Topbar
   Purpose:
   - Desktop: title on left, user actions on right
   - Half screen: 3-dot menu + title stay together
   - Email and sign out stay aligned on the right
========================================================= */
.topbar {
  min-height: 92px;
  padding: 0 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  margin-bottom: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.topbar-title {
  min-width: 0;
}

.page-label,
.panel-label {
  margin: 0 0 8px;
  color: #1d9bf0;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.connection-pill,
.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 260px;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 999px;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pulse-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.9);
}

/* =========================================================
   SECTION 6: Liquid Buttons
   Purpose:
   - Keep liquid glass effect mainly on buttons
========================================================= */
.logout-btn,
.mobile-menu-btn,
.primary-action,
.secondary-action,
.ghost-action,
.enter-btn,
.code-pill,
.limit-btn {
  border: none;
  cursor: pointer;
  font-weight: 950;
}

.liquid-action {
  position: relative;
  overflow: hidden;
}

.liquid-action::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-105%);
  background: linear-gradient(
    110deg,
    transparent,
    rgba(255, 255, 255, 0.44),
    transparent
  );
  transition: transform 0.55s ease;
}

.liquid-action:hover::after {
  transform: translateX(105%);
}

.logout-btn {
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 14px;
  color: white;
  background: #0f172a;
}

.logout-btn:hover,
.primary-action:hover,
.enter-btn:hover {
  box-shadow: 0 18px 38px rgba(29, 155, 240, 0.25);
}

/* =========================================================
   SECTION 7: Mobile Menu Button
   Purpose:
   - Hidden on desktop because sidebar already exists
   - Visible when sidebar becomes topbar menu
========================================================= */
.mobile-menu-btn {
  display: none;
  width: 54px;
  height: 54px;
  border-radius: 17px;
  color: white;
  font-size: 30px;
  line-height: 1;
  background: #0f172a;
  flex-shrink: 0;
}

/* =========================================================
   SECTION 8: Mobile Dropdown Menu
   Purpose:
   - Hidden on desktop
   - Opens from topbar on half screen / mobile
========================================================= */
.mobile-menu-panel {
  display: none;
}

.mobile-menu-item {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 13px 14px;
  background: transparent;
  color: #334155;
  text-align: left;
  font-weight: 900;
  cursor: pointer;
}

.mobile-menu-item.active,
.mobile-menu-item:hover {
  background: #e0f2fe;
  color: #0369a1;
}

/* =========================================================
   SECTION 9: Loading Card
   Purpose:
   - Loading state style
========================================================= */
.loading-card {
  min-height: 150px;
  padding: 32px;
  border-radius: 24px;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 34px rgba(15, 23, 42, 0.08);
  color: #334155;
  font-weight: 900;
}

/* =========================================================
   SECTION 10: Shared Panels
   Purpose:
   - Bright original card style with slight glass feeling
========================================================= */
.hero-panel,
.stat-card,
.panel,
.bottom-panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: 0 10px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

/* =========================================================
   SECTION 11: Hero Panel
   Purpose:
   - Keep hero cooler but closer to original color
========================================================= */
.hero-panel {
  position: relative;
  min-height: 220px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  align-items: center;
  gap: 28px;
  padding: 34px;
  margin-bottom: 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at 85% 12%, rgba(29, 155, 240, 0.22), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(239, 246, 255, 0.86));
}

.hero-panel::before {
  content: "";
  position: absolute;
  inset: auto -60px -120px auto;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.15), transparent 68%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.hero-copy h2 {
  max-width: 780px;
  margin: 0;
  color: #111827;
  font-size: clamp(36px, 4vw, 58px);
  line-height: 1.02;
  letter-spacing: -0.06em;
}

.hero-copy p:last-child {
  max-width: 640px;
  margin: 18px 0 0;
  color: #64748b;
  font-size: 17px;
  line-height: 1.7;
}

.hero-map {
  position: relative;
  width: 390px;
  height: 230px;
  justify-self: end;
}

.room-core {
  position: absolute;
  left: 92px;
  top: 76px;
  width: 210px;
  height: 116px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 28px;
  color: white;
  background: linear-gradient(135deg, #1d9bf0, #2563eb 62%, #7c3aed);
  box-shadow: 0 24px 54px rgba(37, 99, 235, 0.28);
}

.room-core span {
  display: block;
  font-size: 34px;
  font-weight: 950;
  letter-spacing: 8px;
  text-transform: uppercase;
}

.room-core small {
  display: block;
  margin-top: -24px;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 1px;
  opacity: 0.86;
}

.map-pill {
  position: absolute;
  z-index: 2;
  min-width: 112px;
  min-height: 50px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: 4px;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(29, 155, 240, 0.22);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.chat-pill {
  top: 18px;
  right: 28px;
}

.voice-pill {
  left: 0;
  bottom: 42px;
}

.game-pill {
  right: 0;
  bottom: 16px;
}

.map-line {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, rgba(29, 155, 240, 0.05), rgba(29, 155, 240, 0.45));
}

.line-one {
  width: 130px;
  top: 76px;
  right: 92px;
  transform: rotate(24deg);
}

.line-two {
  width: 120px;
  left: 72px;
  bottom: 90px;
  transform: rotate(-12deg);
}

.line-three {
  width: 110px;
  right: 78px;
  bottom: 74px;
  transform: rotate(14deg);
}

/* =========================================================
   SECTION 12: Stats Grid
   Purpose:
   - Dashboard summary cards
========================================================= */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 23px;
}

.stat-card p {
  margin: 0;
  color: #8a8f98;
  font-size: 13px;
  font-weight: 850;
}

.stat-card h2 {
  max-width: 100%;
  margin: 14px 0 8px;
  color: #111827;
  font-size: clamp(26px, 3vw, 34px);
  letter-spacing: -0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card span {
  color: #64748b;
  font-size: 14px;
}

/* =========================================================
   SECTION 13: Main Content Grid
   Purpose:
   - Room command panel + right side stack
========================================================= */
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 20px;
  margin-bottom: 20px;
  align-items: start;
}

.command-panel {
  height: fit-content;
}

.panel {
  padding: 26px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 22px;
}

.panel h2,
.bottom-panel h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 8px 13px;
  border-radius: 999px;
  color: #15803d;
  font-size: 13px;
  font-weight: 950;
  background: #dcfce7;
}

/* =========================================================
   SECTION 14: Room Actions
   Purpose:
   - Create room card
   - Join room card
========================================================= */
.room-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.room-box {
  min-height: 350px;
  padding: 22px;
  border-radius: 22px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.create-box {
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 38%),
    #f8fafc;
}

.join-box {
  background:
    radial-gradient(circle at top right, rgba(15, 23, 42, 0.07), transparent 38%),
    #f8fafc;
}

.room-box-top {
  display: flex;
  gap: 14px;
  margin-bottom: 22px;
}

.room-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 16px;
  color: white;
  font-size: 22px;
  font-weight: 950;
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
  box-shadow: 0 12px 28px rgba(29, 155, 240, 0.22);
}

.dark-icon {
  background: #0f172a;
}

.room-box h3 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 21px;
  letter-spacing: -0.03em;
}

.room-box p {
  margin: 0;
  color: #64748b;
  line-height: 1.55;
}

label {
  display: block;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
}

input {
  width: 100%;
  min-height: 50px;
  margin: 10px 0 18px;
  padding: 0 16px;
  border-radius: 15px;
  outline: none;
  border: 1px solid #cbd5e1;
  background: white;
  color: #111827;
  font-size: 15px;
  font-weight: 750;
}

input::placeholder {
  color: #94a3b8;
}

input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12);
}

.member-limit {
  margin-bottom: 18px;
}

.member-limit > span {
  display: block;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
}

.limit-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.limit-btn {
  min-height: 44px;
  border-radius: 15px;
  color: #475569;
  background: white;
  border: 1px solid #cbd5e1;
}

.limit-btn.active,
.limit-btn:hover {
  color: white;
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
  border-color: transparent;
}

.room-note {
  min-height: 62px;
  margin: 4px 0 18px;
  padding: 14px;
  border-radius: 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
  background: white;
  border: 1px solid #e2e8f0;
}

.primary-action,
.secondary-action {
  width: 100%;
  min-height: 52px;
  border-radius: 16px;
  color: white;
  font-size: 15px;
}

.primary-action {
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
  box-shadow: 0 14px 32px rgba(29, 155, 240, 0.24);
}

.secondary-action {
  background: #0f172a;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message,
.success-message {
  margin: 18px 0 0;
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

/* =========================================================
   SECTION 15: Side Stack
   Purpose:
   - Activity feed
   - Build queue
========================================================= */
.side-stack {
  display: grid;
  gap: 20px;
}

.activity-list,
.feature-list {
  list-style: none;
  padding: 0;
  margin: 22px 0 0;
  display: grid;
  gap: 14px;
}

.activity-list li {
  display: grid;
  grid-template-columns: 13px 1fr;
  gap: 12px;
  align-items: flex-start;
}

.activity-node {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 999px;
  background: #1d9bf0;
  box-shadow: 0 0 14px rgba(29, 155, 240, 0.7);
}

.activity-list strong {
  display: block;
  color: #111827;
  font-size: 14px;
}

.activity-list p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #475569;
  font-weight: 850;
}

.feature-list span {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 950;
}

/* =========================================================
   SECTION 16: Bottom Grid
   Purpose:
   - More useful bottom dashboard elements
========================================================= */
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.recent-panel {
  grid-column: 1 / -1;
  grid-row: auto;
}

.bottom-panel {
  padding: 26px;
}

.ghost-action {
  min-height: 42px;
  padding: 10px 15px;
  border-radius: 15px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.ghost-action:hover {
  color: #0369a1;
  border-color: #38bdf8;
}

.room-table {
  display: grid;
  gap: 10px;
}

.room-table-head,
.room-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 170px 140px 280px;
  align-items: center;
  gap: 18px;
}

.room-table-head {
  padding: 0 16px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.room-row {
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.room-row:hover {
  border-color: #bae6fd;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.room-name strong {
  display: block;
  color: #111827;
  font-size: 15px;
}

.room-name small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.code-pill,
.members-pill,
.enter-btn {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
}

.code-pill {
  color: #0369a1;
  background: #e0f2fe;
}

.members-pill {
  color: #15803d;
  background: #dcfce7;
}

.enter-btn {
  color: white;
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
}

.empty-rooms {
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 28px;
  border-radius: 22px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.empty-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  border-radius: 20px;
  color: #1d9bf0;
  font-size: 28px;
  background: #e0f2fe;
}

.empty-rooms h3 {
  margin: 0;
  color: #111827;
}

.empty-rooms p {
  max-width: 420px;
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.6;
}

/* =========================================================
   SECTION 17: Blueprint Panel
   Purpose:
   - Show future RoomView components as useful bottom content
========================================================= */
.blueprint-grid {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.blueprint-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  column-gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.blueprint-item span {
  width: 38px;
  height: 38px;
  grid-row: span 2;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #0369a1;
  background: #e0f2fe;
  font-size: 12px;
  font-weight: 950;
}

.blueprint-item strong {
  color: #111827;
  font-size: 14px;
}

.blueprint-item p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

/* =========================================================
   SECTION 18: Access Panel
   Purpose:
   - Local MVP and future public testing info
========================================================= */
.access-list {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.access-list div {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f8fafc, #eff6ff);
  border: 1px solid #e2e8f0;
}

.access-list span {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.access-list strong {
  color: #111827;
  font-size: 14px;
}

/* =========================================================
   SECTION 19: Half Screen Layout
   Purpose:
   - Sidebar disappears
   - 3-dot menu appears beside title
   - Topbar remains one clean horizontal row
========================================================= */
@media (max-width: 1320px) {
  .dashboard-shell {
    padding-left: 0;
  }

  .sidebar {
    display: none;
  }

  .main-area {
    padding: 24px;
  }

  .mobile-menu-btn {
    display: grid;
    place-items: center;
  }

  .mobile-menu-panel {
    position: absolute;
    top: 116px;
    left: 24px;
    z-index: 50;
    width: 250px;
    padding: 12px;
    display: grid;
    gap: 6px;
    border-radius: 22px;
    background: white;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  }
}

/* =========================================================
   SECTION 20: Medium Screen Dashboard Layout
   Purpose:
   - Keep dashboard compact after sidebar disappears
========================================================= */
@media (max-width: 1120px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .hero-map {
    justify-self: start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .recent-panel {
    grid-row: auto;
  }

  .side-stack {
    grid-template-columns: 1fr 1fr;
  }
}

/* =========================================================
   SECTION 21: Narrow Screen Layout
   Purpose:
   - Hide email when width is limited
   - Keep title and sign out in the same topbar row
========================================================= */
@media (max-width: 820px) {
  .topbar {
    min-height: 88px;
    padding: 0 20px;
    gap: 14px;
  }

  .topbar-left {
    gap: 14px;
  }

  .mobile-menu-btn {
    width: 48px;
    height: 48px;
  }

  h1 {
    font-size: 23px;
  }

  .connection-pill,
  .user-pill {
    display: none;
  }

  .hero-panel {
    padding: 24px;
    min-height: auto;
  }

  .hero-copy h2 {
    font-size: 36px;
  }

  .hero-map {
    display: none;
  }

  .room-actions,
  .side-stack {
    grid-template-columns: 1fr;
  }

  .room-table-head {
    display: none;
  }

  .room-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .members-pill {
    display: inline-flex;
  }

  .room-action-buttons {
    justify-content: flex-start;
    min-width: 0;
  }

  .room-action-buttons .enter-btn,
  .delete-room-btn {
    flex: 1;
  }
}

/* =========================================================
   SECTION 22: Small Mobile Layout
   Purpose:
   - Stack content for phone-sized screens
========================================================= */
@media (max-width: 560px) {
  .main-area {
    padding: 14px;
  }

  .topbar {
    min-height: auto;
    padding: 18px;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .topbar-actions {
    justify-content: flex-end;
  }

  .mobile-menu-panel {
    top: 126px;
    left: 14px;
    right: 14px;
    width: auto;
  }

  .hero-panel,
  .stat-card,
  .panel,
  .bottom-panel {
    border-radius: 20px;
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    align-items: center;
  }

  .room-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .code-pill,
  .enter-btn {
    width: 100%;
  }
}

/* =========================================================
   SECTION 23: Recent Room Action Buttons
   Purpose:
   - Keep Enter and Delete buttons aligned
   - Prevent Enter button from being squeezed
========================================================= */
.room-action-buttons {
  width: 100%;
  min-width: 250px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.room-action-buttons .enter-btn,
.delete-room-btn {
  min-width: 115px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
}

.room-action-buttons .enter-btn {
  color: white;
  background: linear-gradient(135deg, #38bdf8, #1d9bf0);
}

.delete-room-btn {
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  cursor: pointer;
  transition: 0.2s ease;
}

.delete-room-btn:hover {
  background: rgba(239, 68, 68, 0.16);
  transform: translateY(-1px);
}
</style>

