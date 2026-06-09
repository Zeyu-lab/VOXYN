<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Load router / route
   - Load Supabase client
   - Load Socket.IO client
========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { supabase, socket } from "../lib/supabaseClient"
import { useVoiceRoom } from "../webrtc/useVoiceRoom.js"
console.log("VOXYN v0.52 RoomView build loaded")
import GameStage from "../components/games/GameStage.vue"

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
   SECTION 3.2: WebRTC Voice State
   Purpose:
   - Use isolated WebRTC voice logic from src/webrtc
   - Keep RoomView focused on UI and room behavior
   - Prepare remote audio elements for real WebRTC playback
   - Keep Game Screen headphone control connected to real audio
========================================================= */
console.log("useVoiceRoom loaded")

const {
  localStream,
  remoteStreams,
  isMicOn,
  isDeafened,
  isSpeaking,
  isVoiceReady,
  voiceError,
  startLocalAudio,
  toggleMicrophone,
  toggleHeadphones,
  connectToPeer,
  handleVoiceOffer,
  handleVoiceAnswer,
  handleVoiceIceCandidate,
  syncVoicePeers,
  removePeerConnection,
  cleanupVoiceRoom
} = useVoiceRoom()

const remoteAudioElements = new Map()

const remoteAudioItems = computed(() => {
  return Object.entries(remoteStreams.value).map(([socketId, stream]) => {
    return {
      socketId,
      stream
    }
  })
})

function syncRemoteAudioMuteState() {
  remoteAudioElements.forEach((element) => {
    if (!element) return

    element.muted = isDeafened.value
    element.volume = isDeafened.value ? 0 : 1
  })
}

function bindRemoteAudioElement(element, stream, socketId) {
  if (!socketId) return

  if (!element) {
    remoteAudioElements.delete(socketId)
    return
  }

  remoteAudioElements.set(socketId, element)

  if (element.srcObject !== stream) {
    element.srcObject = stream
  }

  element.autoplay = true
  element.playsInline = true
  element.muted = isDeafened.value
  element.volume = isDeafened.value ? 0 : 1

  element.play().catch((error) => {
    console.warn("VOXYN voice: remote audio play blocked", error)
  })
}

watch(isDeafened, () => {
  syncRemoteAudioMuteState()
})

/* =========================================================
   SECTION 4: Current Room Control Strip State
   Purpose:
   - Replace create-room form inside RoomView
   - Show useful current room information
   - Keep RoomView focused on using the current room
========================================================= */
const roomControlSubtitle = "Invite friends, manage voice, and keep this room active."

/* =========================================================
   SECTION 5: UI State
   Purpose:
   - Control room workspace tabs and selected voice channel
========================================================= */
const selectedTab = ref("Game")
const selectedVoiceChannel = ref("Lobby")

const defaultVoiceChannel = "Lobby"
const hasAutoJoinedDefaultVoice = ref(false)
const hasManuallyLeftVoice = ref(false)
const voiceJoinLoading = ref(false)
const voiceLeaveLoading = ref(false)
const voiceStatusMessage = ref("")

const hasJoinedVoice = computed(() => {
  return (
    isVoiceReady.value &&
    Boolean(localStream.value) &&
    !hasManuallyLeftVoice.value
  )
})

const voicePanelStatus = computed(() => {
  if (voiceJoinLoading.value) {
    return `Connecting to ${selectedVoiceChannel.value}...`
  }

  if (voiceLeaveLoading.value) {
    return "Leaving voice channel..."
  }

  if (hasJoinedVoice.value) {
    return `Connected to ${selectedVoiceChannel.value}`
  }

  if (hasManuallyLeftVoice.value) {
    return `You left ${selectedVoiceChannel.value}. Click Enable Voice to rejoin.`
  }

  if (voiceStatusMessage.value) {
    return voiceStatusMessage.value
  }

  return `You are in ${selectedVoiceChannel.value}. Click Enable Voice to talk.`
})

const tabs = [
  {
    label: "Game",
    icon: "▱"
  },
  {
    label: "Voice",
    icon: "◉"
  },
  {
    label: "Settings",
    icon: "⚙"
  }
]

