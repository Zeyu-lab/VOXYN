/* =========================================================
   useVoiceRoom.js
   Purpose:
   - VOXYN v0.5 WebRTC voice system
   - Handles microphone, headphones, local stream,
     peer connections, speaking detection, and cleanup
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

  /* =========================================================
     SECTION 2: Local Microphone
  ========================================================= */
  async function startLocalAudio() {
    try {
      voiceError.value = ""

      localStream.value = await navigator.mediaDevices.getUserMedia({
        audio: true,
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

    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()

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
     SECTION 6: Peer Connection
     Purpose:
     - Create WebRTC peer connection
     - Add local audio track
     - Receive remote audio stream
  ========================================================= */
  function createPeerConnection(targetSocketId, socket) {
    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream.value)
      })
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice:ice-candidate", {
          targetSocketId,
          candidate: event.candidate
        })
      }
    }

    peerConnection.ontrack = (event) => {
      remoteStreams.value = {
        ...remoteStreams.value,
        [targetSocketId]: event.streams[0]
      }
    }

    peerConnections.value = {
      ...peerConnections.value,
      [targetSocketId]: peerConnection
    }

    return peerConnection
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
      audioContext.close()
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
    cleanupVoiceRoom
  }
}