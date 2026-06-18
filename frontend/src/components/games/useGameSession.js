import { computed, onBeforeUnmount, ref, watch } from "vue"

export function useGameSession(options = {}) {
  const socket = options.socket
  const roomCode = options.roomCode
  const gameId = options.gameId
  const defaultRole = options.defaultRole || "player"

  const allowLocalFallback = options.allowLocalFallback !== false
  const fallbackDelay = options.fallbackDelay || 1800

  const session = ref(null)
  const role = ref("none")
  const slotId = ref("")
  const lastGameState = ref(null)
  const isJoining = ref(false)
  const sessionError = ref("")
  const localFallbackActive = ref(false)

  let boundSocket = null
  let joinFallbackTimer = null

  const activeSocket = computed(() => {
    return typeof socket === "function" ? socket() : socket?.value || socket
  })

  const activeRoomCode = computed(() => {
    return typeof roomCode === "function" ? roomCode() : roomCode?.value || roomCode
  })

  const isPlayer = computed(() => {
    return role.value === "player" || localFallbackActive.value
  })

  const isSpectator = computed(() => {
    return role.value === "spectator" && !localFallbackActive.value
  })

  const playerCount = computed(() => {
    return session.value?.playerCount || (localFallbackActive.value ? 1 : 0)
  })

  const maxPlayers = computed(() => {
    return session.value?.maxPlayers || (localFallbackActive.value ? 1 : 0)
  })

  const spectatorCount = computed(() => {
    return session.value?.spectatorCount || 0
  })

  const hasOpenPlayerSlot = computed(() => {
    if (maxPlayers.value <= 0) return true
    return playerCount.value < maxPlayers.value
  })

  const myPlayerSlot = computed(() => {
    if (localFallbackActive.value) {
      return {
        slotId: "local-player",
        player: {
          socketId: activeSocket.value?.id || "local"
        }
      }
    }

    if (!session.value?.playerSlots) return null

    return (
      session.value.playerSlots.find((slot) => {
        return slot?.player?.socketId === activeSocket.value?.id
      }) || null
    )
  })

  function clearJoinFallbackTimer() {
    if (!joinFallbackTimer) return
    clearTimeout(joinFallbackTimer)
    joinFallbackTimer = null
  }

  function enableLocalFallback(message = "") {
    if (!allowLocalFallback) return false
    if (defaultRole !== "player") return false

    localFallbackActive.value = true
    role.value = "player"
    slotId.value = "local-player"
    isJoining.value = false


    sessionError.value = message || ""

    return true
  }

  function disableLocalFallback() {
    localFallbackActive.value = false

    if (slotId.value === "local-player") {
      slotId.value = ""
    }
  }

  function resetLocalState() {
    clearJoinFallbackTimer()

    session.value = null
    role.value = "none"
    slotId.value = ""
    lastGameState.value = null
    isJoining.value = false
    sessionError.value = ""
    localFallbackActive.value = false
  }

  function applySession(nextSession) {
    if (!nextSession || nextSession.gameId !== gameId) return

    disableLocalFallback()

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
    const nextSocket = activeSocket.value
    if (!nextSocket) return

    if (boundSocket && boundSocket !== nextSocket) {
      boundSocket.off("game:session-update", handleSessionUpdate)
      boundSocket.off("game:state-update", handleStateUpdate)
    }

    nextSocket.off("game:session-update", handleSessionUpdate)
    nextSocket.off("game:state-update", handleStateUpdate)

    nextSocket.on("game:session-update", handleSessionUpdate)
    nextSocket.on("game:state-update", handleStateUpdate)

    boundSocket = nextSocket
  }

  function unbindSocketEvents() {
    if (!boundSocket) return

    boundSocket.off("game:session-update", handleSessionUpdate)
    boundSocket.off("game:state-update", handleStateUpdate)

    boundSocket = null
  }

  function joinSession(preferRole = defaultRole) {
    clearJoinFallbackTimer()

    const nextSocket = activeSocket.value
    const nextRoomCode = activeRoomCode.value

    sessionError.value = ""

    if (!nextSocket || !nextRoomCode) {
      enableLocalFallback()
      return
    }

    isJoining.value = true

    if (allowLocalFallback && preferRole === "player") {
      joinFallbackTimer = setTimeout(() => {
        if (!isJoining.value) return
        if (role.value === "player") return

        enableLocalFallback("Game session did not respond. Running locally.")
      }, fallbackDelay)
    }

    nextSocket.emit(
      "game:join-session",
      {
        roomCode: nextRoomCode,
        gameId,
        role: preferRole
      },
      (response) => {
        clearJoinFallbackTimer()
        isJoining.value = false

        if (!response?.ok) {
          const message = response?.error || "Failed to join game session."

          if (preferRole === "player" && enableLocalFallback(message)) {
            return
          }

          sessionError.value = message
          return
        }

        disableLocalFallback()

        role.value = response.role || "none"
        slotId.value = response.slotId || ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function joinAsPlayer(preferredSlotId = "") {
    clearJoinFallbackTimer()

    const nextSocket = activeSocket.value
    const nextRoomCode = activeRoomCode.value

    if (!nextSocket || !nextRoomCode) {
      enableLocalFallback()
      return
    }

    nextSocket.emit(
      "game:join-as-player",
      {
        roomCode: nextRoomCode,
        gameId,
        slotId: preferredSlotId
      },
      (response) => {
        if (!response?.ok) {
          const message = response?.error || "Failed to join as player."

          if (enableLocalFallback(message)) {
            return
          }

          sessionError.value = message
          return
        }

        disableLocalFallback()

        role.value = response.role || "player"
        slotId.value = response.slotId || ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function joinAsSpectator() {
    clearJoinFallbackTimer()

    const nextSocket = activeSocket.value
    const nextRoomCode = activeRoomCode.value

    if (!nextSocket || !nextRoomCode) {
      sessionError.value = "Socket is not connected."
      return
    }

    nextSocket.emit(
      "game:join-as-spectator",
      {
        roomCode: nextRoomCode,
        gameId
      },
      (response) => {
        if (!response?.ok) {
          sessionError.value = response?.error || "Failed to join as spectator."
          return
        }

        disableLocalFallback()

        role.value = response.role || "spectator"
        slotId.value = ""

        if (response.session) {
          applySession(response.session)
        }
      }
    )
  }

  function leaveSession() {
    clearJoinFallbackTimer()

    const nextSocket = activeSocket.value
    const nextRoomCode = activeRoomCode.value

    if (nextSocket && nextRoomCode && !localFallbackActive.value) {
      nextSocket.emit("game:leave-session", {
        roomCode: nextRoomCode,
        gameId
      })
    }

    resetLocalState()
  }

  function syncGameState(gameState) {
    if (!isPlayer.value) return

    const nextSocket = activeSocket.value
    const nextRoomCode = activeRoomCode.value

    // 本地 fallback 模式下不强行同步，避免报错。
    if (!nextSocket || !nextRoomCode || localFallbackActive.value) return

    nextSocket.emit("game:state-sync", {
      roomCode: nextRoomCode,
      gameId,
      gameState
    })
  }

  watch(
    () => [activeSocket.value, activeRoomCode.value],
    () => {
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
    localFallbackActive,

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