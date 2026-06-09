<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Load router
   - Load Supabase client
========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

/* =========================================================
   SECTION 2: Router
========================================================= */
const router = useRouter()
const route = useRoute()

/* =========================================================
   SECTION 3: Auth State
========================================================= */
const user = ref(null)
const userEmail = ref("")
const loading = ref(true)

const avatarLoadFailed = ref(false)
let dashboardAuthSubscription = null

/* =========================================================
   SECTION 4: Room Form State
========================================================= */
const actionLoading = ref(false)
const roomName = ref("")
const joinCode = ref("")
const maxMembers = ref(5)
const errorMessage = ref("")
const successMessage = ref("")

const memberLimitOptions = [5, 8, 10]

/* =========================================================
   SECTION 5: Responsive / Menu State
========================================================= */
const showMobileMenu = ref(false)
const isHalfScreen = ref(false)
const activeNavLabel = ref("Dashboard")

const navItems = [
  {
    label: "Dashboard",
    icon: "▦",
    route: "/dashboard"
  },
  {
    label: "My Rooms",
    icon: "⌂",
    section: "dashboard-my-rooms"
  },
  {
    label: "Voice Rooms",
    icon: "◉",
    section: "dashboard-voice-status"
  },
  {
    label: "Games",
    icon: "⌘",
    section: "dashboard-game-launcher"
  },
  {
    label: "Profile",
    icon: "◎",
    route: "/profile"
  },
  {
    label: "Settings",
    icon: "⚙",
    route: "/settings"
  }
]

function updateDashboardLayoutMode() {
  isHalfScreen.value = window.innerWidth <= 1320

  if (!isHalfScreen.value) {
    showMobileMenu.value = false
  }
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function closeMobileMenu() {
  showMobileMenu.value = false
}

function isNavItemActive(item) {
  if (item.route === "/dashboard") {
    return route.path === "/dashboard" && activeNavLabel.value === "Dashboard"
  }

  if (item.route) {
    return route.path === item.route
  }

  return activeNavLabel.value === item.label
}

function scrollToDashboardSection(sectionId) {
  const targetSection = document.getElementById(sectionId)

  if (!targetSection) return

  targetSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  })
}

function handleNavClick(item) {
  closeMobileMenu()
  activeNavLabel.value = item.label

  if (item.route) {
    if (item.route === "/dashboard" && route.path === "/dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    if (route.path !== item.route) {
      router.push(item.route)
    }

    return
  }

  if (item.section) {
    scrollToDashboardSection(item.section)
  }
}

/* =========================================================
   SECTION 6: Dashboard Data State
========================================================= */
const recentRooms = ref([])

const activityFeed = ref([
  {
    title: "Dashboard ready",
    detail: "Create or join a room to start a live VOXYN session.",
    time: "Now"
  },
  {
    title: "Voice workspace prepared",
    detail: "Room voice, chat, and mini-game panels are connected through RoomView.",
    time: "1m ago"
  }
])

const gamePreviewList = [
  {
    name: "Quick Match",
    detail: "5-10 min",
    icon: "ϟ"
  },
  {
    name: "Trivia",
    detail: "2-6 players",
    icon: "?"
  },
  {
    name: "Word Duel",
    detail: "2 players",
    icon: "A"
  },
  {
    name: "Reaction",
    detail: "1-4 players",
    icon: "◎"
  }
]

const activeRoomsCount = computed(() => recentRooms.value.length)

const onlineUsersCount = computed(() => {
  return user.value ? 1 : 0
})

const latestRoomCode = computed(() => {
  if (!recentRooms.value.length) return "None"

  return recentRooms.value[0].room_code
})

const latestRoom = computed(() => {
  if (!recentRooms.value.length) return null

  return recentRooms.value[0]
})

const latestRoomDisplay = computed(() => {
  if (latestRoomCode.value === "None") return "Create a room first"

  return latestRoomCode.value
})

const currentAccessUrl = computed(() => {
  if (typeof window === "undefined") return "Unavailable"

  return window.location.origin
})

const latestInviteLink = computed(() => {
  if (latestRoomCode.value === "None") return ""

  return `${currentAccessUrl.value}/room/${latestRoomCode.value}`
})

const isPublicAccess = computed(() => {
  if (typeof window === "undefined") return false

  const hostname = window.location.hostname

  return (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== ""
  )
})

const accessModeLabel = computed(() => {
  return isPublicAccess.value ? "Public Tunnel Active" : "Local Development"
})

const accessModeDetail = computed(() => {
  if (isPublicAccess.value) {
    return "Friends can use this public URL while your server is running."
  }

  return "Localhost is only for development on this device."
})

/* =========================================================
   SECTION 6.5: Profile Identity Display
========================================================= */
const userMetadata = computed(() => {
  return user.value?.user_metadata || {}
})

const displayName = computed(() => {
  if (!user.value) return "Guest"

  const metadataName =
    userMetadata.value.display_name ||
    userMetadata.value.username ||
    userMetadata.value.name ||
    userMetadata.value.full_name ||
    userMetadata.value.preferred_name

  if (metadataName) {
    return String(metadataName).trim()
  }

  if (user.value.email) {
    return user.value.email.split("@")[0]
  }

  return "Guest"
})

const profileInitial = computed(() => {
  const cleanName = String(displayName.value || "").trim()

  if (!cleanName) return "U"

  return cleanName.charAt(0).toUpperCase()
})

const dashboardAvatarUrl = computed(() => {
  if (avatarLoadFailed.value) return ""

  const rawUrl =
    userMetadata.value.avatar_url ||
    userMetadata.value.avatarUrl ||
    ""

  if (!rawUrl) return ""

  const updatedAt = userMetadata.value.avatar_updated_at

  if (!updatedAt) return rawUrl

  const separator = rawUrl.includes("?") ? "&" : "?"

  return `${rawUrl}${separator}v=${encodeURIComponent(updatedAt)}`
})

