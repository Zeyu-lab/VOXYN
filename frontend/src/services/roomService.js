import { supabase } from "../lib/supabaseClient.js"
import { apiUrl } from "./localAuth.js"

async function request(pathname, method = "GET", body) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const session = data?.session
  if (!session) throw new Error("Please log in first.")
  const response = await fetch(apiUrl(pathname), {
    method,
    headers: {
      Authorization: `${session.token_type === "local" ? "Local" : "Bearer"} ${session.access_token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "Room request failed.")
  return result
}
const roomPath = code => `/api/player/rooms/${encodeURIComponent(String(code).trim().toUpperCase())}`
export const roomService = {
  async listOwned() { return (await request("/api/player/rooms")).rooms },
  async create(roomName, maxMembers) { return (await request("/api/player/rooms", "POST", { roomName, maxMembers })).room },
  async get(code) { return (await request(roomPath(code))).room },
  async join(code) { return request(`${roomPath(code)}/join`, "POST", {}) },
  async members(code) { return (await request(`${roomPath(code)}/members`)).members },
  async remove(code) { return request(roomPath(code), "DELETE") },
}