const roomRailItems = [
  {
    label: "Dashboard",
    icon: "▦",
    route: "/dashboard"
  },
  {
    label: "My Rooms",
    icon: "⌂",
    route: "/dashboard"
  },
  {
    label: "Voice Rooms",
    icon: "◉",
    route: null
  },
  {
    label: "Games",
    icon: "◇",
    route: null
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

function goRoomRail(item) {
  if (item.route) {
    router.push(item.route)
  }
}

const voiceChannelNames = ["Lobby", "Squad", "Break"]

const voiceChannels = computed(() => {
  return voiceChannelNames.map((name) => {
    const usersInChannel = onlineUsers.value
      .filter((onlineUser) => {
        return onlineUser.voiceChannel === name
      })
      .map((onlineUser, index) => {
        return normalizeVoiceUser(onlineUser, index)
      })

    return {
      name,
      count: usersInChannel.length,
      users: usersInChannel
    }
  })
})

const currentVoiceMembers = computed(() => {
  return onlineUsers.value
    .filter((onlineUser) => {
      return onlineUser.voiceChannel === selectedVoiceChannel.value
    })
    .map((onlineUser, index) => {
      return normalizeVoiceUser(onlineUser, index)
    })
})

const chatMessages = ref([
  {
    id: "local-system-ready",
    sender: "System",
    senderInitial: "S",
    avatarUrl: "",
    text: "Room workspace is ready.",
    time: "Now",
    type: "system"
  }
])
/* =========================================================
   SECTION 5.01: Room Stage / Game Screen State
   Purpose:
   - Stage 1 stays as Room Workspace
   - Stage 2 becomes Game Focus Mode
   - Game Screen controls use real WebRTC voice state
========================================================= */
const roomStage = ref("workspace")
const gameFrameRef = ref(null)
const isStageOneGameFullscreen = ref(false)

const gameLatencyLabel = "24ms"

const isGameFocusMode = computed(() => {
  return roomStage.value === "game-focus"
})

const gameStageTitle = computed(() => {
  return isGameFocusMode.value ? "Game Focus Mode" : "Game Area"
})

const gameStageSubtitle = computed(() => {
  return isGameFocusMode.value
    ? "Focus on the game while voice and chat stay connected."
    : "Gather your team and start playing."
})

const primaryGameButtonLabel = computed(() => {
  return isGameFocusMode.value ? "↩ Back to Room" : "▶ Start Game"
})

const gameVoiceStatusLabel = computed(() => {
  if (!hasJoinedVoice.value) {
    return "Voice not connected"
  }

  if (isDeafened.value) {
    return "Deafened"
  }

  if (!isMicOn.value) {
    return "Muted / Listening"
  }

  if (isSpeaking.value) {
    return "Speaking"
  }

  return "Mic on / Listening"
})

/* =========================================================
   SECTION 5.02: Room Stage / Game Screen Actions
   Purpose:
   - Toggle Stage 1 / Stage 2 without destroying voice state
   - Bind Game Screen mic and headphone buttons to real WebRTC
========================================================= */
function enterStageTwoGame() {
  roomStage.value = "game-focus"
  selectedTab.value = "Game"
  successMessage.value = ""
}

function exitStageTwoGame() {
  roomStage.value = "workspace"
  selectedTab.value = "Game"
  successMessage.value = ""
}

function toggleGameFocusMode() {
  if (isGameFocusMode.value) {
    exitStageTwoGame()
    return
  }

  enterStageTwoGame()
}

async function toggleStageOneGameFullscreen() {
  toggleGameFocusMode()
}

function updateStageOneFullscreenState() {
  isStageOneGameFullscreen.value = false
}

function handleStageOneFullscreenShortcut(event) {
  const activeTag = document.activeElement?.tagName?.toLowerCase()

  if (activeTag === "input" || activeTag === "textarea") return
  if (event.key?.toLowerCase() !== "f") return
  if (!gameFrameRef.value) return

  event.preventDefault()
  toggleGameFocusMode()
}

async function toggleGameScreenMicrophone() {
  errorMessage.value = ""

  if (!hasJoinedVoice.value) {
    await joinVoiceChannel(selectedVoiceChannel.value || defaultVoiceChannel)
    return
  }

  await toggleRoomMicrophone()
}

async function toggleGameScreenHeadphones() {
  errorMessage.value = ""

  if (!hasJoinedVoice.value) {
    await joinVoiceChannel(selectedVoiceChannel.value || defaultVoiceChannel)
    return
  }

  await toggleRoomHeadphones()
}

/* =========================================================
   SECTION 5.1: Voice Channel Actions
   Purpose:
   - Join a fixed voice channel
   - Start local microphone before entering voice state
   - Sync mic / headphone / speaking state with backend
   - Start real WebRTC peer connection with users in same channel
   - Auto-connect default Lobby after room socket is ready
========================================================= */
async function joinVoiceChannel(channelName = defaultVoiceChannel, options = {}) {
  const targetChannel = channelName || defaultVoiceChannel

  selectedVoiceChannel.value = targetChannel
  hasManuallyLeftVoice.value = false
  errorMessage.value = ""
  voiceStatusMessage.value = ""

  if (voiceJoinLoading.value) return

  voiceJoinLoading.value = true

  try {
    const stream = await ensureVoiceReady(options)

    if (!stream) {
      voiceStatusMessage.value =
        "Voice is not enabled yet. Click Enable Voice or select a channel."
      return
    }

    if (!socket.connected) {
      errorMessage.value = "Voice server is not connected."
      voiceStatusMessage.value = "Voice server is not connected."
      return
    }

    socket.emit(
      "voice:join",
      {
        roomCode: roomCode.value,
        voiceChannel: targetChannel,
        userId: user.value?.id || "",
        username: displayName.value,
        avatarUrl: avatarUrl.value,
        initial: profileInitial.value,

        micOn: isMicOn.value,
        deafened: isDeafened.value,
        speaking: isMicOn.value && !isDeafened.value && isSpeaking.value,

        isMicOn: isMicOn.value,
        isDeafened: isDeafened.value,
        isSpeaking: isMicOn.value && !isDeafened.value && isSpeaking.value
      },
      (response) => {
        if (!response?.ok) {
          errorMessage.value =
            response?.error || "Could not join voice channel."

          voiceStatusMessage.value =
            response?.error || "Could not join voice channel."

          return
        }
        hasAutoJoinedDefaultVoice.value = true
        hasManuallyLeftVoice.value = false
        voiceStatusMessage.value = `Connected to ${targetChannel}`

        emitVoiceState()
        syncCurrentVoicePeers()
      }
    )
  } catch (error) {
    console.error("VOXYN voice: failed to join channel", error)

    if (!options.silentFail) {
      errorMessage.value = "Microphone could not start."
    }

    voiceStatusMessage.value =
      "Microphone permission is needed before you can talk."
  } finally {
    voiceJoinLoading.value = false
  }
}

function clearCurrentUserFromVoiceList() {
  onlineUsers.value = onlineUsers.value.map((onlineUser) => {
    const isCurrent =
      onlineUser.socketId === socket.id ||
      onlineUser.userId === user.value?.id

    if (!isCurrent) {
      return onlineUser
    }

    return {
      ...onlineUser,
      voiceChannel: null,
      micOn: false,
      deafened: false,
      speaking: false,
      isMicOn: false,
      isDeafened: false,
      isSpeaking: false
    }
  })
}

async function leaveVoiceChannel() {
  if (voiceLeaveLoading.value) return

  voiceLeaveLoading.value = true
  errorMessage.value = ""

  const previousChannel = selectedVoiceChannel.value || defaultVoiceChannel

  try {
    cleanupVoiceRoom()

    hasManuallyLeftVoice.value = true
    hasAutoJoinedDefaultVoice.value = true

    clearCurrentUserFromVoiceList()

    voiceStatusMessage.value =
      `You left ${previousChannel}. Click Enable Voice to rejoin.`

    if (!socket.connected) {
      return
    }

    socket.emit(
      "voice:leave",
      {
        roomCode: roomCode.value,
        previousVoiceChannel: previousChannel,

        userId: user.value?.id || "",
        username: displayName.value,
        avatarUrl: avatarUrl.value,
        initial: profileInitial.value,

        voiceChannel: null,

        micOn: false,
        deafened: false,
        speaking: false,

        isMicOn: false,
        isDeafened: false,
        isSpeaking: false
      },
      (response) => {
        if (!response?.ok) {
          console.warn("VOXYN voice: leave failed", response)

          errorMessage.value =
            response?.error || "Could not leave voice channel."
        }
      }
    )
  } catch (error) {
    console.error("VOXYN voice: failed to leave channel", error)
    errorMessage.value = "Could not leave voice channel."
  } finally {
    voiceLeaveLoading.value = false
  }
}

async function autoJoinDefaultVoiceChannel() {
  if (hasAutoJoinedDefaultVoice.value) return
  if (hasManuallyLeftVoice.value) return
  if (!socket.connected) return
  if (!user.value) return

  hasAutoJoinedDefaultVoice.value = true
  selectedVoiceChannel.value = defaultVoiceChannel

  await joinVoiceChannel(defaultVoiceChannel, {
    silentFail: true
  })
}

async function ensureVoiceReady(options = {}) {
  if (isVoiceReady.value && localStream.value) {
    return localStream.value
  }

  try {
    const stream = await startLocalAudio()

    if (!stream) {
      if (!options.silentFail) {
        errorMessage.value = voiceError.value || "Microphone could not start."
      }

      voiceStatusMessage.value =
        voiceError.value || "Microphone permission is required."

      return null
    }

    return stream
  } catch (error) {
    console.error("VOXYN voice: microphone start failed", error)

    if (!options.silentFail) {
      errorMessage.value = "Microphone could not start."
    }

    voiceStatusMessage.value =
      "Microphone permission is required before voice can start."

    return null
  }
}

function emitVoiceState() {
  if (!socket.connected || !roomCode.value || !user.value) return

  const currentSpeaking =
    isMicOn.value && !isDeafened.value && isSpeaking.value

  const payload = {
    roomCode: roomCode.value,
    voiceChannel: selectedVoiceChannel.value,
    userId: user.value?.id || "",
    username: displayName.value,
    avatarUrl: avatarUrl.value,
    initial: profileInitial.value,

    micOn: isMicOn.value,
    deafened: isDeafened.value,
    speaking: currentSpeaking,

    isMicOn: isMicOn.value,
    isDeafened: isDeafened.value,
    isSpeaking: currentSpeaking
  }

  console.log("VOXYN voice: emit state", payload)

  socket.emit("voice:state", payload, (response) => {
    console.log("VOXYN voice: state ack", response)
  })
}

async function syncCurrentVoicePeers() {
  console.log("VOXYN voice: sync peers check", {
    socketConnected: socket.connected,
    isVoiceReady: isVoiceReady.value,
    socketId: socket.id,
    selectedVoiceChannel: selectedVoiceChannel.value,
    users: onlineUsers.value
  })

  if (!socket.connected || !isVoiceReady.value || !socket.id) return

  await syncVoicePeers({
    users: onlineUsers.value,
    currentSocketId: socket.id,
    currentVoiceChannel: selectedVoiceChannel.value,
    socket
  })
}

async function toggleRoomMicrophone() {
  errorMessage.value = ""

  const stream = await ensureVoiceReady()

  if (!stream) return

  toggleMicrophone()
  emitVoiceState()
  syncCurrentVoicePeers()
}

async function toggleRoomHeadphones() {
  errorMessage.value = ""

  const stream = await ensureVoiceReady()

  if (!stream) return

  toggleHeadphones()
  emitVoiceState()
}

function normalizeVoiceUser(onlineUser, index = 0) {
  const username =
    onlineUser.username ||
    onlineUser.displayName ||
    onlineUser.name ||
    "Guest"

  const isCurrentUser = isCurrentVoiceUser(onlineUser)

  return {
    id:
      onlineUser.socketId ||
      onlineUser.userId ||
      onlineUser.id ||
      `voice-user-${index}`,

    socketId: onlineUser.socketId,
    userId: onlineUser.userId,
    username,

    avatarUrl:
      onlineUser.avatarUrl ||
      onlineUser.avatar_url ||
      "",

    initial:
      onlineUser.initial ||
      getUserInitial(username),

    voiceChannel:
      onlineUser.voiceChannel || "",

    micOn: isCurrentUser
      ? hasJoinedVoice.value && isMicOn.value
      : onlineUser.micOn === true || onlineUser.isMicOn === true,

    deafened: isCurrentUser
      ? hasJoinedVoice.value && isDeafened.value
      : Boolean(onlineUser.deafened || onlineUser.isDeafened),

    speaking: isCurrentUser
      ? hasJoinedVoice.value && isMicOn.value && !isDeafened.value && isSpeaking.value
      : Boolean(onlineUser.speaking || onlineUser.isSpeaking)
  }
}

function isCurrentVoiceUser(voiceUser) {
  if (!voiceUser) return false

  return (
    voiceUser.userId === user.value?.id ||
    voiceUser.socketId === socket.id
  )
}

function getVoiceUserKey(voiceUser, index) {
  return (
    voiceUser.socketId ||
    voiceUser.userId ||
    voiceUser.id ||
    `voice-user-${index}`
  )
}

function getVoiceUserSpeaking(voiceUser) {
  return (
    getVoiceUserMicOn(voiceUser) &&
    !getVoiceUserDeafened(voiceUser) &&
    Boolean(voiceUser.speaking || voiceUser.isSpeaking)
  )
}

function getVoiceUserMicOn(voiceUser) {
  if (isCurrentVoiceUser(voiceUser)) {
    return hasJoinedVoice.value && isMicOn.value
  }

  return voiceUser?.micOn === true || voiceUser?.isMicOn === true
}

function getVoiceUserDeafened(voiceUser) {
  if (isCurrentVoiceUser(voiceUser)) {
    return isDeafened.value
  }

  return Boolean(voiceUser?.deafened || voiceUser?.isDeafened)
}

watch(
  [isMicOn, isDeafened, isSpeaking, selectedVoiceChannel],
  () => {
    emitVoiceState()
    syncCurrentVoicePeers()
  }
)


/* =========================================================
   SECTION 6: Computed Room Data
   Purpose:
   - Format room title, owner, members and progress
   - Keep Profile identity synced inside RoomView
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

const currentVoiceLabel = computed(() => {
  if (!hasJoinedVoice.value) {
    return "Not connected"
  }

  const voiceCount = currentVoiceMembers.value.length || 1

  return `${voiceCount} in ${selectedVoiceChannel.value}`
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

const avatarUrl = computed(() => {
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

const profileInitial = computed(() => {
  return getUserInitial(displayName.value)
})

const visibleRoomUsers = computed(() => {
  const liveUsers = Array.isArray(onlineUsers.value)
    ? onlineUsers.value
        .filter(Boolean)
        .map((onlineUser, index) => {
          const username =
            onlineUser.username ||
            onlineUser.displayName ||
            onlineUser.name ||
            "Guest"

          return {
            id:
              onlineUser.socketId ||
              onlineUser.userId ||
              onlineUser.id ||
              `online-user-${index}`,
            socketId: onlineUser.socketId,
            userId: onlineUser.userId,
            username,
            avatarUrl:
              onlineUser.avatarUrl ||
              onlineUser.avatar_url ||
              "",
            initial:
              onlineUser.initial ||
              getUserInitial(username),
            isOwner:
              onlineUser.userId &&
              room.value?.owner_id &&
              onlineUser.userId === room.value.owner_id
          }
        })
    : []

  if (liveUsers.length) return liveUsers

  if (user.value) {
    return [
      {
        id: user.value.id,
        userId: user.value.id,
        username: displayName.value,
        avatarUrl: avatarUrl.value,
        initial: profileInitial.value,
        isOwner: isOwner.value
      }
    ]
  }

  return []
})

function getUserInitial(name) {
  const cleanName = String(name || "").trim()

  if (!cleanName) return "U"

  return cleanName.charAt(0).toUpperCase()
}

/* =========================================================
   SECTION 7: Page Init
   Purpose:
   - Check auth
   - Load room
   - Join room_members if needed
   - Connect to Socket.IO room
========================================================= */
onMounted(async () => {
  document.addEventListener("fullscreenchange", updateStageOneFullscreenState)
  document.addEventListener("webkitfullscreenchange", updateStageOneFullscreenState)
  document.addEventListener("keydown", handleStageOneFullscreenShortcut)

  await loadRoomPage()
})

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", updateStageOneFullscreenState)
  document.removeEventListener("webkitfullscreenchange", updateStageOneFullscreenState)
  document.removeEventListener("keydown", handleStageOneFullscreenShortcut)

  cleanupVoiceRoom()
  leaveSocketRoom(true)
})

