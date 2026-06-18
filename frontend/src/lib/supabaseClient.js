import { createClient } from "@supabase/supabase-js"
import { io } from "socket.io-client"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/*
  Socket strategy:
  - If VITE_SOCKET_URL is set, use it.
  - If VITE_SOCKET_URL is empty, use current page origin.
  - Local dev: http://localhost:5173/socket.io -> Vite proxy -> localhost:3001
  - Cloudflare: https://xxx.trycloudflare.com/socket.io -> Vite proxy -> localhost:3001
*/
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "").trim() || window.location.origin

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
  path: "/socket.io",
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
})