/* =========================================================
   SECTION 7: Lifecycle / Auth Check
========================================================= */
onMounted(async () => {
  updateDashboardLayoutMode()

  window.addEventListener("resize", updateDashboardLayoutMode)
  window.addEventListener("focus", handleDashboardFocusRefresh)

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "SIGNED_OUT") {
        user.value = null
        userEmail.value = ""
        avatarLoadFailed.value = false
        return
      }

      if (session?.user) {
        user.value = session.user
        userEmail.value = session.user.email || ""
        avatarLoadFailed.value = false
      }
    }
  )

  dashboardAuthSubscription = authListener?.subscription || null

  await loadDashboardPage()
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateDashboardLayoutMode)
  window.removeEventListener("focus", handleDashboardFocusRefresh)

  if (dashboardAuthSubscription) {
    dashboardAuthSubscription.unsubscribe()
    dashboardAuthSubscription = null
  }
})

watch(
  () => route.path,
  async (currentPath) => {
    if (currentPath === "/dashboard") {
      await refreshDashboardUser()
    }
  }
)

async function handleDashboardFocusRefresh() {
  if (route.path !== "/dashboard") return

  await refreshDashboardUser()
}

async function loadDashboardPage() {
  loading.value = true

  const isUserReady = await refreshDashboardUser()

  if (!isUserReady) {
    loading.value = false
    router.push("/login")
    return
  }

  loading.value = false

  await loadRecentRooms()
}

async function refreshDashboardUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    return false
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser()

  if (userError || !userData.user) {
    user.value = sessionData.session.user
  } else {
    user.value = userData.user
  }

  userEmail.value = user.value.email || ""
  avatarLoadFailed.value = false

  return true
}

/* =========================================================
   SECTION 8: Room Helpers
========================================================= */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function formatRoomTime(value) {
  if (!value) return "Just now"

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })
}

/* =========================================================
   SECTION 9: Load Recent Rooms
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
      detail: error.message || "Check your Supabase rooms table.",
      time: "Now"
    })
    return
  }

  recentRooms.value = data || []
}

/* =========================================================
   SECTION 10: Create Room
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
    detail: `${cleanRoomName} replaced your previous room.`,
    time: "Now"
  })

  successMessage.value = `Room ${newRoomCode} created.`

  await loadRecentRooms()

  router.push(`/room/${newRoomCode}`)
}

/* =========================================================
   SECTION 11: Join Room
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
    detail: "Opening room workspace.",
    time: "Now"
  })

  router.push(`/room/${code}`)
}

/* =========================================================
   SECTION 12: Room Quick Actions
========================================================= */
function enterRoom(code) {
  if (!code || code === "None") {
    errorMessage.value = "Create a room first."
    return
  }

  router.push(`/room/${code}`)
}

function openLatestRoom() {
  enterRoom(latestRoomCode.value)
}

function openGameLauncher() {
  if (latestRoomCode.value === "None") {
    scrollToDashboardSection("dashboard-game-launcher")
    return
  }

  router.push(`/room/${latestRoomCode.value}`)
}

async function copyRoomCode(code) {
  errorMessage.value = ""
  successMessage.value = ""

  if (!code || code === "None") {
    errorMessage.value = "Create a room first."
    return
  }

  try {
    await navigator.clipboard.writeText(code)
    successMessage.value = `Room code ${code} copied.`
  } catch {
    errorMessage.value = "Could not copy room code."
  }
}

async function copyAccessLink() {
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await navigator.clipboard.writeText(currentAccessUrl.value)
    successMessage.value = "Access link copied."
  } catch {
    errorMessage.value = "Could not copy access link."
  }
}

async function copyLatestRoomInvite() {
  errorMessage.value = ""
  successMessage.value = ""

  if (latestRoomCode.value === "None") {
    errorMessage.value = "Create a room first."
    return
  }

  try {
    await navigator.clipboard.writeText(latestInviteLink.value)
    successMessage.value = `Invite link for ${latestRoomCode.value} copied.`
  } catch {
    errorMessage.value = "Could not copy invite link."
  }
}

/* =========================================================
   SECTION 13: Delete Room
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
    detail: "The old room and its members were removed.",
    time: "Now"
  })

  await loadRecentRooms()
}

/* =========================================================
   SECTION 14: Sign Out
========================================================= */
async function signOut() {
  await supabase.auth.signOut()
  router.push("/")
}
</script>