async function loadRoomPage() {
  loading.value = true
  errorMessage.value = ""
  voiceStatusMessage.value = ""
  hasAutoJoinedDefaultVoice.value = false
  hasManuallyLeftVoice.value = false
  voiceJoinLoading.value = false
  voiceLeaveLoading.value = false
  voiceStatusMessage.value = ""
  selectedVoiceChannel.value = defaultVoiceChannel
  
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

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
   - Copy room code
   - Copy invite link
   - Navigate back
========================================================= */
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

async function copyInviteLink() {
  errorMessage.value = ""
  successMessage.value = ""

  try {
    const inviteLink = `${window.location.origin}/room/${roomCode.value}`

    await navigator.clipboard.writeText(inviteLink)

    successMessage.value = "Invite link copied."
  } catch {
    errorMessage.value = "Could not copy invite link."
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

async function leaveCurrentRoom() {
  if (actionLoading.value) return

  errorMessage.value = ""
  successMessage.value = ""
  actionLoading.value = true

  try {
    if (hasJoinedVoice.value) {
      await leaveVoiceChannel()
    } else {
      cleanupVoiceRoom()
    }

    leaveSocketRoom(true)

    router.push("/dashboard")
  } catch (error) {
    console.error("VOXYN room: failed to leave room", error)
    errorMessage.value = "Could not leave room."
  } finally {
    actionLoading.value = false
  }
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

  socket.off("voice:offer", handleIncomingVoiceOffer)
  socket.off("voice:answer", handleIncomingVoiceAnswer)
  socket.off("voice:ice-candidate", handleIncomingVoiceIceCandidate)
  socket.off("voice:user-left", handleVoiceUserLeft)

  socket.on("connect", handleSocketConnect)
  socket.on("disconnect", handleSocketDisconnect)
  socket.on("room:history", handleRoomHistory)
  socket.on("chat:new", handleNewChatMessage)
  socket.on("room:users", handleRoomUsers)
  socket.on("room:system", handleSystemMessage)

  socket.on("voice:offer", handleIncomingVoiceOffer)
  socket.on("voice:answer", handleIncomingVoiceAnswer)
  socket.on("voice:ice-candidate", handleIncomingVoiceIceCandidate)
  socket.on("voice:user-left", handleVoiceUserLeft)
}

function handleRoomUsers(users) {
  onlineUsers.value = Array.isArray(users) ? users : []

  console.log(
    "VOXYN voice: room users update",
    onlineUsers.value.map((onlineUser) => ({
      username: onlineUser.username,
      socketId: onlineUser.socketId,
      voiceChannel: onlineUser.voiceChannel,
      isSpeaking: onlineUser.isSpeaking,
      speaking: onlineUser.speaking,
      isMicOn: onlineUser.isMicOn,
      micOn: onlineUser.micOn,
      isDeafened: onlineUser.isDeafened,
      deafened: onlineUser.deafened
    }))
  )

  syncCurrentVoicePeers()
}

async function handleIncomingVoiceOffer(payload) {
  try {
    await handleVoiceOffer(
      payload?.fromSocketId,
      payload?.offer,
      socket
    )
  } catch (error) {
    console.error("VOXYN voice: failed to handle offer", error)
  }
}

async function handleIncomingVoiceAnswer(payload) {
  try {
    await handleVoiceAnswer(
      payload?.fromSocketId,
      payload?.answer
    )
  } catch (error) {
    console.error("VOXYN voice: failed to handle answer", error)
  }
}

async function handleIncomingVoiceIceCandidate(payload) {
  try {
    await handleVoiceIceCandidate(
      payload?.fromSocketId,
      payload?.candidate
    )
  } catch (error) {
    console.error("VOXYN voice: failed to handle ICE candidate", error)
  }
}

function handleVoiceUserLeft(payload) {
  if (!payload?.socketId) return

  removePeerConnection(payload.socketId)
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
      userId: user.value?.id || "",
      username: displayName.value,
      avatarUrl: avatarUrl.value,
      initial: profileInitial.value,
      email: user.value?.email || "",

      voiceChannel: selectedVoiceChannel.value || defaultVoiceChannel,

      micOn: false,
      deafened: false,
      speaking: false,

      isMicOn: false,
      isDeafened: false,
      isSpeaking: false
    },
    (response) => {
      if (!response?.ok) {
        errorMessage.value =
          response?.error || "Could not connect to room chat."
        return
      }

      voiceStatusMessage.value =
        `You are in ${selectedVoiceChannel.value}. Click Enable Voice to talk.`
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
      senderInitial: "S",
      avatarUrl: "",
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

  socket.off("voice:offer", handleIncomingVoiceOffer)
  socket.off("voice:answer", handleIncomingVoiceAnswer)
  socket.off("voice:ice-candidate", handleIncomingVoiceIceCandidate)
  socket.off("voice:user-left", handleVoiceUserLeft)

  cleanupVoiceRoom()

  onlineUsers.value = []
  socketConnected.value = false
  voiceJoinLoading.value = false
  voiceStatusMessage.value = ""
  selectedVoiceChannel.value = defaultVoiceChannel

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
      userId: user.value?.id || "",
      username: displayName.value,
      avatarUrl: avatarUrl.value,
      initial: profileInitial.value,
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
  const sender = isSystem ? "System" : item?.username || "Guest"

  return {
    id: item?.id || `${Date.now()}-${Math.random()}`,
    sender,
    senderInitial: getUserInitial(sender),
    avatarUrl: item?.avatarUrl || item?.avatar_url || "",
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
  <main
    class="room-page"
    :class="{ 'game-focus-mode': isGameFocusMode }"
  >
    <!-- =====================================================
         SECTION 1: Left Rail
    ====================================================== -->
    <aside class="left-rail">
      <button class="rail-logo" @click="backToDashboard">
        ◆
      </button>

      <nav class="rail-nav">
        <button
          v-for="item in roomRailItems"
          :key="item.label"
          :class="{ active: item.label === 'Voice Rooms' }"
          @click="goRoomRail(item)"
        >
          <span class="rail-icon">{{ item.icon }}</span>
          <span class="rail-label">{{ item.label }}</span>
        </button>
      </nav>

      <button
        class="rail-user"
        :title="displayName"
        @click="router.push('/profile')"
      >
        <img
          v-if="avatarUrl"
          class="rail-user-img"
          :src="avatarUrl"
          :alt="displayName"
        />
        <template v-else>
          {{ profileInitial }}
        </template>
        <span></span>
      </button>
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
            <section class="create-strip room-control-strip">
              <div class="room-control-left">
                <div class="room-icon-box">◆</div>

                <div class="room-control-title">
                  <p class="strip-eyebrow">Current Room</p>
                  <h2>{{ roomTitle }}</h2>
                  <p>{{ roomControlSubtitle }}</p>
                </div>
              </div>

              <div class="room-control-meta">
                <div class="room-meta-item">
                  <span>Room Code</span>
                  <strong>{{ roomCode }}</strong>
                </div>

                <div class="room-meta-item">
                  <span>Members</span>
                  <strong>{{ memberCount }} / {{ maxMembers }}</strong>
                </div>

                <div class="room-meta-item">
                  <span>Owner</span>
                  <strong>{{ ownerLabel }}</strong>
                </div>

                <div class="room-meta-item">
                  <span>Voice</span>
                  <strong>{{ currentVoiceLabel }}</strong>
                </div>

                <div class="room-meta-item">
                  <span>Status</span>
                  <strong class="meta-live">● Live</strong>
                </div>
              </div>

              <div class="room-control-actions">
                <button class="room-action-btn" @click="copyInviteLink">
                  ⛓ Copy Invite Link
                </button>

                <button class="room-action-btn" @click="copyRoomCode">
                  ⧉ Copy Room Code
                </button>

                <button
                  class="room-action-btn danger"
                  :disabled="actionLoading"
                  @click="leaveCurrentRoom"
                >
                  {{ actionLoading ? "Leaving..." : "Leave Room" }}
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

              <div
                v-for="channel in voiceChannels"
                :key="channel.name"
                class="voice-channel-block"
              >
                <button
                  class="channel-item"
                  :class="{ active: selectedVoiceChannel === channel.name }"
                  @click="joinVoiceChannel(channel.name)"
                >
                  <span class="channel-left">
                    <span class="voice-icon">
                      {{ selectedVoiceChannel === channel.name ? "◉" : "○" }}
                    </span>
                    <span>{{ channel.name }}</span>
                  </span>

                  <small>{{ channel.count }}</small>
                </button>

                <div
                  v-if="channel.users.length"
                  class="voice-users-list"
                >
                  <div
                    v-for="(voiceUser, index) in channel.users"
                    :key="getVoiceUserKey(voiceUser, index)"
                    class="voice-user-row"
                  >
                    <div
                      class="voice-user-avatar"
                      :class="{
                        'is-speaking': getVoiceUserSpeaking(voiceUser),
                        'is-muted': !getVoiceUserMicOn(voiceUser),
                        'is-deafened': getVoiceUserDeafened(voiceUser)
                      }"
                    >
                      <img
                        v-if="voiceUser.avatarUrl"
                        class="voice-user-avatar-img"
                        :src="voiceUser.avatarUrl"
                        :alt="voiceUser.username"
                      />

                      <template v-else>
                        {{ voiceUser.initial }}
                      </template>
                    </div>

                    <div class="voice-user-info">
                      <span>{{ voiceUser.username }}</span>

                      <small v-if="getVoiceUserDeafened(voiceUser)">
                        Deafened
                      </small>

                      <small v-else-if="!getVoiceUserMicOn(voiceUser)">
                        Muted
                      </small>

                      <small v-else-if="getVoiceUserSpeaking(voiceUser)">
                        Speaking
                      </small>

                      <small v-else>
                        Connected
                      </small>
                    </div>

                    <span
                      v-if="getVoiceUserDeafened(voiceUser)"
                      class="voice-user-state"
                    >
                      ⊘
                    </span>

                    <span
                      v-else-if="!getVoiceUserMicOn(voiceUser)"
                      class="voice-user-state"
                    >
                      ◌
                    </span>
                  </div>
                </div>
              </div>

              <div class="voice-control-panel">
                <p>
                  {{ voicePanelStatus }}
                </p>

                <div class="voice-control-row">
                  <button
                    class="voice-control-btn"
                    :class="{ active: hasJoinedVoice }"
                    :disabled="voiceJoinLoading || voiceLeaveLoading"
                    @click="joinVoiceChannel(selectedVoiceChannel)"
                  >
                    {{ hasJoinedVoice ? "Voice Ready" : "Enable Voice" }}
                  </button>

                  <button
                    class="voice-control-btn"
                    :class="{ active: hasJoinedVoice && isMicOn }"
                    :disabled="!hasJoinedVoice || voiceJoinLoading || voiceLeaveLoading"
                    @click="toggleRoomMicrophone"
                  >
                    {{ hasJoinedVoice && isMicOn ? "Mic On" : "Muted" }}
                  </button>

                  <button
                    class="voice-control-btn"
                    :class="{ active: hasJoinedVoice && !isDeafened }"
                    :disabled="!hasJoinedVoice || voiceJoinLoading || voiceLeaveLoading"
                    @click="toggleRoomHeadphones"
                  >
                    {{ hasJoinedVoice && isDeafened ? "Deafened" : "Listening" }}
                  </button>

                  <button
                    class="voice-control-btn leave"
                    :disabled="!hasJoinedVoice || voiceJoinLoading || voiceLeaveLoading"
                    @click="leaveVoiceChannel"
                  >
                    Leave Voice
                  </button>
                </div>
              </div>
              <div class="card-divider"></div>

              <div class="card-title">
                Room Sections
              </div>

              <button class="channel-item simple">
                <span class="section-left">
                  <span class="section-icon">▤</span>
                  Rules
                </span>
                <span class="chevron">›</span>
              </button>

              <button class="channel-item simple">
                <span class="section-left">
                  <span class="section-icon">ⓘ</span>
                  About Room
                </span>
                <span class="chevron">›</span>
              </button>
            </div>
          </aside>

          <!-- =============================================
              SECTION 5B: Center Workspace
          ============================================== -->
          <section class="center-workspace">
            <div
              v-show="!isGameFocusMode"
              class="member-bar"
            >
              <div class="member-left">
                <strong>{{ memberCount }} / {{ maxMembers }} members</strong>
                <span>Owner: {{ ownerLabel }}</span>
              </div>

              <div class="member-progress">
                <div :style="{ width: memberProgressWidth }"></div>
              </div>

              <div class="member-avatars">
                <span
                  v-for="member in visibleRoomUsers.slice(0, 4)"
                  :key="member.id"
                  class="avatar"
                  :class="{ owner: member.isOwner }"
                  :title="member.username"
                >
                  <img
                    v-if="member.avatarUrl"
                    class="avatar-img"
                    :src="member.avatarUrl"
                    :alt="member.username"
                  />
                  <template v-else>
                    {{ member.initial }}
                  </template>
                </span>

                <span class="avatar add">+</span>
              </div>

              <button class="invite-btn">
                ✉ Invite
              </button>
            </div>

            <div
              ref="gameFrameRef"
              class="game-area stage-one-game-frame"
              :class="{
                'stage-one-fullscreen': isStageOneGameFullscreen,
                'game-focus-frame': isGameFocusMode
              }"
            >
              <div class="game-ambient-layer"></div>

              <div
                v-if="isGameFocusMode"
                class="stage-two-game-topbar"
              >
                <div class="stage-two-room-info">
                  <strong>{{ roomTitle }}</strong>
                  <span>{{ roomCode }}</span>
                  <span>{{ memberCount }} / {{ maxMembers }}</span>
                  <span class="stage-live-dot">● Live</span>
                </div>

                <button
                  type="button"
                  class="exit-stage-btn"
                  @click="exitStageTwoGame"
                >
                  ↩ Exit Stage 2
                </button>
              </div>

              <div class="game-latency-pill">
                ▰ {{ gameLatencyLabel }}
              </div>

              <!-- =====================================================
                  SECTION 5B.1: Stage 2 Game Scroll Shell
                  Purpose:
                  - Keep GameStage outside RoomView logic
                  - Prevent bottom voice controls from covering game cards
              ====================================================== -->
              <div class="stage-two-game-scroll-shell">
                <GameStage
                  :is-stage-two="isGameFocusMode"
                  :room-code="roomCode"
                  :room-title="roomTitle"
                  :user="user"
                  :socket="socket"
                  @enter-stage-two="enterStageTwoGame"
                />
              </div>
              
              <div class="game-player-controls">
                <div class="game-control-left">
                  <button
                    type="button"
                    class="game-control-btn deafen-control-btn"
                    :class="{ active: hasJoinedVoice && !isDeafened, deafened: hasJoinedVoice && isDeafened }"
                    :disabled="voiceJoinLoading || voiceLeaveLoading"
                    :title="hasJoinedVoice && isDeafened ? 'Enable sound' : 'Deafen / disable sound'"
                    @click="toggleGameScreenHeadphones"
                  >
                    {{ hasJoinedVoice && !isDeafened ? "🎧" : "🔇" }}
                  </button>

                  <button
                    type="button"
                    class="game-control-btn mic-control-btn"
                    :class="{ active: hasJoinedVoice && isMicOn }"
                    :disabled="voiceJoinLoading || voiceLeaveLoading"
                    :title="hasJoinedVoice && isMicOn ? 'Mute microphone' : 'Enable microphone'"
                    @click="toggleGameScreenMicrophone"
                  >
                    {{ hasJoinedVoice && isMicOn ? "🎙" : "◌" }}
                  </button>

                  <button
                    type="button"
                    class="game-control-btn leave-channel-icon-btn"
                    :class="{ active: hasJoinedVoice }"
                    :disabled="!hasJoinedVoice || voiceJoinLoading || voiceLeaveLoading"
                    :title="voiceLeaveLoading ? 'Leaving voice channel...' : 'Leave Channel'"
                    @click="leaveVoiceChannel"
                  >
                    {{ voiceLeaveLoading ? "…" : "⏏" }}
                  </button>

                  <button
                    type="button"
                    class="game-control-btn"
                    aria-label="Game settings"
                  >
                    ⚙
                  </button>

                  <span
                    class="game-voice-status"
                    :class="{
                      connected: hasJoinedVoice,
                      muted: hasJoinedVoice && !isMicOn,
                      deafened: hasJoinedVoice && isDeafened,
                      speaking: hasJoinedVoice && isSpeaking
                    }"
                  >
                    {{ gameVoiceStatusLabel }}
                  </span>
                </div>

                <div class="game-control-right">
                  <div class="quality-pill">
                    <span>Quality</span>
                    <strong>Auto</strong>
                  </div>

                  <button
                    class="fullscreen-btn"
                    :class="{ active: isGameFocusMode }"
                    type="button"
                    :title="isGameFocusMode ? 'Exit Stage 2' : 'Enter Stage 2'"
                    @click.stop="toggleGameFocusMode"
                  >
                    {{ isGameFocusMode ? "⤺" : "⛶" }}
                  </button>
                </div>
              </div>

              <div class="fullscreen-hint">
                {{ isGameFocusMode ? "Exit Stage 2 · Back to Room" : "Enter Stage 2 · Focus Mode" }}
              </div>
            </div>
          </section>
          <!-- =============================================
                  SECTION 5C: Chat Panel
            ============================================== -->
            <aside
              class="chat-card"
              :class="{ 'focus-side-card': isGameFocusMode }"
            >
              <div class="chat-header">
                <div>
                  <h2>{{ isGameFocusMode ? "Focus Panel" : "Chat" }}</h2>
                  <p>{{ isGameFocusMode ? "Voice + room messages" : "Room messages" }}</p>
                </div>

                <button aria-label="Chat options">≡</button>
              </div>

              <div
                v-if="isGameFocusMode"
                class="focus-voice-card"
              >
                <div class="focus-card-head">
                  <div>
                    <p class="focus-side-title">Voice Channels</p>
                    <span>
                      {{ hasJoinedVoice ? "Switch channel without leaving Stage 2" : "Join a voice channel to talk" }}
                    </span>
                  </div>

                  <div class="focus-card-actions">
                    <strong class="focus-count-pill">
                      {{ currentVoiceMembers.length }}
                    </strong>

                    <button
                      type="button"
                      class="focus-leave-mini-btn"
                      :class="{ active: hasJoinedVoice }"
                      :disabled="!hasJoinedVoice || voiceJoinLoading || voiceLeaveLoading"
                      aria-label="Leave voice channel"
                      @click="leaveVoiceChannel"
                    >
                      {{ voiceLeaveLoading ? "…" : "↩" }}
                    </button>
                  </div>
                </div>

                <div class="focus-channel-list">
                  <button
                    v-for="channel in voiceChannels"
                    :key="`focus-${channel.name}`"
                    type="button"
                    class="focus-channel-item"
                    :class="{ active: hasJoinedVoice && selectedVoiceChannel === channel.name }"
                    @click="joinVoiceChannel(channel.name)"
                  >
                    <span>
                      {{ hasJoinedVoice && selectedVoiceChannel === channel.name ? "◉" : "○" }}
                      {{ channel.name }}
                    </span>

                    <strong>{{ channel.count }}</strong>
                  </button>
                </div>

                <div class="connected-users-card">
                  <div class="focus-card-title-row">
                    <p class="focus-side-title">Connected Users</p>
                    <span>{{ currentVoiceMembers.length }} online</span>
                  </div>

                  <div
                    v-if="currentVoiceMembers.length === 0"
                    class="focus-empty-user"
                  >
                    No one is connected to voice.
                  </div>

                  <div
                    v-for="voiceUser in currentVoiceMembers"
                    :key="`focus-user-${voiceUser.id}`"
                    class="focus-voice-user"
                  >
                    <div
                      class="voice-user-avatar"
                      :class="{
                        'is-speaking': getVoiceUserSpeaking(voiceUser),
                        'is-muted': !getVoiceUserMicOn(voiceUser),
                        'is-deafened': getVoiceUserDeafened(voiceUser)
                      }"
                    >
                      <img
                        v-if="voiceUser.avatarUrl"
                        class="voice-user-avatar-img"
                        :src="voiceUser.avatarUrl"
                        :alt="voiceUser.username"
                      />

                      <template v-else>
                        {{ voiceUser.initial }}
                      </template>
                    </div>

                    <div class="voice-user-info">
                      <span>{{ voiceUser.username }}</span>

                      <small v-if="getVoiceUserDeafened(voiceUser)">
                        Deafened
                      </small>

                      <small v-else-if="!getVoiceUserMicOn(voiceUser)">
                        Muted
                      </small>

                      <small v-else-if="getVoiceUserSpeaking(voiceUser)">
                        Speaking
                      </small>

                      <small v-else>
                        Connected
                      </small>
                    </div>

                    <div
                      class="focus-speaking-bars"
                      :class="{ active: getVoiceUserSpeaking(voiceUser) }"
                    >
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="isGameFocusMode"
                class="focus-chat-title"
              >
                <p class="focus-side-title">Chat</p>
                <span>Room messages</span>
              </div>

              <div class="chat-list">
                <div
                  v-for="(message, index) in chatMessages"
                  :key="`${message.sender}-${index}`"
                  class="chat-message"
                  :class="{ system: message.type === 'system' }"
                >
                  <div class="chat-avatar">
                    <img
                      v-if="message.avatarUrl"
                      class="chat-avatar-img"
                      :src="message.avatarUrl"
                      :alt="message.sender"
                    />
                    <template v-else>
                      {{ message.senderInitial || message.sender.charAt(0) }}
                    </template>
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

            <!-- =====================================================
                SECTION 6: Remote WebRTC Audio
                Purpose:
                - Play incoming peer audio streams
                - Hidden because voice users are already shown in UI
            ====================================================== -->
            <div class="remote-audio-layer" aria-hidden="true">
              <audio
                v-for="item in remoteAudioItems"
                :key="item.socketId"
                :ref="(element) => bindRemoteAudioElement(element, item.stream, item.socketId)"
                playsinline
                data-voxyn-remote-audio
              ></audio>
            </div>
        </section>
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
   SECTION 0.1: Remote Audio Layer
   Purpose:
   - Keep WebRTC audio elements available but invisible
========================================================= */
.remote-audio-layer {
  position: fixed;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

/* =========================================================
   SECTION 1: Page Shell
========================================================= */

.room-page {
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  min-height: 100vh;

  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);

  background: #eef5fb;
  color: #0f172a;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  overflow-x: hidden;
}

.room-main {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 18px 22px;
}

.room-page.game-focus-mode {
  grid-template-columns: minmax(0, 1fr);
  background:
    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.2), transparent 36%),
    linear-gradient(135deg, #020617 0%, #07111f 48%, #0f172a 100%);
}

