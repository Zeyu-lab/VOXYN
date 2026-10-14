import { createClient } from "@supabase/supabase-js"
import { io } from "socket.io-client"
import { createPlayerAuth } from "../services/localAuth.js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL")
if (!supabaseKey) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY")

const realSupabase = createClient(supabaseUrl, supabaseKey)
const playerAuth = createPlayerAuth(realSupabase, expired => {
  socket.disconnect()
  if (expired && window.location.pathname !== "/login") window.location.assign("/login")
})
export const supabase = new Proxy(realSupabase, {
  get(target, key) {
    if (key === "auth") return playerAuth
    const value = Reflect.get(target, key, target)
    return typeof value === "function" ? value.bind(target) : value
  },
})

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "").trim() || window.location.origin
export const socket = io(SOCKET_URL, {
  path: "/socket.io", autoConnect: false, transports: ["websocket", "polling"], withCredentials: true,
  auth: async callback => {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    callback(session?.token_type === "local"
      ? { localAdminToken: session.access_token }
      : { accessToken: session?.access_token || "" })
  },
})