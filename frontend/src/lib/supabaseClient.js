import { createClient } from "@supabase/supabase-js"
import { io } from "socket.io-client"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/*
  Dev mode:
  - Vite runs on localhost:5173
  - Backend runs on localhost:3001

  Production / HTTPS tunnel mode:
  - Express serves frontend and backend from the same origin
  - Socket should connect to window.location.origin
*/
const SOCKET_URL = import.meta.env.DEV
  ? import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
  : window.location.origin

console.log("Supabase URL:", supabaseUrl)
console.log("Supabase key loaded:", !!supabaseKey)
console.log("Socket URL:", SOCKET_URL)

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL")
}

if (!supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY")
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
})