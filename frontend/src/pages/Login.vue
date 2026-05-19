<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

const router = useRouter()

const email = ref("")
const password = ref("")
const loading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

function goHome() {
  router.push("/")
}

async function signIn() {
  errorMessage.value = ""
  successMessage.value = ""

  if (!email.value.trim() || !password.value.trim()) {
    errorMessage.value = "Please enter both email and password."
    return
  }

  loading.value = true

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value.trim(),
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  if (data.session) {
    router.push("/dashboard")
  }
}

async function signUp() {
  errorMessage.value = ""
  successMessage.value = ""

  if (!email.value.trim() || !password.value.trim()) {
    errorMessage.value = "Please enter both email and password."
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = "Password must be at least 6 characters."
    return
  }

  loading.value = true

  const { data, error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value.trim(),
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  successMessage.value = "Account created successfully."

  if (data.session) {
    router.push("/dashboard")
  }
}

async function demoLogin() {
  email.value = "demo@voxyn.local"
  password.value = "demo123456"
  errorMessage.value = "Demo account needs to be created in Supabase first."
}
</script>

<template>
  <main class="login-page">
    <!-- =========================================================
      SECTION 01: BACKGROUND / 背景层
    ========================================================== -->
    <div class="background-glow glow-one"></div>
    <div class="background-glow glow-two"></div>
    <div class="background-grid"></div>

    <!-- =========================================================
      SECTION 02: LOGO / 顶部品牌
    ========================================================== -->
    <section class="login-brand" @click="goHome">
      <div class="brand-mark">V</div>
      <span>VOXYN</span>
    </section>

    <!-- =========================================================
      SECTION 03: LOGIN TITLE / 登录标题
    ========================================================== -->
    <section class="login-heading">
      <p>SELF-HOSTED SOCIAL ROOM PLATFORM</p>
      <h1>Enter your VOXYN room</h1>
      <h2>
        Start with a demo account, create a room, share a code,
        and continue building the full experience.
      </h2>
    </section>

    <!-- =========================================================
      SECTION 04: LOGIN CARD / 登录卡片
    ========================================================== -->
    <section class="login-card">
      <div class="card-top">
        <div>
          <span class="card-label">LOGIN</span>
          <h3>Continue to VOXYN</h3>
        </div>

        <div class="mvp-badge">MVP</div>
      </div>

      <div class="input-group">
        <label>Email address</label>
        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          @keyup.enter="continueWithEmail"
        />
      </div>
      
      <div class="input-group">
        <label>Password</label>
        <input
          v-model="password"
          type="password"
          placeholder="Enter your password"
          @keyup.enter="signIn"
        />
      </div>

      <button class="main-login-button" @click="signIn" :disabled="loading">
        {{ loading ? "Loading..." : "Log in" }}
      </button>

      <button class="demo-button" @click="signUp" :disabled="loading">
        Create account
      </button>

      <div class="divider">
        <span></span>
        <p>or</p>
        <span></span>
      </div>

      <div class="social-row">
        <button class="glass-button" @click="socialLogin('Apple')">
          <span></span>
        </button>

        <button class="glass-button" @click="socialLogin('Google')">
          <span>G</span>
        </button>

        <button class="glass-button" @click="socialLogin('GitHub')">
          <span>GH</span>
        </button>
      </div>

      <button class="demo-button" @click="startDemoLogin">
        ⚡ Start with demo login
      </button>

      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>

      <p class="login-note">
        Real accounts, voice rooms, and payments will be added later.
        This page currently supports demo login for the MVP.
      </p>
    </section>

    <!-- =========================================================
      SECTION 05: FOOTER / 底部文字
    ========================================================== -->
    <section class="login-footer">
      <button @click="goHome">Back to home</button>
      <p>
        By continuing, you are entering a student-built full-stack portfolio project.
      </p>
    </section>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  padding: 52px 24px 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -10%, rgba(10, 132, 255, 0.22), transparent 36%),
    radial-gradient(circle at 15% 20%, rgba(34, 197, 94, 0.12), transparent 30%),
    linear-gradient(135deg, #03080b 0%, #071013 46%, #020405 100%);
  color: #ffffff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

/* =========================================================
  SECTION 01: BACKGROUND / 背景层
========================================================= */
.background-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(20px);
  pointer-events: none;
}

.glow-one {
  width: 420px;
  height: 420px;
  top: -170px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 119, 255, 0.22);
}

.glow-two {
  width: 520px;
  height: 520px;
  right: -260px;
  bottom: -250px;
  background: rgba(34, 197, 94, 0.12);
}

.background-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, black, transparent 80%);
  pointer-events: none;
}