<template>
  <!-- =====================================================
       SECTION 1: Dashboard Shell
  ====================================================== -->
  <main class="dashboard-shell" :class="{ 'half-screen-mode': isHalfScreen }">

    <!-- ===================================================
         SECTION 2: Desktop Sidebar
    ==================================================== -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">◆</div>
        <strong>VOXYN</strong>
      </div>

      <nav class="side-nav">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          class="nav-item"
          :class="{ active: isNavItemActive(item) }"
          @click="handleNavClick(item)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <button
        class="sidebar-profile"
        type="button"
        @click="router.push('/profile')"
        :title="`Open ${displayName} profile`"
      >
        <img
          v-if="dashboardAvatarUrl"
          :src="dashboardAvatarUrl"
          :alt="displayName"
          class="sidebar-profile-img"
          @error="avatarLoadFailed = true"
        />

        <span v-else class="sidebar-profile-initial">
          {{ profileInitial }}
        </span>
      </button>
    </aside>

    <!-- ===================================================
         SECTION 3: Main Area
    ==================================================== -->
    <section class="main-area">

      <!-- =================================================
           SECTION 4: Topbar
      ================================================== -->
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="mobile-menu-btn"
            type="button"
            @click="toggleMobileMenu"
          >
            ⋯
          </button>

          <div class="topbar-title">
            <h1>VOXYN Control Center</h1>
            <p>Your hub for voice, rooms, and games.</p>
          </div>
        </div>

        <div class="topbar-actions">
          <span class="connection-pill">
            <span class="pulse-dot"></span>
            Connected
          </span>

          <button
            class="profile-circle"
            type="button"
            @click="router.push('/profile')"
            title="Open profile"
          >
            <img
              v-if="dashboardAvatarUrl"
              :src="dashboardAvatarUrl"
              :alt="displayName"
              class="profile-circle-img"
              @error="avatarLoadFailed = true"
            />

            <span v-else class="profile-initial">
              {{ profileInitial }}
            </span>
          </button>

          <button class="logout-btn" type="button" @click="signOut">
            Sign out
          </button>
        </div>
      </header>

      <!-- =================================================
           SECTION 5: Mobile Dropdown Menu
      ================================================== -->
      <div
        v-if="showMobileMenu"
        class="mobile-menu-backdrop"
        @click="closeMobileMenu"
      ></div>

      <div v-if="showMobileMenu" class="mobile-menu-panel">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          class="mobile-menu-item"
          :class="{ active: isNavItemActive(item) }"
          @click="handleNavClick(item)"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </button>
      </div>

      <!-- =================================================
           SECTION 6: Loading State
      ================================================== -->
      <section v-if="loading" class="loading-card">
        Loading dashboard...
      </section>

      <!-- =================================================
           SECTION 7: Dashboard Content
      ================================================== -->
      <template v-else>

        <!-- ===============================================
             SECTION 8: Hero
        ================================================ -->
        <section class="hero-panel">
          <div class="hero-copy">
            <p class="eyebrow">Start a Session</p>

            <h2>
              Launch a private room for
              <span>voice, chat, and mini games.</span>
            </h2>

            <p class="hero-description">
              Create a room, share the code, and bring friends into one live
              VOXYN workspace.
            </p>

            <div class="hero-actions">
              <button
                type="button"
                class="hero-primary"
                @click="scrollToDashboardSection('dashboard-room-control')"
              >
                <span>＋</span>
                Create Room
              </button>

              <button
                type="button"
                class="hero-secondary"
                @click="scrollToDashboardSection('dashboard-room-control')"
              >
                <span>↪</span>
                Join Room
              </button>

              <button
                type="button"
                class="hero-secondary"
                @click="openGameLauncher"
              >
                <span>⌘</span>
                Start Game
              </button>
            </div>
          </div>

          <div class="hero-visual" aria-hidden="true">
            <div class="orbit-ring ring-one"></div>
            <div class="orbit-ring ring-two"></div>

            <div class="voice-core">
              <span class="core-dot"></span>
              <span class="core-stem"></span>
            </div>

            <div class="floating-pill voice-pill">
              <span>▥</span>
              Voice
            </div>

            <div class="floating-pill chat-pill">
              <span>●</span>
              Chat
            </div>

            <div class="floating-pill game-pill">
              <span>⌘</span>
              Games
            </div>

            <div class="soft-orb orb-one"></div>
            <div class="soft-orb orb-two"></div>
          </div>
        </section>

        <!-- ===============================================
             SECTION 9: Message Bar
        ================================================ -->
        <div v-if="errorMessage || successMessage" class="message-row">
          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <p v-if="successMessage" class="success-message">
            {{ successMessage }}
          </p>
        </div>

        <!-- ===============================================
             SECTION 10: Main Dashboard Cards
        ================================================ -->
        <section class="summary-grid">
          <article class="summary-card current-room-card">
            <div class="card-topline">
              <span class="card-icon">▣</span>
              <span class="small-action">Current Room</span>
            </div>

            <div class="room-code-row">
              <h3>{{ latestRoomDisplay }}</h3>

              <span
                class="live-pill"
                :class="{ empty: latestRoomCode === 'None' }"
              >
                {{ latestRoomCode === "None" ? "Empty" : "Live" }}
              </span>
            </div>

            <p>
              {{ latestRoom ? latestRoom.room_name || "Untitled Room" : "Create your first room to begin." }}
            </p>

            <div class="link-strip">
              <span>
                {{ latestInviteLink || "No invite link yet" }}
              </span>

              <button
                type="button"
                :disabled="latestRoomCode === 'None'"
                @click="copyLatestRoomInvite"
              >
                Copy
              </button>
            </div>

            <div class="mini-actions">
              <button
                type="button"
                :disabled="latestRoomCode === 'None'"
                @click="openLatestRoom"
              >
                Open Room
              </button>

              <button
                type="button"
                :disabled="latestRoomCode === 'None'"
                @click="copyRoomCode(latestRoomCode)"
              >
                Copy Code
              </button>
            </div>
          </article>

          <article class="summary-card invite-card">
            <div class="card-topline">
              <span class="card-icon purple">↗</span>
              <span class="small-action">Invite Friends</span>
            </div>

            <p class="card-main-text">
              Share the link and bring friends into your room.
            </p>

            <div class="qr-wrap">
              <div class="fake-qr"></div>

              <div>
                <strong>{{ latestRoomDisplay }}</strong>
                <span>Room code</span>
              </div>
            </div>

            <button
              type="button"
              class="wide-soft-btn"
              :disabled="latestRoomCode === 'None'"
              @click="copyLatestRoomInvite"
            >
              Share Invite
            </button>
          </article>

          <article class="summary-card users-card">
            <div class="card-topline">
              <span class="status-dot"></span>
              <span class="small-action">Online Users</span>
            </div>

            <h3>{{ onlineUsersCount }}</h3>
            <p>Online now</p>

            <div class="avatar-stack">
              <span class="avatar-mini current-user">
                <img
                  v-if="dashboardAvatarUrl"
                  :src="dashboardAvatarUrl"
                  :alt="displayName"
                  @error="avatarLoadFailed = true"
                />

                <span v-else>{{ profileInitial }}</span>
              </span>

              <span class="avatar-mini">M</span>
              <span class="avatar-mini">A</span>
              <span class="avatar-mini">J</span>
              <span class="avatar-mini extra">+2</span>
            </div>

            <button type="button" class="wide-soft-btn">
              View All Users
            </button>
          </article>

          <article id="dashboard-voice-status" class="summary-card voice-card">
            <div class="card-topline">
              <span class="card-icon violet">▥</span>
              <span class="small-action">Voice Status</span>
            </div>

            <h3>Excellent</h3>
            <p>Voice quality is clear and stable.</p>

            <div class="voice-wave">
              <span></span>
            </div>

            <div class="voice-metrics">
              <div>
                <strong>18ms</strong>
                <span>Latency</span>
              </div>

              <div>
                <strong>0%</strong>
                <span>Packet Loss</span>
              </div>
            </div>
          </article>
        </section>

        <!-- ===============================================
             SECTION 11: Lower Dashboard Grid
        ================================================ -->
        <section class="workspace-grid">

          <!-- =============================================
               SECTION 11A: Room Control
          ============================================== -->
          <article id="dashboard-room-control" class="workspace-card room-control-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Rooms</p>
                <h2>Create or Join Room</h2>
              </div>

              <span class="soft-badge">Live MVP</span>
            </div>

            <div class="room-control-grid">
              <div class="control-box">
                <div class="control-box-heading">
                  <span class="control-icon">＋</span>

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
                  class="primary-action"
                  type="button"
                  :disabled="actionLoading"
                  @click="createRoom"
                >
                  {{ actionLoading ? "Creating..." : "Create Room" }}
                </button>
              </div>

              <div class="control-box">
                <div class="control-box-heading">
                  <span class="control-icon dark">↪</span>

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
                  type="button"
                  :disabled="actionLoading"
                  @click="joinRoom"
                >
                  Join Room
                </button>
              </div>
            </div>
          </article>

          <!-- =============================================
               SECTION 11B: Game Launcher
          ============================================== -->
          <article id="dashboard-game-launcher" class="workspace-card game-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Game Launcher</p>
                <h2>Mini games</h2>
              </div>

              <button type="button" class="text-action" @click="openGameLauncher">
                View all
              </button>
            </div>

            <p class="card-description">
              Jump into quick games with friends after entering a room.
            </p>

            <div class="game-list">
              <button
                v-for="game in gamePreviewList"
                :key="game.name"
                type="button"
                class="game-tile"
                @click="openGameLauncher"
              >
                <span>{{ game.icon }}</span>

                <div>
                  <strong>{{ game.name }}</strong>
                  <small>{{ game.detail }}</small>
                </div>
              </button>
            </div>
          </article>

          <!-- =============================================
               SECTION 11C: Recent Rooms
          ============================================== -->
          <article id="dashboard-my-rooms" class="workspace-card rooms-list-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">My Rooms</p>
                <h2>Your Rooms</h2>
              </div>

              <button type="button" class="text-action" @click="loadRecentRooms">
                Refresh
              </button>
            </div>

            <div v-if="recentRooms.length" class="room-list">
              <div
                v-for="room in recentRooms"
                :key="room.id || room.room_code"
                class="room-list-item"
              >
                <div>
                  <strong>{{ room.room_name || "Untitled Room" }}</strong>
                  <span>
                    {{ room.room_code }} · {{ formatRoomTime(room.created_at) }}
                  </span>
                </div>

                <div class="room-list-actions">
                  <span class="members-mini">1 / {{ room.max_members || 5 }}</span>

                  <button
                    type="button"
                    class="open-room-btn"
                    @click="enterRoom(room.room_code)"
                  >
                    Enter
                  </button>

                  <button
                    type="button"
                    class="delete-room-btn"
                    @click="deleteRoom(room)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <div>◇</div>
              <h3>No rooms yet</h3>
              <p>Create your first room to start building your VOXYN workspace.</p>
            </div>
          </article>

          <!-- =============================================
               SECTION 11D: Activity Feed
          ============================================== -->
          <article class="workspace-card activity-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Activity Feed</p>
                <h2>Recent activity</h2>
              </div>
            </div>

            <div class="activity-list">
              <div
                v-for="(item, index) in activityFeed"
                :key="`${item.title}-${index}`"
                class="activity-item"
              >
                <span class="activity-dot"></span>

                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.detail }}</p>
                </div>

                <small>{{ item.time }}</small>
              </div>
            </div>
          </article>

          <!-- =============================================
               SECTION 11E: Access Panel
          ============================================== -->
          <article class="workspace-card access-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Access</p>
                <h2>Invite & Server Access</h2>
              </div>

              <span
                class="soft-badge"
                :class="{ public: isPublicAccess }"
              >
                {{ accessModeLabel }}
              </span>
            </div>

            <div class="access-list">
              <div>
                <span>Current Access URL</span>
                <strong>{{ currentAccessUrl }}</strong>
                <p>{{ accessModeDetail }}</p>
              </div>

              <div>
                <span>Latest Room Code</span>
                <strong>{{ latestRoomDisplay }}</strong>
                <p>Room codes only work inside this VOXYN server instance.</p>
              </div>
            </div>

            <div class="access-actions">
              <button type="button" @click="copyAccessLink">
                Copy Access Link
              </button>

              <button
                type="button"
                :disabled="latestRoomCode === 'None'"
                @click="copyLatestRoomInvite"
              >
                Copy Invite Link
              </button>

              <button
                type="button"
                class="primary"
                :disabled="latestRoomCode === 'None'"
                @click="openLatestRoom"
              >
                Open Latest Room
              </button>
            </div>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Base / Tokens