.room-page.game-focus-mode .left-rail,
.room-page.game-focus-mode .back-btn,
.room-page.game-focus-mode .room-header,
.room-page.game-focus-mode .room-control-strip {
  display: none;
}

.room-page.game-focus-mode .room-main {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px;
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
   Purpose:
   - Match Dashboard compact rail
   - Keep RoomView and Dashboard navigation visually consistent
========================================================= */
.left-rail {
  width: 92px;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 20px 12px;

  display: flex;
  flex-direction: column;
  align-items: center;

  background: rgba(255, 255, 255, 0.76);
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 12px 0 36px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(18px);

  z-index: 40;
}

.rail-logo {
  width: 58px;
  height: 58px;
  margin: 0 0 34px;

  display: grid;
  place-items: center;

  border: none;
  border-radius: 20px;
  cursor: pointer;

  color: white;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;

  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.24);
}

.rail-nav {
  width: 100%;
  display: grid;
  align-content: start;
  gap: 12px;
}

.rail-nav button {
  width: 100%;
  min-height: 72px;
  padding: 12px 6px 8px;

  display: grid;
  place-items: center;
  text-align: center;

  border: none;
  border-radius: 18px;
  cursor: pointer;

  color: #475569;
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.1;

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.rail-nav button:hover {
  transform: translateY(-1px);
}

.rail-nav button.active,
.rail-nav button:hover {
  color: #2563eb;
  background: rgba(239, 246, 255, 0.95);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.12);
}