/* =========================================================
  SECTION 02: LOGO / 顶部品牌
========================================================= */
.login-brand {
  position: relative;
  z-index: 2;
  width: fit-content;
  margin: 0 auto 42px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  user-select: none;
}

.brand-mark {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 24px 60px rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-size: 30px;
  font-weight: 950;
  backdrop-filter: blur(22px);
}

.login-brand span {
  color: #ffffff;
  font-size: 34px;
  font-weight: 950;
  letter-spacing: 6px;
}

/* =========================================================
  SECTION 03: LOGIN TITLE / 登录标题
========================================================= */
.login-heading {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 0 auto 34px;
  text-align: center;
}

.login-heading p {
  margin: 0 0 16px;
  color: #93c5fd;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
}

.login-heading h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(42px, 5vw, 64px);
  line-height: 1.02;
  letter-spacing: -2.5px;
  font-weight: 850;
}

.login-heading h2 {
  max-width: 620px;
  margin: 18px auto 0;
  color: #cbd5e1;
  font-size: 18px;
  line-height: 1.6;
  font-weight: 500;
}

/* =========================================================
  SECTION 04: LOGIN CARD / 登录卡片
========================================================= */
.login-card {
  position: relative;
  z-index: 2;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 34px;
  border-radius: 34px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(245, 248, 252, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    0 38px 120px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  color: #0f172a;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 28px;
}

.card-label {
  display: block;
  margin-bottom: 10px;
  color: #0b6fc9;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 1.8px;
}

.card-top h3 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -1px;
}

.mvp-badge {
  padding: 9px 13px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.13);
  color: #16a34a;
  font-size: 12px;
  font-weight: 950;
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  margin-bottom: 9px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
}

.input-group input {
  width: 100%;
  height: 68px;
  padding: 0 22px;
  border-radius: 20px;
  border: 2px solid #111827;
  background: rgba(255, 255, 255, 0.82);
  color: #0f172a;
  font-size: 17px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-group input:focus {
  border-color: #0b6fc9;
  box-shadow: 0 0 0 5px rgba(11, 111, 201, 0.14);
}

.main-login-button {
  width: 100%;
  height: 68px;
  border: none;
  border-radius: 20px;
  background: #03080b;
  color: #ffffff;
  font-size: 18px;
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(3, 8, 11, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.main-login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 52px rgba(3, 8, 11, 0.36);
}

.divider {
  margin: 28px 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
}

.divider span {
  height: 1px;
  background: #cbd5e1;
}

.divider p {
  margin: 0;
  color: #64748b;
  font-size: 16px;
  font-weight: 700;
}

.social-row {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-bottom: 18px;
}

.glass-button {
  width: 76px;
  height: 64px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.48);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(226, 232, 240, 0.5));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 16px 36px rgba(15, 23, 42, 0.12);
  color: #0f172a;
  cursor: pointer;
  backdrop-filter: blur(18px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.glass-button:hover {
  transform: translateY(-3px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 22px 46px rgba(15, 23, 42, 0.18);
}

.glass-button span {
  font-size: 20px;
  font-weight: 950;
}

.demo-button {
  width: 100%;
  height: 64px;
  margin-top: 8px;
  border: 1px solid rgba(34, 197, 94, 0.36);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(34, 197, 94, 0.92), rgba(14, 165, 233, 0.78));
  color: #ffffff;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    0 20px 48px rgba(34, 197, 94, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.demo-button:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 26px 58px rgba(34, 197, 94, 0.32);
}

.error-message {
  margin: 18px 0 0;
  color: #dc2626;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.login-note {
  margin: 22px auto 0;
  max-width: 520px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.55;
  text-align: center;
}

/* =========================================================
  SECTION 05: FOOTER / 底部文字
========================================================= */
.login-footer {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 34px auto 0;
  text-align: center;
}

.login-footer button {
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 13px 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 15px;
  font-weight: 750;
  cursor: pointer;
  backdrop-filter: blur(16px);
}

.login-footer p {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
}

/* =========================================================
  RESPONSIVE / 响应式
========================================================= */
@media (max-width: 720px) {
  .login-page {
    padding: 36px 18px 28px;
  }

  .login-brand {
    margin-bottom: 34px;
  }

  .brand-mark {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    font-size: 26px;
  }

  .login-brand span {
    font-size: 28px;
    letter-spacing: 4px;
  }

  .login-card {
    padding: 26px;
    border-radius: 28px;
  }

  .card-top {
    flex-direction: column;
  }

  .card-top h3 {
    font-size: 26px;
  }

  .social-row {
    gap: 10px;
  }

  .glass-button {
    flex: 1;
  }
}
</style>