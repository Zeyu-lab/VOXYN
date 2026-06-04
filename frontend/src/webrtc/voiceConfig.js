/* =========================================================
   voiceConfig.js
   Purpose:
   - WebRTC configuration for VOXYN voice rooms
========================================================= */

export const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302"
  }
]

export const VOICE_CHANNELS = ["Lobby", "Squad", "Break"]

export const SPEAKING_THRESHOLD = 18