.rail-icon {
  display: grid;
  place-items: center;

  width: 28px;
  height: 28px;
  margin-bottom: 8px;

  color: #64748b;
  font-size: 21px;
  line-height: 1;
  font-weight: 900;
}

.rail-nav button.active .rail-icon,
.rail-nav button:hover .rail-icon {
  color: #4f46e5;
}

.rail-label {
  display: block;
}

.rail-user {
  width: 58px;
  height: 58px;
  min-width: 58px;
  min-height: 58px;
  max-width: 58px;
  max-height: 58px;
  margin-top: auto;
  padding: 0;

  position: relative;

  display: grid;
  place-items: center;

  border: none;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;

  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.22);

  font-size: 18px;
  font-weight: 950;
}

.rail-user-img {
  width: 100%;
  height: 100%;
  max-width: 58px;
  max-height: 58px;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.rail-user > span {
  position: absolute;
  right: 4px;
  bottom: 4px;
  z-index: 2;

  width: 9px;
  height: 9px;
  border-radius: 999px;

  background: #22c55e;
  border: 2px solid white;
}

.avatar {
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.chat-avatar {
  overflow: hidden;
}

.chat-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
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
  font-size: 30px;
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.05em;
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
   SECTION 4: Current Room Control Strip
========================================================= */
.create-strip {
  margin-top: 14px;
  min-height: 112px;
  padding: 18px 22px;
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(420px, 1fr) 300px;
  gap: 22px;
  align-items: center;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.room-control-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.room-icon-box {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  font-size: 24px;
  font-weight: 950;
  box-shadow: 0 18px 38px rgba(79, 70, 229, 0.24);
}

.room-control-title {
  min-width: 0;
}

.strip-eyebrow {
  margin: 0 0 6px;
  color: #4f46e5;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.32em;
}

.create-strip h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.create-strip p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.room-control-meta {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}

.room-meta-item {
  min-width: 0;
  padding: 0 12px;
  border-left: 1px solid #e2e8f0;
}

.room-meta-item span {
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

.room-meta-item strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-meta-item:first-child strong {
  color: #4f46e5;
  letter-spacing: 0.16em;
}

.meta-live {
  color: #16a34a !important;
  letter-spacing: 0 !important;
}

.room-control-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.room-action-btn {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.82);
  color: #334155;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
  box-sizing: border-box;
}

.room-action-btn:hover {
  background: white;
  border-color: #94a3b8;
}

.room-action-btn.danger {
  grid-column: 1 / -1;
  color: #dc2626;
  border-color: #fecaca;
  background: #fff7f7;
}

.room-action-btn.danger:hover {
  background: #fee2e2;
}

.room-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .room-control-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .room-control-actions {
    grid-template-columns: 1fr;
  }

  .room-action-btn.danger {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .room-control-left {
    align-items: flex-start;
  }

  .room-icon-box {
    width: 50px;
    height: 50px;
    flex-basis: 50px;
  }

  .room-control-meta {
    grid-template-columns: 1fr;
  }

  .room-meta-item {
    border-left: none;
    border-top: 1px solid #e2e8f0;
    padding: 10px 0 0;
  }
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

/* Stage 2: app-level fullscreen focus mode */
.room-page.game-focus-mode {
  position: fixed;
  inset: 0;
  z-index: 9999;

  width: 100vw;
  height: 100vh;
  height: 100dvh;

  display: block;
  overflow: hidden;

  background:
    radial-gradient(circle at 48% 0%, rgba(59, 130, 246, 0.22), transparent 36%),
    linear-gradient(135deg, #020617 0%, #07111f 50%, #0f172a 100%);
}

.room-page.game-focus-mode .left-rail,
.room-page.game-focus-mode .back-btn,
.room-page.game-focus-mode .room-header,
.room-page.game-focus-mode .room-control-strip,
.room-page.game-focus-mode .workspace-sidebar,
.room-page.game-focus-mode .member-bar {
  display: none !important;
}

.room-page.game-focus-mode .room-main {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 0;

  padding: 16px;
  overflow: hidden;
}

.room-page.game-focus-mode .workspace-grid {
  margin-top: 0;

  width: 100%;
  height: calc(100vh - 32px);
  height: calc(100dvh - 32px);

  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
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
  letter-spacing: 0.18em;
}

.room-code-card h2 {
  margin: 12px 0;
  color: #4f46e5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 38px;
  font-weight: 950;
  letter-spacing: 0.14em;
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
  letter-spacing: 0.18em;
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
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.channel-item:hover {
  transform: translateY(-1px);
  background: #f8fafc;
}

.channel-item.active {
  color: white;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.16);
}

.channel-left,
.section-left {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.voice-icon {
  width: 18px;
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  line-height: 1;
}

.channel-item small {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #4f46e5;
  background: #e0e7ff;
  font-size: 12px;
  font-weight: 950;
}

.channel-item.active small {
  color: #4f46e5;
  background: rgba(255, 255, 255, 0.84);
}

.channel-item.simple {
  justify-content: space-between;
  color: #334155;
  background: transparent;
  box-shadow: none;
}

.channel-item.simple:hover {
  background: #f8fafc;
}

.section-icon {
  width: 18px;
  display: inline-grid;
  place-items: center;
  color: #64748b;
  font-size: 13px;
}

.chevron {
  color: #94a3b8;
  font-size: 20px;
  line-height: 1;
}

.card-divider {
  height: 1px;
  margin: 12px 0;
  background: #e2e8f0;
}

/* =========================================================
   SECTION 6.1: Voice Presence
   Purpose:
   - Show users inside each voice channel
   - Show avatar speaking glow
   - Show mute / deafen state
========================================================= */
.voice-channel-block {
  margin-bottom: 10px;
}

.voice-channel-block .channel-item {
  margin-bottom: 0;
}

.voice-users-list {
  margin: 8px 0 12px 30px;
  display: grid;
  gap: 8px;
}

.voice-user-row {
  min-width: 0;
  min-height: 42px;
  padding: 7px 8px;

  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;

  border-radius: 14px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.voice-user-avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;

  border-radius: 999px;
  overflow: hidden;

  color: white;
  background: linear-gradient(135deg, #4f46e5, #3b82f6);

  font-size: 12px;
  font-weight: 950;

  border: 2px solid rgba(255, 255, 255, 0.92);

  transition:
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease,
    opacity 0.16s ease;
}

.voice-user-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.voice-user-avatar.is-speaking {
  border-color: rgba(34, 197, 94, 0.95);
  box-shadow:
    0 0 0 3px rgba(34, 197, 94, 0.18),
    0 0 18px rgba(34, 197, 94, 0.48);
  transform: translateY(-1px);
}

.voice-user-avatar.is-muted,
.voice-user-avatar.is-deafened {
  opacity: 0.58;
  filter: grayscale(0.35);
}

.voice-user-info {
  min-width: 0;
}

.voice-user-info span {
  display: block;
  overflow: hidden;

  color: #334155;
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.voice-user-info small {
  display: block;
  margin-top: 2px;

  color: #64748b;
  font-size: 10px;
  font-weight: 850;
}

.voice-user-state {
  width: 24px;
  height: 24px;

  display: grid;
  place-items: center;

  border-radius: 999px;
  color: #64748b;
  background: white;
  border: 1px solid #e2e8f0;

  font-size: 12px;
  font-weight: 950;
}

/* =========================================================
   SECTION 6.2: Voice Controls
   Purpose:
   - Control local mic and headphone listening state
========================================================= */
.voice-control-panel {
  margin-top: 14px;
  padding: 12px;

  border-radius: 18px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid #e2e8f0;
}

.voice-control-panel p {
  margin: 0 0 10px;

  color: #64748b;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
}

.voice-control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.voice-control-btn {
  min-height: 38px;
  padding: 0 10px;

  border-radius: 13px;
  border: 1px solid #cbd5e1;

  color: #475569;
  background: white;

  font-size: 12px;
  font-weight: 950;
  cursor: pointer;

  transition:
    transform 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.voice-control-btn:hover {
  transform: translateY(-1px);
}

.voice-control-btn.active {
  color: #15803d;
  background: #dcfce7;
  border-color: rgba(34, 197, 94, 0.32);
}

.voice-control-btn.leave {
  color: #b91c1c;
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(254, 226, 226, 0.72);
}

.voice-control-btn.leave:hover:not(:disabled) {
  background: rgba(254, 202, 202, 0.92);
  border-color: rgba(239, 68, 68, 0.55);
}

.voice-control-btn.leave:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* =========================================================
   SECTION 7: Center Workspace
========================================================= */
.center-workspace {
  display: grid;
  grid-template-rows: 86px minmax(430px, 1fr);
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
  position: relative;
  min-height: 430px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 28px;
  color: white;
  overflow: hidden;
  isolation: isolate;

  border-radius: 24px;
  background:
    radial-gradient(circle at 16% 18%, rgba(148, 163, 184, 0.26), transparent 20%),
    radial-gradient(circle at 50% 16%, rgba(96, 165, 250, 0.36), transparent 24%),
    radial-gradient(circle at 82% 82%, rgba(79, 70, 229, 0.3), transparent 32%),
    linear-gradient(135deg, #020617 0%, #061436 46%, #101b46 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 42px rgba(15, 23, 42, 0.14);
}

.stage-one-game-frame {
  cursor: default;
}

.game-ambient-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  background:
    linear-gradient(to top, rgba(2, 6, 23, 0.9), transparent 46%),
    repeating-linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.08) 0,
      rgba(96, 165, 250, 0.08) 1px,
      transparent 1px,
      transparent 44px
    );
  opacity: 0.88;
}

.game-ambient-layer::before {
  content: "";
  position: absolute;
  left: 8%;
  top: 8%;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  box-shadow: inset -18px -20px 42px rgba(15, 23, 42, 0.42);
}

.game-ambient-layer::after {
  content: "";
  position: absolute;
  left: -12%;
  right: -12%;
  bottom: -18%;
  height: 42%;
  background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.3), transparent 64%);
  filter: blur(16px);
}

.game-latency-pill {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 4;

  min-height: 32px;
  padding: 0 12px;

  display: inline-flex;
  align-items: center;
  gap: 7px;

  border-radius: 999px;
  color: #dcfce7;
  background: rgba(2, 6, 23, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.32);
  backdrop-filter: blur(14px);

  font-size: 12px;
  font-weight: 950;
}

.game-hero-content {
  position: relative;
  z-index: 2;

  display: grid;
  justify-items: center;
}

.cube-mark {
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  font-size: 32px;
  box-shadow:
    0 22px 58px rgba(59, 130, 246, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.game-area p {
  margin: 24px 0 0;
  color: white;
  font-size: 40px;
  font-weight: 950;
  letter-spacing: 0.34em;
  text-shadow: 0 16px 50px rgba(15, 23, 42, 0.68);
}

.game-area h2 {
  margin: 10px 0 20px;
  color: #cbd5e1;
  font-size: 17px;
  text-transform: uppercase;
  letter-spacing: 0.26em;
}

.game-area span {
  color: #60a5fa;
  font-size: 18px;
  font-weight: 950;
}

.game-area small {
  display: block;
  margin-top: 8px;
  color: #dbeafe;
  font-size: 14px;
  font-weight: 750;
}

.game-hero-content > button {
  margin-top: 30px;
  min-height: 54px;
  padding: 0 34px;

  border: none;
  border-radius: 999px;
  color: white;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);

  font-size: 15px;
  font-weight: 950;
  cursor: pointer;

  box-shadow: 0 18px 44px rgba(59, 130, 246, 0.34);
}

.game-player-controls {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  z-index: 4;

  min-height: 54px;
  padding: 8px 10px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  border-radius: 18px;
  background: rgba(2, 6, 23, 0.58);
  border: 1px solid rgba(148, 163, 184, 0.22);
  backdrop-filter: blur(18px);
}

.game-control-left,
.game-control-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.game-player-controls button {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  border-radius: 13px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: white;
  background: rgba(15, 23, 42, 0.66);
  cursor: pointer;
}

.game-control-slider {
  width: 98px;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.42);
  overflow: hidden;
}

.game-control-slider span {
  display: block;
  width: 44%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #60a5fa, #6366f1);
}

.quality-pill {
  min-height: 38px;
  padding: 0 13px;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  border-radius: 13px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.66);
  border: 1px solid rgba(148, 163, 184, 0.24);

  font-size: 11px;
  font-weight: 850;
}

.quality-pill strong {
  color: white;
  font-size: 12px;
  font-weight: 950;
}

.fullscreen-btn {
  box-shadow:
    0 0 0 2px rgba(96, 165, 250, 0.22),
    0 10px 26px rgba(15, 23, 42, 0.32);
}

.fullscreen-hint {
  position: absolute;
  right: 18px;
  bottom: 80px;
  z-index: 4;

  padding: 8px 11px;
  border-radius: 11px;

  color: white;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.24);
  backdrop-filter: blur(12px);

  font-size: 11px;
  font-weight: 900;
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.stage-one-game-frame:hover .fullscreen-hint {
  opacity: 1;
  transform: translateY(0);
}

.stage-one-game-frame:fullscreen,
.stage-one-game-frame:-webkit-full-screen {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  border-radius: 0;
}

.stage-one-game-frame:fullscreen p,
.stage-one-game-frame:-webkit-full-screen p {
  font-size: clamp(42px, 7vw, 96px);
}

.stage-one-game-frame:fullscreen .game-player-controls,
.stage-one-game-frame:-webkit-full-screen .game-player-controls {
  left: 40px;
  right: 40px;
  bottom: 34px;
}

.stage-one-fullscreen {
  min-height: 100vh;
}
.room-page.game-focus-mode .center-workspace {
  min-height: calc(100vh - 32px);
  min-height: calc(100dvh - 32px);
  grid-template-rows: minmax(0, 1fr);
}

.room-page.game-focus-mode .game-area {
  min-height: calc(100vh - 32px);
  min-height: calc(100dvh - 32px);
  border-radius: 24px;
}

.game-focus-frame {
  padding-top: 76px;
}

.stage-two-game-topbar {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 6;

  min-height: 48px;
  padding: 8px 10px 8px 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  border-radius: 16px;
  background: rgba(2, 6, 23, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.24);
  backdrop-filter: blur(18px);
}

.stage-two-room-info {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 14px;

  color: #cbd5e1;
  font-size: 12px;
  font-weight: 850;
}

.stage-two-room-info strong {
  color: white;
  font-size: 13px;
  font-weight: 950;
}

.stage-live-dot {
  color: #22c55e;
}

.exit-stage-btn {
  min-height: 34px;
  padding: 0 14px;

  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);

  color: white;
  background: rgba(15, 23, 42, 0.78);

  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.game-player-controls button.active {
  color: white;
  background: rgba(37, 99, 235, 0.86);
  border-color: rgba(96, 165, 250, 0.58);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.16);
}

.game-player-controls button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.game-control-slider.is-muted span {
  background: #64748b;
}

.game-voice-status {
  min-height: 28px;
  padding: 0 10px;

  display: inline-flex;
  align-items: center;

  border-radius: 999px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(148, 163, 184, 0.2);

  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.game-voice-status.connected {
  color: #bfdbfe;
}

.game-voice-status.speaking {
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.36);
}

.game-voice-status.muted,
.game-voice-status.deafened {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.32);
}

.fullscreen-btn.active {
  color: white;
  background: rgba(79, 70, 229, 0.92);
  border-color: rgba(129, 140, 248, 0.62);
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

.room-page.game-focus-mode .chat-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;

  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;

  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(148, 163, 184, 0.24);
  backdrop-filter: blur(18px);
}

.room-page.game-focus-mode .chat-header h2 {
  color: white;
}

.room-page.game-focus-mode .chat-header p {
  color: #94a3b8;
}

.room-page.game-focus-mode .chat-header button {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.78);
  border-color: rgba(148, 163, 184, 0.28);
}

.focus-voice-card {
  margin-top: 14px;
  padding: 12px;

  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.42));
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.focus-card-head {
  margin-bottom: 12px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.focus-card-head span,
.focus-card-title-row span,
.focus-chat-title span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.focus-side-title {
  margin: 0;

  color: #94a3b8;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.focus-count-pill {
  min-width: 30px;
  height: 26px;

  display: grid;
  place-items: center;

  border-radius: 999px;
  color: #c7d2fe;
  background: rgba(99, 102, 241, 0.18);
  border: 1px solid rgba(129, 140, 248, 0.22);

  font-size: 12px;
  font-weight: 950;
}

.focus-channel-list {
  display: grid;
  gap: 8px;
}

.focus-channel-item {
  width: 100%;
  min-height: 38px;
  padding: 0 10px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-radius: 13px;
  border: 1px solid rgba(148, 163, 184, 0.18);

  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.46);

  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.focus-channel-item.active {
  color: white;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border-color: rgba(129, 140, 248, 0.42);
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.18);
}

