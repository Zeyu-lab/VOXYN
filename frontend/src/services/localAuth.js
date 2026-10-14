export function apiUrl(pathname) {
  const base = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "")
  return base ? `${base}${pathname}` : pathname
}

export function createPlayerAuth(client, onSessionEnded) {
  const storageKey = "voxyn.local-admin.token"
  const localEmail = "admin123@mail.com"
  const listeners = new Set()
  let memoryToken = ""
  let heartbeat = null
  let heartbeatBusy = false
  let localSession = null
  let authGeneration = 0
  const readToken = () => {
    try { return sessionStorage.getItem(storageKey) || "" } catch { return memoryToken }
  }
  const writeToken = token => {
    memoryToken = token
    try { token ? sessionStorage.setItem(storageKey, token) : sessionStorage.removeItem(storageKey) } catch {}
  }
  const publish = event => {
    for (const callback of listeners) {
      queueMicrotask(() => {
        if (listeners.has(callback)) callback(event, localSession)
      })
    }
  }
  function clearLocal(expired = false) {
    authGeneration += 1
    writeToken("")
    localSession = null
    if (heartbeat) clearInterval(heartbeat)
    heartbeat = null
    publish("SIGNED_OUT")
    onSessionEnded?.(expired)
  }
  function normalizeUser(user) {
    const metadata = { ...user.user_metadata }
    if (metadata.avatar_url?.startsWith("/api/")) metadata.avatar_url = apiUrl(metadata.avatar_url)
    return { ...user, user_metadata: metadata }
  }
  function applySession(data) {
    if (!data.token || !data.user || !Number.isFinite(data.expiresAt)) throw new Error("Invalid local session response.")
    writeToken(data.token)
    localSession = {
      access_token: data.token, token_type: "local", expires_at: Math.floor(data.expiresAt / 1000),
      user: normalizeUser(data.user), is_local: true,
    }
    if (!heartbeat) heartbeat = setInterval(async () => {
      if (heartbeatBusy) return
      if (!readToken()) {
        if (localSession) clearLocal(true)
        return
      }
      heartbeatBusy = true
      const generation = authGeneration
      const token = readToken()
      try {
        const data = await request("/api/auth/local-admin/session", undefined, token)
        if (generation === authGeneration && token === readToken()) applySession(data)
      } catch (error) {
        if (generation === authGeneration && token === readToken() && (error.status === 401 || error.status === 404)) clearLocal(true)
      } finally { heartbeatBusy = false }
    }, 25000)
    return localSession
  }
  async function request(pathname, body, token = readToken()) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(apiUrl(pathname), {
        method: body === undefined ? "GET" : "POST",
        headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Local ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw Object.assign(new Error(data.message || "Request failed."), { status: response.status })
      return data
    } finally { clearTimeout(timeout) }
  }
  const methods = {
    async getSession() {
      if (!readToken()) {
        if (localSession) clearLocal()
        return client.auth.getSession()
      }
      const generation = authGeneration
      const token = readToken()
      try {
        const data = await request("/api/auth/local-admin/session", undefined, token)
        const current = generation === authGeneration && token === readToken()
        return { data: { session: current ? applySession(data) : null }, error: null }
      }
      catch (error) {
        if (generation === authGeneration && token === readToken() && (error.status === 401 || error.status === 404)) clearLocal()
        return { data: { session: null }, error }
      }
    },
    async getUser() {
      if (!readToken()) return client.auth.getUser()
      const result = await methods.getSession()
      return { data: { user: result.data.session?.user || null }, error: result.error }
    },
    async signInWithPassword(credentials) {
      const email = String(credentials.email || "").trim().toLowerCase()
      if (email !== localEmail) {
        if (readToken()) {
          const result = await methods.signOut()
          if (result.error) return { data: { session: null, user: null }, error: result.error }
        }
        return client.auth.signInWithPassword(credentials)
      }
      try {
        const data = await request("/api/auth/local-admin/login", { email, password: credentials.password, token: readToken() }, "")
        await client.auth.signOut({ scope: "local" })
        const session = applySession(data)
        publish("SIGNED_IN")
        return { data: { session, user: session.user }, error: null }
      } catch (error) { return { data: { session: null, user: null }, error } }
    },
    async signOut() {
      if (!readToken()) {
        if (localSession) clearLocal()
        return client.auth.signOut()
      }
      try { await request("/api/auth/local-admin/logout", {}); clearLocal(); return { error: null } }
      catch (error) {
        if (error.status === 401 || error.status === 404) { clearLocal(); return { error: null } }
        return { error }
      }
    },
    async updateUser(attributes) {
      if (!readToken()) return client.auth.updateUser(attributes)
      if (attributes.password || attributes.email) return { data: { user: null }, error: new Error("Change the local account credentials in its backend file.") }
      try {
        const data = await request("/api/auth/local-admin/profile", { data: attributes.data || {} })
        localSession = { ...localSession, user: normalizeUser(data.user) }
        publish("USER_UPDATED")
        return { data: { user: localSession.user }, error: null }
      } catch (error) { return { data: { user: null }, error } }
    },
    async uploadLocalAvatar(file) {
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error("Could not read this image."))
          reader.readAsDataURL(file)
        })
        const data = await request("/api/auth/local-admin/avatar", { dataUrl })
        localSession = { ...localSession, user: normalizeUser(data.user) }
        publish("USER_UPDATED")
        return { data: { user: localSession.user }, error: null }
      } catch (error) { return { data: { user: null }, error } }
    },
    onAuthStateChange(callback) {
      listeners.add(callback)
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (!readToken() && listeners.has(callback)) callback(event, session)
      })
      if (readToken()) void methods.getSession().then(result => {
        if (listeners.has(callback)) callback("INITIAL_SESSION", result.data.session)
      })
      return { data: { subscription: { unsubscribe() { listeners.delete(callback); data.subscription.unsubscribe() } } } }
    },
    async resetPasswordForEmail(email, options) {
      if (String(email).trim().toLowerCase() === localEmail) return { data: null, error: new Error("The local test account does not use email password reset.") }
      return client.auth.resetPasswordForEmail(email, options)
    },
  }
  return new Proxy(client.auth, {
    get(target, key) {
      if (key in methods) return methods[key]
      const value = Reflect.get(target, key, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  })
}