import { createClient } from "@supabase/supabase-js"
import { io } from "socket.io-client"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

console.log("Supabase URL:", supabaseUrl)
console.log("Supabase key loaded:", !!supabaseKey)

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL")
}

if (!supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY")
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"]
})