.focus-channel-item strong {
  min-width: 24px;
  height: 24px;

  display: grid;
  place-items: center;

  border-radius: 999px;
  color: #c7d2fe;
  background: rgba(255, 255, 255, 0.12);

  font-size: 11px;
}

.connected-users-card {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.focus-card-title-row,
.focus-chat-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.focus-empty-user {
  margin-top: 10px;
  padding: 12px;

  border-radius: 14px;
  color: #64748b;
  background: rgba(2, 6, 23, 0.28);
  border: 1px dashed rgba(148, 163, 184, 0.18);

  font-size: 12px;
  font-weight: 800;
}

.focus-voice-user {
  min-height: 46px;
  margin-top: 10px;
  padding: 7px 8px;

  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 10px;

  border-radius: 16px;
  background: rgba(15, 23, 42, 0.48);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.room-page.game-focus-mode .voice-user-avatar {
  width: 36px;
  height: 36px;
  border-color: rgba(255, 255, 255, 0.18);
}

.room-page.game-focus-mode .voice-user-info span {
  color: #e2e8f0;
}

.room-page.game-focus-mode .voice-user-info small {
  color: #94a3b8;
}

.focus-speaking-bars {
  height: 26px;

  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;

  opacity: 0.35;
}

.focus-speaking-bars span {
  width: 4px;
  border-radius: 999px;
  background: #64748b;
}

.focus-speaking-bars span:nth-child(1) {
  height: 8px;
}

.focus-speaking-bars span:nth-child(2) {
  height: 16px;
}

.focus-speaking-bars span:nth-child(3) {
  height: 11px;
}

.focus-speaking-bars.active {
  opacity: 1;
}

.focus-speaking-bars.active span {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.42);
}

.focus-chat-title {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.room-page.game-focus-mode .chat-list {
  min-height: 0;
  overflow-y: auto;
  padding: 14px 0;
}

.room-page.game-focus-mode .chat-bubble {
  background: rgba(15, 23, 42, 0.58);
  border-color: rgba(148, 163, 184, 0.18);
}

.room-page.game-focus-mode .chat-message.system .chat-bubble {
  background: rgba(79, 70, 229, 0.16);
}

.room-page.game-focus-mode .chat-bubble p,
.room-page.game-focus-mode .chat-bubble strong {
  color: #e2e8f0;
}

.room-page.game-focus-mode .chat-bubble small {
  color: #94a3b8;
}

.room-page.game-focus-mode .chat-input {
  margin-top: 0;
}

.room-page.game-focus-mode .chat-input input {
  color: #e2e8f0;
  background: rgba(2, 6, 23, 0.58);
  border-color: rgba(148, 163, 184, 0.24);
}

.room-page.game-focus-mode .chat-input input::placeholder {
  color: #64748b;
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
   Purpose:
   - Keep full-size RoomView layout on wide screens
   - Hide left rail when the browser becomes half-screen
   - Prevent chat panel / create strip from overflowing right side
========================================================= */
@media (max-width: 1350px) {
  .room-page {
    grid-template-columns: 1fr;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .left-rail {
    display: none;
  }

  .room-main {
    width: 100%;
    max-width: 100vw;
    min-width: 0;
    padding: 16px 18px;
    overflow-x: hidden;
  }

  .room-header,
  .create-strip,
  .workspace-grid,
  .workspace-sidebar,
  .center-workspace,
  .chat-card,
  .member-bar,
  .game-area,
  .bottom-tabs {
    min-width: 0;
    max-width: 100%;
  }

  .create-strip {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px 18px;
    overflow: visible;
  }

  .create-strip-left {
    min-width: 0;
  }

  .create-strip h2,
  .create-strip p {
    white-space: normal;
  }

  .create-strip-control {
    width: 100%;
    min-width: 0;
    padding-left: 0;
    grid-template-columns: minmax(0, 1fr) minmax(190px, 240px) minmax(150px, 190px);
    gap: 12px;
  }

  .workspace-grid {
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 14px;
    align-items: stretch;
  }

  .workspace-sidebar {
    align-content: start;
  }

  .center-workspace {
    grid-template-rows: auto minmax(340px, 1fr) 58px;
  }

  .member-bar {
    grid-template-columns: 150px minmax(0, 1fr) auto auto;
    gap: 12px;
  }

  .chat-card {
    grid-column: 1 / -1;
    min-height: 360px;
    max-height: 460px;
  }

  .chat-list {
    max-height: 300px;
  }
}
/* =========================================================
   SECTION 11.5: Stage 2 Half-Screen Stack Layout
   Purpose:
   - Keep Game Screen on top
   - Show Focus Panel below Game Screen
   - Allow the whole Stage 2 page to scroll
   - Preserve VOXYN dark glass style
========================================================= */
@media (max-width: 1050px) {
  .room-page.game-focus-mode .room-main {
    width: 100vw;
    height: 100vh;
    height: 100dvh;

    padding: 10px;
    overflow-y: auto;
    overflow-x: hidden;

    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }

  .room-page.game-focus-mode .workspace-grid {
    width: 100%;
    height: auto;
    min-height: 0;

    display: grid;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto;
    gap: 14px;

    overflow: visible;
  }

  .room-page.game-focus-mode .center-workspace {
    grid-column: 1 / -1;

    width: 100%;
    height: calc(100vh - 20px);
    height: calc(100dvh - 20px);

    min-width: 0;
    min-height: 0;

    display: block;
    overflow: hidden;
  }

  .room-page.game-focus-mode .game-area {
    width: 100%;
    max-width: none;

    height: 100%;
    min-height: 0;

    padding: 74px 12px 92px;
    border-radius: 22px;

    overflow-y: auto;
    overflow-x: hidden;

    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
  }

  .room-page.game-focus-mode .game-area::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .room-page.game-focus-mode .game-focus-frame {
    width: 100%;
    min-width: 0;
    min-height: 100%;

    padding-top: 0;

    overflow: visible;
    box-sizing: border-box;
  }

  /* Focus Panel appears under the Game Screen */
  .room-page.game-focus-mode .chat-card {
    grid-column: 1 / -1;

    display: grid !important;

    width: 100%;
    min-width: 0;

    height: auto;
    min-height: calc(100vh - 20px);
    min-height: calc(100dvh - 20px);

    max-height: none;

    padding: 18px;
    border-radius: 28px;

    color: #e2e8f0;
    background:
      radial-gradient(circle at 20% 0%, rgba(96, 165, 250, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));

    border: 1px solid rgba(148, 163, 184, 0.28);

    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 18px 44px rgba(2, 6, 23, 0.28);

    backdrop-filter: blur(18px);

    grid-template-rows: auto auto auto minmax(360px, 1fr) auto;
    box-sizing: border-box;
  }

  .room-page.game-focus-mode .stage-two-game-topbar {
    top: 12px;
    left: 12px;
    right: 12px;

    min-height: 46px;
    padding: 8px 10px;

    border-radius: 16px;
  }

  .room-page.game-focus-mode .stage-two-room-info {
    gap: 8px;
    font-size: 11px;
  }

  .room-page.game-focus-mode .stage-two-room-info strong {
    max-width: 82px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-page.game-focus-mode .stage-two-room-info span:nth-of-type(2) {
    display: none;
  }

  .room-page.game-focus-mode .exit-stage-btn {
    min-height: 34px;
    padding: 0 11px;

    font-size: 11px;
  }

  .room-page.game-focus-mode .game-latency-pill,
  .room-page.game-focus-mode .fullscreen-hint {
    display: none;
  }

  .room-page.game-focus-mode .game-player-controls {
    left: 10px;
    right: 10px;
    bottom: 10px;

    min-height: 54px;
    padding: 8px;

    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    border-radius: 18px;
  }

  .room-page.game-focus-mode .game-control-left,
  .room-page.game-focus-mode .game-control-right {
    min-width: 0;
    gap: 7px;
  }

  .room-page.game-focus-mode .game-control-slider {
    display: none;
  }

  .room-page.game-focus-mode .game-player-controls button {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
  }

  .room-page.game-focus-mode .game-voice-status {
    max-width: 118px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-page.game-focus-mode .quality-pill {
    min-height: 38px;
    padding: 0 10px;
  }
}

/* =========================================================
   SECTION 11.6: Stage 2 Extremely Narrow Safety
   Purpose:
   - Extra protection for very narrow split-screen width
========================================================= */
@media (max-width: 560px) {
  .room-page.game-focus-mode .game-area {
    padding: 68px 10px 112px;
  }

  .room-page.game-focus-mode .stage-two-room-info span {
    display: none;
  }

  .room-page.game-focus-mode .game-player-controls {
    display: grid;
    grid-template-columns: auto auto auto 1fr auto;
  }

  .room-page.game-focus-mode .game-voice-status {
    max-width: 92px;
  }

  .room-page.game-focus-mode .quality-pill span {
    display: none;
  }
}


/* =========================================================
   SECTION 11: Phone Layout
   Purpose:
   - Phone-sized RoomView stack
========================================================= */
@media (max-width: 720px) {
  .room-page {
    grid-template-columns: 1fr;
  }

  .left-rail {
    display: none;
  }

  .room-main {
    padding: 14px;
  }

  .back-btn {
    width: 100%;
  }

  .room-header {
    display: grid;
    grid-template-columns: 1fr;
  }

  .create-strip {
    grid-template-columns: 1fr;
    border-radius: 22px;
  }

  .create-strip-left {
    align-items: flex-start;
  }

  .plus-box {
    width: 48px;
    height: 48px;
    flex-basis: 48px;
  }

  .workspace-sidebar {
    grid-template-columns: 1fr;
  }

  .room-code-card h2 {
    font-size: 30px;
  }

  .game-area {
    min-height: 340px;
    padding: 22px;
  }

  .game-area p {
    font-size: 26px;
    letter-spacing: 0.26em;
  }

  .game-player-controls {
    left: 12px;
    right: 12px;
    bottom: 12px;
    flex-direction: column;
    align-items: stretch;
  }

  .game-control-left,
  .game-control-right {
    justify-content: center;
  }

.fullscreen-hint {
  display: none;
}

  .bottom-tabs {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .chat-message {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .chat-avatar {
    width: 34px;
    height: 34px;
  }
}
/* =========================================================
   SECTION 11.7: Stage 2 Medium-Screen True Stack Layout
   Purpose:
   - Fix 1050px–1350px Stage 2 layout
   - Make Game Screen a real 3-row layout:
     topbar / scrollable game content / voice controls
   - Show Focus Panel below Game Screen
   - Add Leave Channel button styling
========================================================= */
@media (max-width: 1350px) {
  .room-page.game-focus-mode {
    height: auto !important;
    min-height: 100vh;
    min-height: 100dvh;

    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .room-page.game-focus-mode .room-main {
    width: 100vw;
    height: auto !important;
    min-height: 100vh;
    min-height: 100dvh;

    padding: 10px;
    overflow: visible !important;

    box-sizing: border-box;
  }

  .room-page.game-focus-mode .workspace-grid {
    width: 100%;
    height: auto !important;
    min-height: 0 !important;

    display: grid;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto;
    gap: 16px;

    overflow: visible !important;
  }

  .room-page.game-focus-mode .center-workspace {
    grid-column: 1 / -1;

    width: 100%;
    height: auto !important;
    min-height: 0;

    display: block;
    overflow: visible !important;
  }

  .room-page.game-focus-mode .game-area {
    width: 100%;
    height: 640px !important;
    min-height: 560px;
    max-height: 640px;

    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto;
    place-items: stretch;

    gap: 12px;
    padding: 14px;

    border-radius: 28px;
    overflow: hidden !important;

    text-align: left;
    box-sizing: border-box;
  }

  .room-page.game-focus-mode .stage-two-game-topbar {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;

    z-index: 8;

    width: 100%;
    min-height: 48px;
    padding: 8px 10px 8px 16px;

    border-radius: 16px;
    box-sizing: border-box;
  }

  .room-page.game-focus-mode .stage-two-game-scroll-shell {
    position: relative;
    z-index: 2;

    width: 100%;
    min-width: 0;
    min-height: 0;
    height: 100%;

    overflow-y: auto !important;
    overflow-x: hidden !important;

    padding: 0 4px 20px;

    box-sizing: border-box;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar {
    width: 6px;
  }

  .room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar-track {
    background: transparent;
  }

  .room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(96, 165, 250, 0.34);
  }

  .room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-stage),
  .room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-library),
  .room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-library-shell) {
    width: 100%;
    max-width: 100%;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  .room-page.game-focus-mode .game-player-controls {
    position: relative !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;

    z-index: 8;

    width: 100%;
    min-height: 56px;
    padding: 8px;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    border-radius: 18px;
    box-sizing: border-box;
  }

  .room-page.game-focus-mode .game-control-left,
  .room-page.game-focus-mode .game-control-right {
    min-width: 0;
    gap: 8px;
  }

  .room-page.game-focus-mode .game-control-slider {
    display: none;
  }

  .room-page.game-focus-mode .game-player-controls button {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
  }

  .room-page.game-focus-mode .leave-channel-icon-btn {
    color: #fecaca;
    border-color: rgba(248, 113, 113, 0.34);
    background: rgba(127, 29, 29, 0.22);
  }

  .room-page.game-focus-mode .leave-channel-icon-btn.active {
    color: white;
    border-color: rgba(248, 113, 113, 0.48);
    background: rgba(220, 38, 38, 0.42);
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.12);
  }

  .room-page.game-focus-mode .game-voice-status {
    max-width: 178px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-page.game-focus-mode .quality-pill {
    min-height: 40px;
    padding: 0 12px;
  }

  .room-page.game-focus-mode .game-latency-pill,
  .room-page.game-focus-mode .fullscreen-hint {
    display: none;
  }

  .room-page.game-focus-mode .stage-two-room-info {
    gap: 10px;
    font-size: 12px;
  }

  .room-page.game-focus-mode .stage-two-room-info strong {
    max-width: 120px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-page.game-focus-mode .stage-two-room-info span:nth-of-type(2) {
    display: none;
  }

  .room-page.game-focus-mode .exit-stage-btn {
    min-height: 34px;
    padding: 0 12px;
    font-size: 11px;
  }

  .room-page.game-focus-mode .chat-card {
    grid-column: 1 / -1;

    display: grid !important;

    width: 100%;
    min-width: 0;

    height: auto !important;
    min-height: 680px;
    max-height: none !important;

    padding: 18px;
    border-radius: 28px;

    color: #e2e8f0;
    background:
      radial-gradient(circle at 20% 0%, rgba(96, 165, 250, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));

    border: 1px solid rgba(148, 163, 184, 0.28);

    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 18px 44px rgba(2, 6, 23, 0.28);

    backdrop-filter: blur(18px);

    grid-template-rows: auto auto auto minmax(360px, 1fr) auto;
    box-sizing: border-box;
  }

  .room-page.game-focus-mode .focus-card-actions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .room-page.game-focus-mode .focus-leave-channel-btn {
    min-height: 42px;
    padding: 0 14px;

    border-radius: 14px;
    border: 1px solid rgba(248, 113, 113, 0.32);

    color: #fecaca;
    background: rgba(127, 29, 29, 0.2);

    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .room-page.game-focus-mode .focus-leave-channel-btn:hover:not(:disabled) {
    color: white;
    background: rgba(220, 38, 38, 0.42);
  }

  .room-page.game-focus-mode .focus-leave-channel-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

/* =========================================================
   SECTION 11.8: VOXYN v0.71 Final Stage 2 Layout Fix
   Purpose:
   - Keep desktop Stage 2 as Game Library + Focus Panel
   - Stop bottom voice bar from covering game cards
   - Restore clear Deafen / Mic / Leave Channel controls
   - Keep half-screen stack behavior only when screen is truly narrow
========================================================= */

/* Stage 2 game screen becomes a clean 3-row layout */
.room-page.game-focus-mode .game-area {
  width: 100%;
  height: calc(100vh - 32px);
  height: calc(100dvh - 32px);
  min-height: 620px;

  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;

  padding: 14px;
  overflow: hidden !important;

  text-align: left;
  box-sizing: border-box;
}

/* Topbar should not float over the game cards */
.room-page.game-focus-mode .stage-two-game-topbar {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;

  z-index: 10;

  width: 100%;
  min-height: 48px;

  box-sizing: border-box;
}

/* This is the only scroll area inside the game screen */
.room-page.game-focus-mode .stage-two-game-scroll-shell {
  position: relative;
  z-index: 2;

  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  padding: 0 4px 18px;

  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar {
  width: 6px;
}

.room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar-track {
  background: transparent;
}

.room-page.game-focus-mode .stage-two-game-scroll-shell::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.34);
}

/* Scoped style needs :deep because GameStage / GameLibrary are child components */
.room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-stage),
.room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-library),
.room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-library-shell),
.room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.game-grid),
.room-page.game-focus-mode .stage-two-game-scroll-shell :deep(.compact-game-list) {
  width: 100%;
  max-width: 100%;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: visible !important;
}

/* Bottom controls now take real layout space instead of covering cards */
.room-page.game-focus-mode .game-player-controls {
  position: relative !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;

  z-index: 10;

  width: 100%;
  min-height: 56px;

  flex-shrink: 0;
  box-sizing: border-box;
}

.room-page.game-focus-mode .game-control-left {
  min-width: 0;

  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.room-page.game-focus-mode .game-control-right {
  min-width: 0;

  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.room-page.game-focus-mode .game-control-slider {
  display: none !important;
}

.room-page.game-focus-mode .game-player-controls button {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
}

/* Deafen / disable sound button */
.room-page.game-focus-mode .deafen-control-btn {
  color: #dbeafe;
  border-color: rgba(96, 165, 250, 0.36);
  background: rgba(37, 99, 235, 0.34);
}

.room-page.game-focus-mode .deafen-control-btn.active {
  color: white;
  border-color: rgba(96, 165, 250, 0.62);
  background: rgba(37, 99, 235, 0.86);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.16);
}

.room-page.game-focus-mode .deafen-control-btn.deafened {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(127, 29, 29, 0.28);
}

/* Mic button */
.room-page.game-focus-mode .mic-control-btn.active {
  color: white;
  border-color: rgba(96, 165, 250, 0.62);
  background: rgba(37, 99, 235, 0.86);
}

/* Leave channel button */
.room-page.game-focus-mode .leave-channel-icon-btn {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.22);
}

.room-page.game-focus-mode .leave-channel-icon-btn.active {
  color: white;
  border-color: rgba(248, 113, 113, 0.48);
  background: rgba(220, 38, 38, 0.42);
}

.room-page.game-focus-mode .game-voice-status {
  max-width: 190px;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Desktop / wide mode: keep Focus Panel on the right */
.room-page.game-focus-mode .workspace-grid {
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: stretch;
}

.room-page.game-focus-mode .chat-card {
  grid-column: auto;
  height: calc(100vh - 32px);
  height: calc(100dvh - 32px);
  min-height: 620px;
  max-height: none;
}

/* Medium screen: still keep right panel if there is enough width */
@media (max-width: 1350px) and (min-width: 1051px) {
  .room-page.game-focus-mode .workspace-grid {
    grid-template-columns: minmax(0, 1fr) 310px !important;
    grid-template-rows: minmax(0, 1fr);
    gap: 14px;
  }

  .room-page.game-focus-mode .chat-card {
    grid-column: auto !important;
    height: calc(100vh - 20px);
    height: calc(100dvh - 20px);
    min-height: 560px;
  }
}

/* Real half-screen: stack Focus Panel below */
@media (max-width: 1050px) {
  .room-page.game-focus-mode .room-main {
    height: auto !important;
    min-height: 100vh;
    min-height: 100dvh;

    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .room-page.game-focus-mode .workspace-grid {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto;
    gap: 14px;

    height: auto !important;
    overflow: visible !important;
  }

  .room-page.game-focus-mode .center-workspace {
    height: auto !important;
    min-height: 0;
    overflow: visible !important;
  }

  .room-page.game-focus-mode .game-area {
    height: 640px;
    min-height: 560px;
  }

  .room-page.game-focus-mode .chat-card {
    grid-column: 1 / -1 !important;

    width: 100%;
    height: auto !important;
    min-height: 680px;
  }

  .room-page.game-focus-mode .game-voice-status {
    max-width: 132px;
  }

  .room-page.game-focus-mode .quality-pill span {
    display: none;
  }
}

/* =========================================================
   SECTION 11.9: VOXYN v0.71 Leave Button Mini Fix
   Purpose:
   - Replace ugly default Leave Channel tooltip/button
   - Keep Focus Panel clean
========================================================= */

.room-page.game-focus-mode .focus-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.room-page.game-focus-mode .focus-leave-mini-btn {
  width: 42px;
  height: 42px;

  display: inline-grid;
  place-items: center;

  border-radius: 14px;
  border: 1px solid rgba(248, 113, 113, 0.34);

  color: #fecaca;
  background:
    linear-gradient(135deg, rgba(127, 29, 29, 0.34), rgba(15, 23, 42, 0.78));

  font-size: 18px;
  font-weight: 950;

  cursor: pointer;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 22px rgba(127, 29, 29, 0.18);

  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease,
    opacity 0.16s ease;
}

.room-page.game-focus-mode .focus-leave-mini-btn.active:hover {
  transform: translateY(-1px);
  color: white;
  border-color: rgba(248, 113, 113, 0.58);
  background:
    linear-gradient(135deg, rgba(220, 38, 38, 0.58), rgba(88, 28, 135, 0.36));
}

.room-page.game-focus-mode .focus-leave-mini-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
}
</style>