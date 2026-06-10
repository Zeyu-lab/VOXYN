import { computed, onBeforeUnmount, ref, watch } from "vue"

export function useGameSession(options) {
  const socket = options.socket
  const roomCode = options.roomCode
  const gameId = options.gameId
  const defaultRole = options.defaultRole || "player"

  const session = ref(null)
  const role = ref("none")
  const slotId = ref("")
  const lastGameState = ref(null)
  const isJoining = ref(false)
  const sessionError = ref("")

  const activeSocket = computed(() => {
    return typeof socket === "function" ? socket() : socket?.value || socket
  })

  const activeRoomCode = computed(() => {
    return typeof roomCode === "function" ? roomCode() : roomCode?.value || roomCode
  })

  const isPlayer = computed(() => {
    return role.value === "player"
  })

  const isSpectator = computed(() => {
    return role.value === "spectator"
  })

  const playerCount = computed(() => {
    return session.value?.playerCount || 0
  })

  const maxPlayers = computed(() => {
    return session.value?.maxPlayers || 0
  })

  const spectatorCount = computed(() => {
    return session.value?.spectatorCount || 0
  })

  const hasOpenPlayerSlot = computed(() => {
    return playerCount.value < maxPlayers.value
  })

  const myPlayerSlot = computed(() => {
    if (!session.value?.playerSlots) return null

    return session.value.playerSlots.find((slot) => {
      return slot?.player?.socketId === activeSocket.value?.id
    }) || null
  })

  function applySession(nextSession) {
    if (!nextSession || nextSession.gameId !== gameId) return

    session.value = nextSession

    const socketId = activeSocket.value?.id

    const playerSlot = nextSession.playerSlots?.find((slot) => {
      return slot?.player?.socketId === socketId
    })

    if (playerSlot) {
      role.value = "player"
      slotId.value = playerSlot.slotId
      return
    }

    const spectator = nextSession.spectators?.find((viewer) => {
      return viewer?.socketId === socketId
    })

    if (spectator) {
      role.value = "spectator"
      slotId.value = ""
      return
    }

    role.value = "none"
    slotId.value = ""
  }

  function handleSessionUpdate(nextSession) {
    applySession(nextSession)
  }

  function handleStateUpdate(payload) {
    if (payload?.gameId !== gameId) return

    if (payload.session) {
      applySession(payload.session)
    }

    lastGameState.value = payload.gameState || null
  }

  function bindSocketEvents() {
    if (!activeSocket.value) return

    activeSocket.value.off("game:session-update", handleSessionUpdate)
    activeSocket.value.off("game:state-update", handleStateUpdate)

    activeSocket.value.on("game:session-update", handleSessionUpdate)
    activeSocket.value.on("game:state-update", handleStateUpdate)
  }

  function unbindSocketEvents() {
    if (!activeSocket.value) return

    activeSocket.value.off("game:session-update", handleSessionUpdate)
    activeSocket.value.off("game:state-update", handleStateUpdate)
  }

  function joinSession(preferRole = defaultRole) {
    if (!activeSocket.value || !activeRoomCode.value) return

    isJoining.value = true
    sessionError.value = ""

    activeSocket.value.emit(
      "game:join-session",
      {
        roomCode: activeRoomCode.value,
        gameId,
        role: preferRole
      },
      (response) => {
        isJoining.value = false

        if (!response?.ok) {
          sessionError.value = response?.error || "Failed to join game session."
          return
        }

        role.value = response.role || "none"
        slotId.value = response.slotId || ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function joinAsPlayer(preferredSlotId = "") {
    if (!activeSocket.value || !activeRoomCode.value) return

    activeSocket.value.emit(
      "game:join-as-player",
      {
        roomCode: activeRoomCode.value,
        gameId,
        slotId: preferredSlotId
      },
      (response) => {
        if (!response?.ok) {
          sessionError.value = response?.error || "Failed to join as player."
          return
        }

        role.value = response.role || "player"
        slotId.value = response.slotId || ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function joinAsSpectator() {
    if (!activeSocket.value || !activeRoomCode.value) return

    activeSocket.value.emit(
      "game:join-as-spectator",
      {
        roomCode: activeRoomCode.value,
        gameId
      },
      (response) => {
        if (!response?.ok) {
          sessionError.value = response?.error || "Failed to join as spectator."
          return
        }

        role.value = response.role || "spectator"
        slotId.value = ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function leaveSession() {
    if (!activeSocket.value || !activeRoomCode.value) return

    activeSocket.value.emit("game:leave-session", {
      roomCode: activeRoomCode.value,
      gameId
    })

    session.value = null
    role.value = "none"
    slotId.value = ""
    lastGameState.value = null
  }

  function syncGameState(gameState) {
    if (!activeSocket.value || !activeRoomCode.value) return
    if (!isPlayer.value) return

    activeSocket.value.emit("game:state-sync", {
      roomCode: activeRoomCode.value,
      gameId,
      gameState
    })
  }

  watch(
    () => [activeSocket.value, activeRoomCode.value],
    () => {
      if (!activeSocket.value || !activeRoomCode.value) return

      bindSocketEvents()
      joinSession(defaultRole)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    leaveSession()
    unbindSocketEvents()
  })

  return {
    session,
    role,
    slotId,
    lastGameState,
    isJoining,
    sessionError,

    isPlayer,
    isSpectator,
    playerCount,
    maxPlayers,
    spectatorCount,
    hasOpenPlayerSlot,
    myPlayerSlot,

    joinSession,
    joinAsPlayer,
    joinAsSpectator,
    leaveSession,
    syncGameState
  }
}