========================================================= */
* {
  box-sizing: border-box;
}

button,
input {
  font-family: inherit;
}

button {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dashboard-shell {
  min-height: 100vh;
  padding-left: 112px;
  color: #101827;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "Segoe UI",
    sans-serif;
  background:
    radial-gradient(circle at 18% 4%, rgba(59, 130, 246, 0.1), transparent 28%),
    radial-gradient(circle at 88% 8%, rgba(168, 85, 247, 0.09), transparent 26%),
    linear-gradient(135deg, #f8fbff 0%, #f3f7fb 48%, #eef4fb 100%);
  overflow-x: hidden;
}

/* =========================================================
   SECTION 2: Sidebar
========================================================= */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  width: 92px;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border-right: 1px solid rgba(226, 232, 240, 0.86);
  box-shadow: 12px 0 36px rgba(15, 23, 42, 0.055);
  backdrop-filter: blur(22px);
}

.brand {
  width: 100%;
  display: grid;
  place-items: center;
  gap: 10px;
  margin-bottom: 34px;
}

.brand-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: white;
  font-size: 20px;
  font-weight: 950;
  background:
    radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.7), transparent 22%),
    linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.24);
}

.brand strong {
  display: none;
}

.side-nav {
  width: 100%;
  display: grid;
  gap: 12px;
}

