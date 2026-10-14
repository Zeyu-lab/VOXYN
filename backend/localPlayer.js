const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function installLocalPlayer({ app, io, supabaseAdmin, liveRooms }) {
  const accountFile = path.join(__dirname, "local-admin.json");
  const stateDir = path.join(__dirname, ".voxyn-local");
  const stateFile = path.join(stateDir, "rooms.json");
  const LOCAL_USER_ID = "local-admin";
  const idleMs = 5 * 60 * 1000;
  fs.mkdirSync(stateDir, { recursive: true });
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
    : { rooms: [], members: [] };
  if (!Array.isArray(state.rooms) || !Array.isArray(state.members)) {
    throw new Error("Invalid local room storage.");
  }
  let session = null;
  let mutationTail = Promise.resolve();
  const enabled = () => process.env.NODE_ENV === "development" && process.env.LOCAL_ADMIN_ENABLED === "true";
  const fail = (message, status = 400) => Object.assign(new Error(message), { status });
  const save = () => {
    fs.writeFileSync(`${stateFile}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(`${stateFile}.tmp`, stateFile);
  };
  const saveAccount = (account) => {
    fs.writeFileSync(`${accountFile}.tmp`, JSON.stringify(account, null, 2), { mode: 0o600 });
    fs.renameSync(`${accountFile}.tmp`, accountFile);
  };
  const accountUser = (account) => ({
    id: LOCAL_USER_ID, email: account.email, auth_source: "local",
    user_metadata: { display_name: "Local Admin", status_message: "Testing VOXYN", ...account.user_metadata },
  });
  function endSession() {
    const token = session?.token;
    session = null;
    if (token) for (const socket of io.sockets.sockets.values()) {
      if (socket.data.localToken === token) socket.disconnect(true);
    }
  }
  function activeSession(token, touch = true) {
    if (session && (!enabled() || session.expiresAt <= Date.now())) endSession();
    if (!session || !token || token !== session.token) throw fail("Local session expired. Please log in again.", 401);
    if (touch) session.expiresAt = Date.now() + idleMs;
    return session;
  }
  function publicSession() {
    return { token: session.token, user: session.user, expiresAt: session.expiresAt, expiresInSeconds: idleMs / 1000 };
  }
  async function authenticate(header) {
    const [scheme, token] = String(header || "").split(" ");
    if (scheme === "Local") {
      return { user: activeSession(token).user, local: true, token };
    }
    if (scheme !== "Bearer" || !token) throw fail("Please log in first.", 401);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) throw fail("Invalid login session.", 401);
    return { user: data.user, local: false, token };
  }
    function endpoint(
    method,
    url,
    fn,
    { auth = true, serialize = false } = {}
  ) {
    app[method](url, async (req, res) => {
      const perform = async () => {
        const actor = auth
          ? await authenticate(req.headers.authorization)
          : null;

        return fn(req, res, actor);
      };

      try {
        if (serialize) {
          const operation = mutationTail.then(perform, perform);

          mutationTail = operation.catch(() => {});

          await operation;
        } else {
          await perform();
        }
      } catch (error) {
        const suppliedStatus = Number(error?.status);

        const status =
          Number.isInteger(suppliedStatus) &&
          suppliedStatus >= 400 &&
          suppliedStatus <= 599
            ? suppliedStatus
            : 500;

        const detail = error?.message || String(error);

        console.error(
          `[VOXYN Player] ${req.method} ${req.path}: ${detail}`
        );

        if (res.headersSent) return;

        const development =
          process.env.NODE_ENV === "development";

        return res.status(status).json({
          message: development
            ? `${req.method} ${req.path}: ${detail}`
            : status < 500
              ? detail
              : "Could not complete the request.",
        });
      }
    });
  }
  endpoint("post", "/api/auth/local-admin/login", (req, res) => {
    if (!enabled()) throw fail("Local account is disabled.", 404);
    const account = JSON.parse(fs.readFileSync(accountFile, "utf8"));
    if (!/^[a-f0-9]{32}$/.test(account.salt || "") || !/^[a-f0-9]{128}$/.test(account.passwordHash || "")) throw fail("Invalid local account configuration.", 500);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (email !== String(account.email).toLowerCase() || !password || password.length > 256) throw fail("Invalid email or password.", 401);
    if (!crypto.timingSafeEqual(crypto.scryptSync(password, account.salt, 64), Buffer.from(account.passwordHash, "hex"))) throw fail("Invalid email or password.", 401);
    if (session && session.expiresAt <= Date.now()) endSession();
    if (session && req.body?.token !== session.token) throw fail("This account is already in use.", 409);
    if (!session) session = { token: crypto.randomBytes(32).toString("hex"), expiresAt: Date.now() + idleMs, user: accountUser(account) };
    session.expiresAt = Date.now() + idleMs;
    return res.json(publicSession());
  }, { auth: false });
  endpoint("get", "/api/auth/local-admin/session", (req, res, actor) => {
    if (!actor.local) throw fail("A local session is required.", 403);
    res.json(publicSession());
  });
  endpoint("post", "/api/auth/local-admin/logout", (req, res, actor) => {
    if (!actor.local) throw fail("A local session is required.", 403);
    endSession();
    res.json({ message: "Logged out." });
  });
  endpoint("post", "/api/auth/local-admin/profile", (req, res, actor) => {
    if (!actor.local) throw fail("A local session is required.", 403);
    const account = JSON.parse(fs.readFileSync(accountFile, "utf8"));
    const displayName = String(req.body?.data?.display_name ?? actor.user.user_metadata.display_name).trim();
    const status = String(req.body?.data?.status_message ?? actor.user.user_metadata.status_message).trim();
    if (!displayName || displayName.length > 48 || status.length > 300) throw fail("Invalid profile information.");
    account.user_metadata = { ...account.user_metadata, display_name: displayName, status_message: status };
    saveAccount(account);
    session.user = accountUser(account);
    res.json({ user: session.user });
  });
  endpoint("post", "/api/auth/local-admin/avatar", (req, res, actor) => {
    if (!actor.local) throw fail("A local session is required.", 403);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(req.body?.dataUrl || ""));
    if (!match) throw fail("Please upload PNG, JPEG, or WEBP.");
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw fail("Avatar must be under 2MB.");
    const valid = match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : match[1] === "jpeg" ? bytes[0] === 255 && bytes[1] === 216
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid) throw fail("Invalid image file.");
    const avatarName = `avatar.${match[1]}`;
    fs.writeFileSync(path.join(stateDir, avatarName), bytes, { mode: 0o600 });
    const account = JSON.parse(fs.readFileSync(accountFile, "utf8"));
    account.user_metadata = { ...account.user_metadata, avatar_url: "/api/auth/local-admin/avatar", avatar_updated_at: String(Date.now()), avatar_path: avatarName };
    saveAccount(account);
    session.user = accountUser(account);
    res.json({ user: session.user });
  });
  endpoint("get", "/api/auth/local-admin/avatar", (req, res) => {
    if (!enabled()) throw fail("Avatar unavailable.", 404);
    const account = JSON.parse(fs.readFileSync(accountFile, "utf8"));
    const name = account.user_metadata?.avatar_path;
    if (!/^avatar\.(png|jpeg|webp)$/.test(name || "") || !fs.existsSync(path.join(stateDir, name))) throw fail("Avatar unavailable.", 404);
    res.set("Cache-Control", "no-store");
    res.type(name.split(".")[1]).send(fs.readFileSync(path.join(stateDir, name)));
  }, { auth: false });

  async function findRoom(code) {
    code = String(code || "").trim().toUpperCase();
    const local = enabled() && state.rooms.find(room => room.room_code === code);
    if (local) return { room: local, local: true };
    const { data, error } = await supabaseAdmin.from("rooms").select("*").eq("room_code", code).maybeSingle();
    if (error) throw error;
    if (!data) throw fail("Room not found.", 404);
    return { room: data, local: false };
  }
  async function listMembers(record) {
    const local = state.members.filter(member => member.room_id === record.room.id);
    if (record.local) return local;
    const { data, error } = await supabaseAdmin.from("room_members").select("*").eq("room_id", record.room.id).order("joined_at", { ascending: true });
    if (error) throw error;
    return [...(data || []), ...local];
  }
  async function joinRecord(record, actor) {
    const existing = (await listMembers(record)).find(member => member.user_id === actor.user.id);
    if (existing) return existing;
    const member = {
      id: crypto.randomUUID(), room_id: record.room.id, user_id: actor.user.id,
      member_role: actor.user.id === record.room.owner_id ? "owner" : "member", joined_at: new Date().toISOString(),
    };
    if (record.local || actor.local) {
      state.members.push(member); save();
    } else {
      const { error } = await supabaseAdmin.from("room_members").insert({ room_id: member.room_id, user_id: member.user_id, member_role: "member" });
      if (error) throw error;
    }
    return member;
  }
  function closeLiveRoom(code) {
    io.to(code).emit("room:closed", { roomCode: code });
    io.in(code).disconnectSockets(true);
    liveRooms.delete(code);
  }
  
  async function deleteRecord(record, actor) {
    if (record.room.owner_id !== actor.user.id) throw fail("Only the owner can delete this room.", 403);
    if (record.local) state.rooms = state.rooms.filter(room => room.id !== record.room.id);
    else {
      const { error } = await supabaseAdmin.from("rooms").delete().eq("id", record.room.id).eq("owner_id", actor.user.id);
      if (error) throw error;
    }
    state.members = state.members.filter(member => member.room_id !== record.room.id);
    save(); closeLiveRoom(record.room.room_code);
  }
  endpoint("get", "/api/player/rooms", async (req, res, actor) => {
    if (actor.local) return res.json({ rooms: state.rooms.filter(room => room.owner_id === LOCAL_USER_ID) });
    const { data, error } = await supabaseAdmin.from("rooms").select("*").eq("owner_id", actor.user.id).order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    res.json({ rooms: data || [] });
  });
  endpoint("post", "/api/player/rooms", async (req, res, actor) => {
    const maxMembers = Number(req.body?.maxMembers || 5);
    const roomName = String(req.body?.roomName || "Untitled Room").trim();
    if (![5,8,10].includes(maxMembers) || !roomName || roomName.length > 100) throw fail("Invalid room settings.");
    // Preserve the current MVP rule: one owned room per account.
    if (actor.local) {
      for (const old of [...state.rooms].filter(room => room.owner_id === actor.user.id)) await deleteRecord({ room: old, local: true }, actor);
    } else {
      const { data, error } = await supabaseAdmin.from("rooms").select("*").eq("owner_id", actor.user.id);
      if (error) throw error;
      for (const old of data || []) await deleteRecord({ room: old, local: false }, actor);
    }
    const roomPayload = {
      room_code: actor.local ? `L${crypto.randomBytes(3).toString("hex").toUpperCase()}` : crypto.randomBytes(3).toString("hex").toUpperCase(),
      room_name: roomName, owner_id: actor.user.id, max_members: maxMembers,
    };
    let record;
    if (actor.local) {
      const room = { ...roomPayload, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      state.rooms.push(room); save(); record = { room, local: true };
    } else {
      const { data, error } = await supabaseAdmin.from("rooms").insert(roomPayload).select("*").single();
      if (error) throw error;
      record = { room: data, local: false };
    }
    await joinRecord(record, actor);
    res.json({ room: record.room });
  }, { serialize: true });
  endpoint("get", "/api/player/rooms/:code", async (req, res) => {
    res.json({ room: (await findRoom(req.params.code)).room });
  });
  endpoint("post", "/api/player/rooms/:code/join", async (req, res, actor) => {
    const record = await findRoom(req.params.code);
    await joinRecord(record, actor);
    res.json({ room: record.room, members: await listMembers(record) });
  }, { serialize: true });
  endpoint("get", "/api/player/rooms/:code/members", async (req, res, actor) => {
    const record = await findRoom(req.params.code);
    const members = await listMembers(record);
    if (!members.some(member => member.user_id === actor.user.id)) throw fail("Join the room first.", 403);
    res.json({ members });
  });
  endpoint("delete", "/api/player/rooms/:code", async (req, res, actor) => {
    await deleteRecord(await findRoom(req.params.code), actor);
    res.json({ message: "Room deleted." });
  }, { serialize: true });

  io.use(async (socket, next) => {
    try {
      const credentials = socket.handshake.auth || {};
      const actor = await authenticate(credentials.localAdminToken ? `Local ${credentials.localAdminToken}` : `Bearer ${credentials.accessToken || ""}`);
      socket.data.actor = actor;
      if (actor.local) socket.data.localToken = actor.token;
      socket.use(async (packet, continuePacket) => {
        const event = packet[0];
        const payload = packet[1] && typeof packet[1] === "object" ? packet[1] : {};
        const ack = typeof packet.at(-1) === "function" ? packet.at(-1) : null;
        try {
          if (actor.local) socket.data.actor.user = activeSession(actor.token).user;
          const user = socket.data.actor.user;
          if (event === "room:join") {
            const record = await findRoom(payload.roomCode);
            if (!(await listMembers(record)).some(member => member.user_id === user.id)) throw fail("Join the room before connecting.", 403);
            if (socket.data.roomCode && socket.data.roomCode !== record.room.room_code) throw fail("Leave your current room first.");
            const count = new Set([...(liveRooms.get(record.room.room_code)?.users.values() || [])].map(member => member.userId));
            if (!count.has(user.id) && count.size >= record.room.max_members) throw fail("Room is full.", 409);
            payload.roomCode = record.room.room_code;
          } else if (event === "chat:send" || event.startsWith("voice:") || (event.startsWith("game:") && event !== "game:get-active-rooms")) {
            if (!socket.data.roomCode || (payload.roomCode && payload.roomCode !== socket.data.roomCode)) throw fail("Invalid room access.", 403);
            payload.roomCode = socket.data.roomCode;
            if (event === "voice:offer" || event === "voice:answer" || event === "voice:ice-candidate") {
              const target = io.sockets.sockets.get(payload.targetSocketId);
              if (!target || target.data.roomCode !== socket.data.roomCode || !socket.data.voiceChannel || target.data.voiceChannel !== socket.data.voiceChannel) throw fail("Invalid voice peer.", 403);
            }
          }
          if (event === "room:join" || event === "chat:send") {
            payload.userId = user.id; payload.email = user.email || "";
            payload.username = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
            payload.avatarUrl = user.user_metadata?.avatar_url || "";
            payload.initial = payload.username.charAt(0).toUpperCase();
            packet[1] = payload;
          }
          continuePacket();
        } catch (error) {
          if (ack) ack({ ok: false, error: error.message });
          if (error.status === 401) socket.disconnect(true);
        }
      });
      next();
    } catch (error) { next(new Error(error.message)); }
  });
  const cleanupTimer = setInterval(() => {
    if (session && (!enabled() || session.expiresAt <= Date.now())) endSession();
  }, 30000);
  cleanupTimer.unref();
  return { close: () => clearInterval(cleanupTimer) };
};