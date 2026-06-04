/* =========================================================
   useVoiceRoom.js
   Purpose:
   - VOXYN v0.52 real WebRTC voice system
   - Handles microphone, headphones, local stream,
     peer connections, speaking detection, remote audio,
     WebRTC offer / answer / ICE, and cleanup
========================================================= */

import { ref } from "vue"
import { ICE_SERVERS, SPEAKING_THRESHOLD } from "./voiceConfig.js"

export function useVoiceRoom() {
  /* =========================================================
     SECTION 1: Voice State
  ========================================================= */
  const localStream = ref(null)
  const remoteStreams = ref({})
  const peerConnections = ref({})

  const isMicOn = ref(true)
  const isDeafened = ref(false)
  const isSpeaking = ref(false)
  const isVoiceReady = ref(false)
  const voiceError = ref("")

  let audioContext = null
  let analyser = null
  let speakingAnimationFrame = null
  const pendingIceCandidates = new Map()

  /* =========================================================
     SECTION 2: Local Microphone
  ========================================================= */
  async function startLocalAudio() {
    try {
      voiceError.value = ""

      if (localStream.value) {
        isVoiceReady.value = true
        return localStream.value
      }

      localStream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        },
        video: false
      })

      localStream.value.getAudioTracks().forEach((track) => {
        track.enabled = isMicOn.value
      })

      isVoiceReady.value = true
      startSpeakingDetection()

      console.log("VOXYN voice: microphone ready")

      return localStream.value
    } catch (error) {
      console.error("VOXYN voice: microphone error", error)

      voiceError.value = "Microphone permission was denied."
      isVoiceReady.value = false

      return null
    }
  }

  /* =========================================================
     SECTION 3: Microphone Control
  ========================================================= */
  function toggleMicrophone() {
    isMicOn.value = !isMicOn.value

    if (!localStream.value) {
      return
    }

    localStream.value.getAudioTracks().forEach((track) => {
      track.enabled = isMicOn.value
    })

    if (!isMicOn.value) {
      isSpeaking.value = false
    }
  }

  /* =========================================================
     SECTION 4: Headphones Control
  ========================================================= */
  function toggleHeadphones() {
    isDeafened.value = !isDeafened.value
    syncRemoteAudioMutedState()
  }

  function syncRemoteAudioMutedState() {
    const audioElements = document.querySelectorAll("[data-voxyn-remote-audio]")

    audioElements.forEach((audioElement) => {
      audioElement.muted = isDeafened.value
    })
  }

  /* =========================================================
     SECTION 5: Speaking Detection
     Purpose:
     - Detect whether local user is speaking
     - Used for green avatar ring
  ========================================================= */
  function startSpeakingDetection() {
    if (!localStream.value) {
      return
    }

    if (speakingAnimationFrame) {
      cancelAnimationFrame(speakingAnimationFrame)
      speakingAnimationFrame = null
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      console.warn("VOXYN voice: AudioContext is not supported")
      return
    }

    audioContext = new AudioContextClass()
    analyser = audioContext.createAnalyser()

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {})
    }

    const microphoneSource = audioContext.createMediaStreamSource(localStream.value)

    analyser.fftSize = 512
    microphoneSource.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function detectSpeaking() {
      if (!analyser || !isMicOn.value) {
        isSpeaking.value = false
        speakingAnimationFrame = requestAnimationFrame(detectSpeaking)
        return
      }

      analyser.getByteFrequencyData(dataArray)

      const volume =
        dataArray.reduce((total, value) => total + value, 0) / dataArray.length

      isSpeaking.value = volume > SPEAKING_THRESHOLD

      speakingAnimationFrame = requestAnimationFrame(detectSpeaking)
    }

    detectSpeaking()
  }

  /* =========================================================
     SECTION 6: Peer Connection Core
     Purpose:
     - Create WebRTC peer connection
     - Add local audio track
     - Receive remote audio stream
  ========================================================= */
  function createPeerConnection(targetSocketId, socket) {
    const existingPeerConnection = peerConnections.value[targetSocketId]

    if (
      existingPeerConnection &&
      existingPeerConnection.connectionState !== "closed"
    ) {
      return existingPeerConnection
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    addLocalTracks(peerConnection)

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return

      socket.emit("voice:ice-candidate", {
        targetSocketId,
        candidate: event.candidate
      })
    }

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams?.[0]

      if (!remoteStream) return

      remoteStreams.value = {
        ...remoteStreams.value,
        [targetSocketId]: remoteStream
      }

      setTimeout(() => {
        syncRemoteAudioMutedState()
      }, 0)

      console.log("VOXYN voice: remote audio stream received", targetSocketId)
    }

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "VOXYN voice: peer state",
        targetSocketId,
        peerConnection.connectionState
      )

      if (
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "closed"
      ) {
        removePeerConnection(targetSocketId)
      }
    }

    peerConnections.value = {
      ...peerConnections.value,
      [targetSocketId]: peerConnection
    }

    return peerConnection
  }

  function addLocalTracks(peerConnection) {
    if (!localStream.value) return

    localStream.value.getTracks().forEach((track) => {
      const alreadyAdded = peerConnection
        .getSenders()
        .some((sender) => sender.track?.id === track.id)

      if (!alreadyAdded) {
        peerConnection.addTrack(track, localStream.value)
      }
    })
  }

  /* =========================================================
     SECTION 6.1: Create Offer
     Purpose:
     - Start WebRTC connection to another voice user
  ========================================================= */
  async function connectToPeer(targetSocketId, socket) {
    if (!targetSocketId || !socket?.connected) return null

    const stream = await startLocalAudio()

    if (!stream) return null

    const peerConnection = createPeerConnection(targetSocketId, socket)

    if (peerConnection.localDescription) {
      return peerConnection
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    socket.emit("voice:offer", {
      targetSocketId,
      offer: peerConnection.localDescription
    })

    console.log("VOXYN voice: offer sent", targetSocketId)

    return peerConnection
  }

  /* =========================================================
     SECTION 6.2: Handle Offer
     Purpose:
     - Receive offer from another user
     - Create and send answer
  ========================================================= */
  async function handleVoiceOffer(fromSocketId, offer, socket) {
    if (!fromSocketId || !offer || !socket?.connected) return

    const stream = await startLocalAudio()

    if (!stream) return

    const peerConnection = createPeerConnection(fromSocketId, socket)

    if (peerConnection.signalingState !== "stable") {
      await peerConnection
        .setLocalDescription({ type: "rollback" })
        .catch(() => {})
    }

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    )

    await flushPendingIceCandidates(fromSocketId, peerConnection)

    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socket.emit("voice:answer", {
      targetSocketId: fromSocketId,
      answer: peerConnection.localDescription
    })

    console.log("VOXYN voice: answer sent", fromSocketId)
  }

  /* =========================================================
     SECTION 6.3: Handle Answer
     Purpose:
     - Complete WebRTC connection after offer
  ========================================================= */
  async function handleVoiceAnswer(fromSocketId, answer) {
    if (!fromSocketId || !answer) return

    const peerConnection = peerConnections.value[fromSocketId]

    if (!peerConnection) return

    if (peerConnection.signalingState === "stable") {
      return
    }

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    )

    await flushPendingIceCandidates(fromSocketId, peerConnection)

    console.log("VOXYN voice: answer received", fromSocketId)
  }

  /* =========================================================
     SECTION 6.4: Handle ICE Candidate
     Purpose:
     - Add ICE candidates for WebRTC network connection
  ========================================================= */
  async function handleVoiceIceCandidate(fromSocketId, candidate) {
    if (!fromSocketId || !candidate) return

    const peerConnection = peerConnections.value[fromSocketId]

    if (!peerConnection || !peerConnection.remoteDescription) {
      const currentQueue = pendingIceCandidates.get(fromSocketId) || []
      currentQueue.push(candidate)
      pendingIceCandidates.set(fromSocketId, currentQueue)
      return
    }

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  async function flushPendingIceCandidates(socketId, peerConnection) {
    const queuedCandidates = pendingIceCandidates.get(socketId) || []

    for (const candidate of queuedCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }

    pendingIceCandidates.delete(socketId)
  }

  /* =========================================================
     SECTION 6.5: Sync Voice Peers
     Purpose:
     - Connect only to users inside the same voice channel
     - Use socket id order to prevent duplicate offers
  ========================================================= */
  async function syncVoicePeers(options) {
    const users = Array.isArray(options?.users) ? options.users : []
    const currentSocketId = options?.currentSocketId
    const currentVoiceChannel = options?.currentVoiceChannel || "Lobby"
    const socket = options?.socket

    if (!isVoiceReady.value || !currentSocketId || !socket?.connected) {
      return
    }

    const usersInSameChannel = users.filter((voiceUser) => {
      return (
        voiceUser?.socketId &&
        voiceUser.socketId !== currentSocketId &&
        (voiceUser.voiceChannel || "Lobby") === currentVoiceChannel
      )
    })

    const validPeerIds = new Set(
      usersInSameChannel.map((voiceUser) => voiceUser.socketId)
    )

    Object.keys(peerConnections.value).forEach((peerSocketId) => {
      if (!validPeerIds.has(peerSocketId)) {
        removePeerConnection(peerSocketId)
      }
    })

    for (const voiceUser of usersInSameChannel) {
      const targetSocketId = voiceUser.socketId

      if (!targetSocketId) continue

      if (currentSocketId < targetSocketId) {
        await connectToPeer(targetSocketId, socket)
      }
    }
  }

  /* =========================================================
     SECTION 6.6: Remove Peer
  ========================================================= */
  function removePeerConnection(targetSocketId) {
    const peerConnection = peerConnections.value[targetSocketId]

    if (peerConnection) {
      peerConnection.close()
    }

    const nextPeerConnections = { ...peerConnections.value }
    const nextRemoteStreams = { ...remoteStreams.value }

    delete nextPeerConnections[targetSocketId]
    delete nextRemoteStreams[targetSocketId]

    peerConnections.value = nextPeerConnections
    remoteStreams.value = nextRemoteStreams
    pendingIceCandidates.delete(targetSocketId)
  }

  /* =========================================================
     SECTION 7: Cleanup
  ========================================================= */
  function cleanupVoiceRoom() {
    if (speakingAnimationFrame) {
      cancelAnimationFrame(speakingAnimationFrame)
      speakingAnimationFrame = null
    }

    if (audioContext) {
      audioContext.close().catch(() => {})
      audioContext = null
    }

    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => {
        track.stop()
      })
    }

    Object.values(peerConnections.value).forEach((peerConnection) => {
      peerConnection.close()
    })

    pendingIceCandidates.clear()

    localStream.value = null
    remoteStreams.value = {}
    peerConnections.value = {}

    isVoiceReady.value = false
    isSpeaking.value = false
  }

  return {
    localStream,
    remoteStreams,
    peerConnections,

    isMicOn,
    isDeafened,
    isSpeaking,
    isVoiceReady,
    voiceError,

    startLocalAudio,
    toggleMicrophone,
    toggleHeadphones,
    createPeerConnection,
    connectToPeer,
    handleVoiceOffer,
    handleVoiceAnswer,
    handleVoiceIceCandidate,
    syncVoicePeers,
    removePeerConnection,
    cleanupVoiceRoom
  }
}