.nav-item {
  width: 100%;
  min-height: 72px;
  padding: 10px 6px 8px;
  display: grid;
  place-items: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: transparent;
  color: #475569;
  font-size: 11px;
  line-height: 1.1;
  font-weight: 850;
  text-align: center;
}

.nav-icon {
  color: #64748b;
  font-size: 22px;
  line-height: 1;
  font-weight: 950;
}

.nav-item.active,
.nav-item:hover {
  color: #2563eb;
  background: rgba(239, 246, 255, 0.96);
  border-color: rgba(191, 219, 254, 0.7);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.12);
}

.nav-item.active .nav-icon,
.nav-item:hover .nav-icon {
  color: #4f46e5;
}

.sidebar-profile {
  width: 58px;
  height: 58px;
  margin-top: auto;
  padding: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: none;
  border-radius: 20px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.22);
}

.sidebar-profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-profile-initial {
  font-size: 18px;
  font-weight: 950;
}

/* =========================================================
   SECTION 3: Main / Topbar
========================================================= */
.main-area {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 28px;
}

.topbar {
  min-height: 92px;
  margin-bottom: 22px;
  padding: 0 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: 0 10px 34px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(22px);
}

.topbar-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-title {
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.topbar-title p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-pill {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 16px;
  border-radius: 999px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.pulse-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.86);
}

.profile-circle {
  width: 54px;
  height: 54px;
  padding: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.profile-circle-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-initial {
  font-size: 22px;
  font-weight: 950;
}

.logout-btn {
  min-height: 44px;
  padding: 10px 18px;
  border: none;
  border-radius: 15px;
  color: white;
  background: #0f172a;
  font-size: 14px;
  font-weight: 950;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
}

.mobile-menu-btn {
  display: none;
}

/* =========================================================
   SECTION 4: Mobile Menu
========================================================= */
.mobile-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: transparent;
}

.mobile-menu-panel {
  position: absolute;
  top: 110px;
  left: 18px;
  z-index: 50;
  width: 260px;
  padding: 12px;
  display: grid;
  gap: 6px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(18px);
}

.mobile-menu-item {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #334155;
  text-align: left;
  font-weight: 900;
}

.mobile-menu-item.active,
.mobile-menu-item:hover {
  color: #2563eb;
  background: #eff6ff;
}

/* =========================================================
   SECTION 5: Loading / Messages
========================================================= */
.loading-card {
  min-height: 150px;
  padding: 32px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: 0 10px 34px rgba(15, 23, 42, 0.07);
  color: #334155;
  font-weight: 900;
}

.message-row {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.error-message,
.success-message {
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 850;
}

.error-message {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.success-message {
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

/* =========================================================
   SECTION 6: Hero
========================================================= */
.hero-panel {
  position: relative;
  min-height: 270px;
  margin-bottom: 20px;
  padding: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  align-items: center;
  gap: 36px;
  overflow: hidden;
  border-radius: 30px;
  background:
    radial-gradient(circle at 76% 18%, rgba(59, 130, 246, 0.2), transparent 30%),
    radial-gradient(circle at 96% 95%, rgba(168, 85, 247, 0.11), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(239, 246, 255, 0.78));
  border: 1px solid rgba(191, 219, 254, 0.58);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(22px);
}

.eyebrow {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-copy h2 {
  max-width: 760px;
  margin: 0;
  color: #101827;
  font-size: clamp(40px, 4.4vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.068em;
}

.hero-copy h2 span {
  display: block;
}

.hero-description {
  max-width: 560px;
  margin: 18px 0 0;
  color: #64748b;
  font-size: 17px;
  line-height: 1.65;
  font-weight: 700;
}

.hero-actions {
  margin-top: 26px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.hero-primary,
.hero-secondary {
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px;
  border-radius: 17px;
  font-size: 15px;
  font-weight: 950;
}

.hero-primary {
  border: none;
  color: white;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.24);
}

.hero-secondary {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(203, 213, 225, 0.82);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.hero-visual {
  position: relative;
  width: 520px;
  height: 250px;
  justify-self: end;
}

.orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(147, 197, 253, 0.46);
}

.ring-one {
  inset: 8px 54px 24px 20px;
  transform: rotate(-9deg);
}

.ring-two {
  inset: 28px 74px 48px 40px;
  transform: rotate(12deg);
}

.voice-core {
  position: absolute;
  left: 170px;
  top: 42px;
  width: 190px;
  height: 150px;
  display: grid;
  place-items: center;
  border-radius: 38px;
  background:
    radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.86), transparent 20%),
    linear-gradient(135deg, #60a5fa, #2563eb 54%, #7dd3fc);
  box-shadow:
    0 32px 70px rgba(37, 99, 235, 0.26),
    inset 0 1px 2px rgba(255, 255, 255, 0.55);
}

.voice-core::after {
  content: "";
  position: absolute;
  inset: 26px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
}

.core-dot {
  position: absolute;
  top: 51px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
}

.core-stem {
  position: absolute;
  top: 94px;
  width: 36px;
  height: 64px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
}

.floating-pill {
  position: absolute;
  z-index: 3;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  border-radius: 999px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

.floating-pill span {
  color: #2563eb;
  letter-spacing: 0;
}

.voice-pill {
  left: 48px;
  top: 92px;
}

.chat-pill {
  right: 14px;
  top: 44px;
}

.game-pill {
  right: 0;
  bottom: 44px;
}

.soft-orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(147, 197, 253, 0.38));
  filter: blur(0.2px);
}

.orb-one {
  width: 34px;
  height: 34px;
  left: 72px;
  bottom: 28px;
}

.orb-two {
  width: 26px;
  height: 26px;
  right: 92px;
  bottom: 20px;
}

/* =========================================================
   SECTION 7: Summary Cards
========================================================= */
.summary-grid {
  display: grid;
  grid-template-columns: 1.22fr 1fr 1fr 1fr;
  gap: 18px;
  margin-bottom: 20px;
}

.summary-card,
.workspace-card {
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.065);
  backdrop-filter: blur(20px);
}

.summary-card {
  min-height: 184px;
  padding: 24px;
}

.card-topline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon,
.control-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 18px;
  font-weight: 950;
}

.card-icon.purple {
  color: #7c3aed;
  background: #f3e8ff;
}

.card-icon.violet {
  color: #4f46e5;
  background: #eef2ff;
}

.small-action {
  color: #334155;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: 0.02em;
}

.room-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -0.045em;
}

.summary-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.55;
  font-weight: 700;
}

.live-pill,
.soft-badge {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  color: #15803d;
  background: #dcfce7;
  font-size: 12px;
  font-weight: 950;
  white-space: nowrap;
}

.live-pill.empty {
  color: #64748b;
  background: #f1f5f9;
}

.link-strip {
  min-height: 44px;
  margin-top: 18px;
  padding: 6px 8px 6px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 15px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.link-strip span {
  min-width: 0;
  flex: 1;
  color: #2563eb;
  font-size: 13px;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-strip button,
.wide-soft-btn,
.mini-actions button {
  border: 1px solid #e2e8f0;
  color: #2563eb;
  background: white;
  font-size: 13px;
  font-weight: 950;
}

.link-strip button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 11px;
}

.mini-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.mini-actions button,
.wide-soft-btn {
  min-height: 42px;
  border-radius: 14px;
}

.card-main-text {
  min-height: 48px;
}

.qr-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 18px 0 14px;
}

.fake-qr {
  width: 74px;
  height: 74px;
  border-radius: 14px;
  background:
    linear-gradient(90deg, #0f172a 10px, transparent 10px) 0 0 / 18px 18px,
    linear-gradient(#0f172a 10px, transparent 10px) 0 0 / 18px 18px,
    repeating-conic-gradient(#0f172a 0% 25%, white 0% 50%) 0 0 / 18px 18px;
  border: 8px solid white;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
}

.qr-wrap strong,
.qr-wrap span {
  display: block;
}

.qr-wrap strong {
  color: #0f172a;
  font-size: 18px;
}

.qr-wrap span {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 13px rgba(34, 197, 94, 0.75);
}

.avatar-stack {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
}

.avatar-mini {
  width: 36px;
  height: 36px;
  margin-left: -8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  border: 3px solid white;
  color: #0f172a;
  background: #e0f2fe;
  font-size: 12px;
  font-weight: 950;
}

.avatar-mini:first-child {
  margin-left: 0;
}

.avatar-mini img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-mini.extra {
  background: #f1f5f9;
  color: #475569;
}

.voice-card h3 {
  color: #16a34a;
}

.voice-wave {
  height: 48px;
  margin: 22px 0 12px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 30% 50%, rgba(34, 197, 94, 0.12), transparent 36%),
    linear-gradient(180deg, transparent 48%, rgba(34, 197, 94, 0.75) 49%, transparent 52%);
}

.voice-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-radius: 15px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.voice-metrics div {
  padding: 11px 14px;
  background: #f8fafc;
}

.voice-metrics div + div {
  border-left: 1px solid #e2e8f0;
}

.voice-metrics strong,
.voice-metrics span {
  display: block;
}

.voice-metrics strong {
  color: #0f172a;
  font-size: 13px;
}

.voice-metrics span {
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

/* =========================================================
   SECTION 8: Workspace Grid
========================================================= */
.workspace-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 20px;
  align-items: start;
}

.workspace-card {
  padding: 24px;
}

.room-control-card {
  grid-column: span 2;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.text-action {
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  color: #2563eb;
  background: white;
  font-size: 12px;
  font-weight: 950;
}

.room-control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.control-box {
  padding: 20px;
  border-radius: 22px;
  background:
    radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08), transparent 30%),
    #f8fafc;
  border: 1px solid #e2e8f0;
}

.control-box-heading {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.control-icon {
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.18);
}

.control-icon.dark {
  background: #0f172a;
}

.control-box h3 {
  margin: 0 0 7px;
  color: #0f172a;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.control-box p,
.card-description {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.55;
  font-weight: 700;
}

label {
  display: block;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

input {
  width: 100%;
  min-height: 50px;
  margin: 10px 0 18px;
  padding: 0 15px;
  border-radius: 15px;
  outline: none;
  border: 1px solid #cbd5e1;
  background: white;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
}

input::placeholder {
  color: #94a3b8;
}

input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.13);
}

.member-limit {
  margin-bottom: 18px;
}

.member-limit > span {
  display: block;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

.limit-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.limit-btn {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  color: #475569;
  background: white;
  font-weight: 950;
}

.limit-btn.active,
.limit-btn:hover {
  color: white;
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}

.primary-action,
.secondary-action {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 15px;
  font-weight: 950;
}

.primary-action {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.22);
}

.secondary-action {
  background: #0f172a;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
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

/* =========================================================
   SECTION 9: Game / Rooms / Activity / Access
========================================================= */
.game-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.game-tile {
  min-height: 72px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  text-align: left;
}

.game-tile span {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 15px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  font-size: 17px;
  font-weight: 950;
}

.game-tile strong,
.game-tile small {
  display: block;
}

.game-tile strong {
  color: #0f172a;
  font-size: 14px;
}

.game-tile small {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.room-list {
  display: grid;
  gap: 12px;
}

.room-list-item {
  min-height: 70px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.room-list-item strong,
.room-list-item span {
  display: block;
}

.room-list-item strong {
  color: #0f172a;
  font-size: 15px;
}

.room-list-item span {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.room-list-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.members-mini {
  min-height: 32px;
  padding: 8px 12px;
  border-radius: 999px;
  color: #15803d;
  background: #dcfce7;
  font-size: 12px;
  font-weight: 950;
}

.open-room-btn,
.delete-room-btn {
  min-height: 36px;
  padding: 8px 13px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
}

.open-room-btn {
  color: white;
  background: #2563eb;
}

.delete-room-btn {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 28px;
  border-radius: 22px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.empty-state div {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 10px;
  border-radius: 20px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 28px;
}

.empty-state h3 {
  margin: 0;
  color: #0f172a;
}

.empty-state p {
  max-width: 420px;
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.activity-list {
  display: grid;
  gap: 12px;
}

.activity-item {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.7);
}

.activity-item strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.activity-item p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.activity-item small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.access-card {
  grid-column: span 2;
}

.access-list {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 14px;
  margin-bottom: 16px;
}

.access-list div {
  padding: 16px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.1), transparent 36%),
    #f8fafc;
  border: 1px solid #e2e8f0;
}

.access-list span,
.access-list strong,
.access-list p {
  display: block;
}

.access-list span {
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.access-list strong {
  margin-top: 7px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  word-break: break-all;
}

.access-list p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

.access-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.access-actions button {
  min-height: 42px;
  padding: 10px 12px;
  border-radius: 15px;
  border: 1px solid #cbd5e1;
  color: #334155;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 950;
}

.access-actions button.primary {
  color: white;
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}
/* =========================================================
   SECTION 10.5: Half Screen Final Layout Fix
   Purpose:
   - Fix half-screen topbar
   - Prevent hero text from becoming vertical
   - Let hero visual become background decoration
   - Keep dashboard usable on medium width screens
========================================================= */
.dashboard-shell.half-screen-mode {
  padding-left: 0 !important;
}

.dashboard-shell.half-screen-mode .sidebar {
  display: none !important;
}

.dashboard-shell.half-screen-mode .main-area {
  padding: 18px !important;
}

/* =========================================================
   SECTION 10.5A: Half Screen Topbar
========================================================= */
.dashboard-shell.half-screen-mode .topbar {
  min-height: 78px !important;
  padding: 12px 18px !important;

  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 14px !important;

  border-radius: 24px !important;
}

.dashboard-shell.half-screen-mode .topbar-left {
  min-width: 0 !important;

  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.dashboard-shell.half-screen-mode .mobile-menu-btn {
  width: 48px !important;
  height: 48px !important;
  flex-shrink: 0 !important;

  display: grid !important;
  place-items: center !important;

  border: 1px solid rgba(203, 213, 225, 0.9) !important;
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.74) !important;
  color: #0f172a !important;

  font-size: 26px !important;
  line-height: 1 !important;
}

.dashboard-shell.half-screen-mode .topbar-title {
  min-width: 0 !important;
  overflow: hidden !important;
}

.dashboard-shell.half-screen-mode .topbar-title h1 {
  max-width: 100% !important;
  margin: 0 !important;

  font-size: clamp(22px, 3vw, 30px) !important;
  line-height: 1.05 !important;
  letter-spacing: -0.045em !important;

  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.dashboard-shell.half-screen-mode .topbar-title p {
  max-width: 100% !important;
  margin-top: 5px !important;

  font-size: 13px !important;
  line-height: 1.2 !important;

  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.dashboard-shell.half-screen-mode .topbar-actions {
  min-width: max-content !important;

  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 10px !important;
}

.dashboard-shell.half-screen-mode .connection-pill {
  min-height: 40px !important;
  padding: 9px 14px !important;
  font-size: 13px !important;
}

.dashboard-shell.half-screen-mode .profile-circle {
  width: 48px !important;
  height: 48px !important;
  flex-shrink: 0 !important;
}

.dashboard-shell.half-screen-mode .logout-btn {
  min-height: 44px !important;
  padding: 10px 16px !important;
  border-radius: 15px !important;

  font-size: 14px !important;
  white-space: nowrap !important;
}

/* =========================================================
   SECTION 10.5B: Half Screen Hero Fix
   Purpose:
   - Give text full width
   - Move visual to background/right side
   - Stop one-word-per-line wrapping
========================================================= */
.dashboard-shell.half-screen-mode .hero-panel {
  position: relative !important;

  min-height: 430px !important;
  padding: 34px !important;

  display: block !important;
  grid-template-columns: none !important;

  overflow: hidden !important;
}

.dashboard-shell.half-screen-mode .hero-copy {
  position: relative !important;
  z-index: 2 !important;

  max-width: 620px !important;
}

.dashboard-shell.half-screen-mode .hero-copy h2 {
  max-width: 620px !important;

  font-size: clamp(34px, 5vw, 54px) !important;
  line-height: 1.05 !important;
  letter-spacing: -0.06em !important;

  white-space: normal !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}

.dashboard-shell.half-screen-mode .hero-copy h2 span {
  display: inline !important;
}

.dashboard-shell.half-screen-mode .hero-description {
  max-width: 500px !important;

  font-size: 15px !important;
  line-height: 1.55 !important;

  white-space: normal !important;
  word-break: normal !important;
}

.dashboard-shell.half-screen-mode .hero-actions {
  max-width: 620px !important;

  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
}

.dashboard-shell.half-screen-mode .hero-primary,
.dashboard-shell.half-screen-mode .hero-secondary {
  min-height: 50px !important;
  padding: 0 18px !important;

  font-size: 14px !important;
}

.dashboard-shell.half-screen-mode .hero-visual {
  position: absolute !important;
  z-index: 1 !important;

  right: -10px !important;
  bottom: 18px !important;

  width: 430px !important;
  height: 230px !important;

  opacity: 0.9 !important;
  transform: scale(0.86) !important;
  transform-origin: center !important;

  pointer-events: none !important;
}

/* =========================================================
   SECTION 10.5C: Half Screen Cards
========================================================= */
.dashboard-shell.half-screen-mode .summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

.dashboard-shell.half-screen-mode .workspace-grid {
  grid-template-columns: 1fr !important;
}

.dashboard-shell.half-screen-mode .room-control-card,
.dashboard-shell.half-screen-mode .access-card {
  grid-column: auto !important;
}


/* =========================================================
   SECTION 10.6: Narrow Screen Final Protection
   Purpose:
   - Hide hero visual before it squeezes text
   - Hide connected pill first
   - Keep topbar one row
========================================================= */
@media (max-width: 900px) {
  .dashboard-shell.half-screen-mode .connection-pill {
    display: none !important;
  }

  .dashboard-shell.half-screen-mode .hero-panel {
    min-height: auto !important;
    padding: 30px 24px !important;
  }

  .dashboard-shell.half-screen-mode .hero-visual {
    display: none !important;
  }

  .dashboard-shell.half-screen-mode .hero-copy {
    max-width: 100% !important;
  }

  .dashboard-shell.half-screen-mode .hero-copy h2 {
    max-width: 100% !important;
    font-size: clamp(34px, 7vw, 48px) !important;
  }

  .dashboard-shell.half-screen-mode .hero-description {
    max-width: 100% !important;
  }
}

@media (max-width: 760px) {
  .dashboard-shell.half-screen-mode .summary-grid {
    grid-template-columns: 1fr !important;
  }

  .dashboard-shell.half-screen-mode .topbar {
    min-height: 74px !important;
    padding: 10px 14px !important;
  }

  .dashboard-shell.half-screen-mode .topbar-title h1 {
    font-size: 22px !important;
  }

  .dashboard-shell.half-screen-mode .topbar-title p {
    font-size: 12px !important;
  }

  .dashboard-shell.half-screen-mode .mobile-menu-btn {
    width: 44px !important;
    height: 44px !important;
  }

  .dashboard-shell.half-screen-mode .profile-circle {
    width: 44px !important;
    height: 44px !important;
  }

  .dashboard-shell.half-screen-mode .logout-btn {
    min-height: 42px !important;
    padding: 9px 14px !important;
    font-size: 13px !important;
  }
}

@media (max-width: 560px) {
  .dashboard-shell.half-screen-mode .topbar {
    min-height: 70px !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
  }

  .dashboard-shell.half-screen-mode .topbar-title h1 {
    font-size: 20px !important;
  }

  .dashboard-shell.half-screen-mode .topbar-title p {
    display: none !important;
  }

  .dashboard-shell.half-screen-mode .topbar-actions {
    gap: 8px !important;
  }

  .dashboard-shell.half-screen-mode .profile-circle {
    width: 40px !important;
    height: 40px !important;
  }

  .dashboard-shell.half-screen-mode .logout-btn {
    min-height: 40px !important;
    padding: 8px 12px !important;
    border-radius: 14px !important;
    font-size: 12px !important;
  }

  .dashboard-shell.half-screen-mode .hero-copy h2 {
    font-size: 34px !important;
  }

  .dashboard-shell.half-screen-mode .hero-actions {
    display: grid !important;
    grid-template-columns: 1fr !important;
  }

  .dashboard-shell.half-screen-mode .hero-primary,
  .dashboard-shell.half-screen-mode .hero-secondary {
    justify-content: center !important;
  }
}

/* =========================================================
   SECTION 11: Responsive
========================================================= */
@media (max-width: 980px) {
  .topbar {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 18px;
  }

  .topbar-actions {
    justify-content: flex-end;
  }

  .hero-panel {
    padding: 28px;
  }

  .hero-visual {
    width: 430px;
    transform: scale(0.9);
    transform-origin: center;
  }

  .room-control-grid,
  .access-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-shell {
    padding-left: 0;
  }

  .sidebar {
    display: none;
  }

  .main-area {
    padding: 14px;
  }

  .mobile-menu-btn {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 16px;
    color: #0f172a;
    background: rgba(255, 255, 255, 0.74);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    font-size: 28px;
    line-height: 1;
  }

  .connection-pill {
    display: none;
  }

  .hero-panel,
  .summary-card,
  .workspace-card {
    border-radius: 22px;
  }

  .hero-copy h2 {
    font-size: 38px;
  }

  .hero-visual {
    display: none;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .room-control-card,
  .access-card {
    grid-column: auto;
  }

  .room-list-item {
    grid-template-columns: 1fr;
  }

  .room-list-actions {
    flex-wrap: wrap;
  }

  .access-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .topbar-title h1 {
    font-size: 23px;
  }

  .topbar-actions {
    flex-wrap: wrap;
  }

  .logout-btn {
    flex: 1;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-primary,
  .hero-secondary {
    justify-content: center;
  }

  .game-list {
    grid-template-columns: 1fr;
  }

  .mini-actions {
    grid-template-columns: 1fr;
  }
}
</style>