<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Vue state
   - Router navigation
   - Supabase auth
========================================================= */
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

/* =========================================================
   SECTION 2: Router / Form State
========================================================= */
const router = useRouter()

const email = ref("")
const password = ref("")
const showPassword = ref(false)

const loading = ref(false)
const resetLoading = ref(false)

const errorMessage = ref("")
const successMessage = ref("")

const demoEmail = import.meta.env.VITE_DEMO_EMAIL || "demo@voxyn.local"
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || "demo123456"

/* =========================================================
   SECTION 3: Computed
========================================================= */
const passwordInputType = computed(() => {
  return showPassword.value ? "text" : "password"
})

const canSubmit = computed(() => {
  return email.value.trim() && password.value.trim() && !loading.value
})

/* =========================================================
   SECTION 4: Navigation
========================================================= */
function goHome() {
  router.push("/")
}

function goSignup() {
  router.push("/signup")
}

/* =========================================================
   SECTION 5: Helpers
========================================================= */
function clearMessages() {
  errorMessage.value = ""
  successMessage.value = ""
}

function normalizeEmail() {
  return email.value.trim().toLowerCase()
}

/* =========================================================
   SECTION 6: Login
   Purpose:
   - Real Supabase email/password login
========================================================= */
async function signIn() {
  clearMessages()

  const cleanEmail = normalizeEmail()

  if (!cleanEmail || !password.value.trim()) {
    errorMessage.value = "Please enter both email and password."
    return
  }

  loading.value = true

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password.value.trim()
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

/* =========================================================
   SECTION 7: Forgot Password
   Purpose:
   - Send real Supabase password reset email
   - User must enter email first
========================================================= */
async function sendResetLink() {
  clearMessages()

  const cleanEmail = normalizeEmail()

  if (!cleanEmail) {
    errorMessage.value = "Enter your email first, then click Forgot password."
    return
  }

  resetLoading.value = true

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/update-password`
  })

  resetLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  successMessage.value = `Password reset link sent to ${cleanEmail}.`
}

/* =========================================================
   SECTION 8: Demo Login
   Purpose:
   - Try logging in with demo account
   - Demo account needs to exist in Supabase Auth
========================================================= */
async function demoLogin() {
  clearMessages()

  loading.value = true

  const { data, error } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword
  })

  loading.value = false

  if (error) {
    errorMessage.value =
      "Demo account is not ready yet. Create demo@voxyn.local in Supabase or set VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD."
    return
  }

  if (data.session) {
    router.push("/dashboard")
  }
}
</script>

<template>
  <main class="login-page">
    <!-- =========================================================
         SECTION 1: Background
    ========================================================== -->
    <div class="background-grid"></div>
    <div class="background-glow glow-one"></div>
    <div class="background-glow glow-two"></div>
    <div class="floating-shape shape-one"></div>
    <div class="floating-shape shape-two"></div>

    <!-- =========================================================
         SECTION 2: Brand Bar
    ========================================================== -->
    <header class="brand-bar">
      <button class="brand-button" @click="goHome">
        <span class="brand-mark">◆</span>
        <span class="brand-name">VOXYN</span>
      </button>

      <span class="version-pill">v0.6</span>
    </header>

    <!-- =========================================================
         SECTION 3: Main Auth Layout
    ========================================================== -->
    <section class="auth-shell">
      <!-- Left intro -->
      <aside class="auth-intro">
        <p class="eyebrow">SELF-HOSTED SOCIAL ROOM PLATFORM</p>

        <h1>
          Enter your
          <span>VOXYN</span>
          room
        </h1>

        <p class="intro-text">
          Start with a demo account, create a room, share a code,
          and continue building the full experience.
        </p>

        <div class="glass-orb">
          <span>◆</span>
        </div>
      </aside>

      <!-- Login card -->
      <section class="login-card">
        <div class="card-header">
          <div>
            <span class="card-icon">◆</span>
            <p class="card-kicker">LOGIN</p>
            <h2>Continue to VOXYN</h2>
          </div>

          <span class="mvp-badge">MVP</span>
        </div>

        <form class="auth-form" @submit.prevent="signIn">
          <div class="input-group">
            <label>Email address</label>
            <div class="input-shell">
              <span class="input-icon">✉</span>
              <input
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="input-group">
            <div class="label-row">
              <label>Password</label>

              <button
                type="button"
                class="forgot-link"
                :disabled="resetLoading"
                @click="sendResetLink"
              >
                {{ resetLoading ? "Sending..." : "Forgot password?" }}
              </button>
            </div>

            <div class="input-shell">
              <span class="input-icon">⌘</span>
              <input
                v-model="password"
                :type="passwordInputType"
                placeholder="Enter your password"
                autocomplete="current-password"
              />

              <button
                type="button"
                class="show-button"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "Hide" : "Show" }}
              </button>
            </div>

            <p class="field-hint">
              Reset password by email.
            </p>
          </div>

          <button
            class="primary-button"
            type="submit"
            :disabled="!canSubmit"
          >
            {{ loading ? "Logging in..." : "Log in" }}
          </button>

          <button
            class="secondary-button"
            type="button"
            @click="goSignup"
            :disabled="loading"
          >
            Create account
          </button>

          <div class="divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          <button
            class="demo-button"
            type="button"
            @click="demoLogin"
            :disabled="loading"
          >
            ▶ Demo login
          </button>
        </form>

        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" class="success-message">
          {{ successMessage }}
        </p>
      </section>
    </section>

    <!-- =========================================================
         SECTION 4: Footer
    ========================================================== -->
    <footer class="login-footer">
      <span>⌂</span>
      <p>Your data stays on your server. Secure. Private. Yours.</p>
    </footer>
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
  overflow: hidden;
  padding: 32px 34px 28px;

  color: #0f172a;
  background:
    radial-gradient(circle at 15% 15%, rgba(96, 165, 250, 0.2), transparent 28%),
    radial-gradient(circle at 88% 80%, rgba(99, 102, 241, 0.2), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #eef5ff 48%, #f6f8ff 100%);

  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

/* =========================================================
   SECTION 1: Background
========================================================= */
.background-grid {
  position: absolute;
  inset: 0;
  opacity: 0.62;
  background:
    linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black 0%, transparent 86%);
  pointer-events: none;
}

.background-glow,
.floating-shape {
  position: absolute;
  pointer-events: none;
}

.background-glow {
  border-radius: 999px;
  filter: blur(20px);
}

.glow-one {
  width: 460px;
  height: 460px;
  left: -160px;
  top: 15%;
  background: rgba(56, 189, 248, 0.16);
}

.glow-two {
  width: 520px;
  height: 520px;
  right: -220px;
  bottom: -180px;
  background: rgba(99, 102, 241, 0.18);
}

.floating-shape {
  border: 1px solid rgba(99, 102, 241, 0.16);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(99, 102, 241, 0.16));
  box-shadow: 0 24px 80px rgba(79, 70, 229, 0.16);
  backdrop-filter: blur(18px);
}

.shape-one {
  width: 150px;
  height: 150px;
  left: 8%;
  bottom: 18%;
  border-radius: 34px;
  transform: rotate(-38deg);
}

.shape-two {
  width: 72px;
  height: 72px;
  right: 17%;
  bottom: 11%;
  border-radius: 50%;
}

/* =========================================================
   SECTION 2: Brand Bar
========================================================= */
.brand-bar {
  position: relative;
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  max-width: 1240px;
  margin: 0 auto;
}

.brand-button {
  border: 0;
  background: transparent;
  padding: 0;

  display: inline-flex;
  align-items: center;
  gap: 14px;

  cursor: pointer;
}

.brand-mark,
.card-icon {
  width: 42px;
  height: 42px;

  display: grid;
  place-items: center;

  border-radius: 14px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 14px 32px rgba(79, 70, 229, 0.24);

  font-size: 14px;
  font-weight: 950;
}

.brand-name {
  color: #0f172a;
  letter-spacing: 0.34em;
  font-size: 22px;
  font-weight: 950;
}

.version-pill {
  padding: 8px 13px;
  border-radius: 999px;
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.16);
  font-size: 13px;
  font-weight: 900;
}

/* =========================================================
   SECTION 3: Main Layout
========================================================= */
.auth-shell {
  position: relative;
  z-index: 1;

  width: min(1180px, 100%);
  min-height: calc(100vh - 150px);

  margin: 34px auto 0;
  padding: 54px;

  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(360px, 460px);
  align-items: center;
  gap: 52px;

  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(22px);
}

.auth-intro {
  position: relative;
  min-height: 520px;

  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow,
.card-kicker {
  margin: 0 0 16px;
  color: #4f46e5;
  letter-spacing: 0.34em;
  font-size: 12px;
  font-weight: 950;
}

.auth-intro h1 {
  max-width: 520px;
  margin: 0;
  color: #0f172a;
  font-size: clamp(48px, 6vw, 76px);
  line-height: 0.98;
  letter-spacing: -0.065em;
  font-weight: 950;
}

.auth-intro h1 span {
  display: inline-block;
  color: transparent;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  background-clip: text;
  -webkit-background-clip: text;
}

.intro-text {
  max-width: 430px;
  margin: 24px 0 0;
  color: #64748b;
  font-size: 17px;
  line-height: 1.65;
  font-weight: 700;
}

.glass-orb {
  width: 142px;
  height: 142px;

  margin: 72px 0 0 80px;

  display: grid;
  place-items: center;

  border-radius: 36px;
  color: white;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.78), rgba(99, 102, 241, 0.42));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 34px 90px rgba(79, 70, 229, 0.22);
  transform: rotate(-38deg);
}

.glass-orb span {
  transform: rotate(38deg);
  font-size: 34px;
}

/* =========================================================
   SECTION 4: Login Card
========================================================= */
.login-card {
  width: 100%;
  padding: 34px;

  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow:
    0 28px 80px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(20px);
}

.card-header {
  margin-bottom: 24px;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.card-header h2 {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 28px;
  letter-spacing: -0.04em;
  font-weight: 950;
}

.card-kicker {
  margin-top: 18px;
  margin-bottom: 0;
  font-size: 11px;
}

.mvp-badge {
  padding: 8px 13px;
  border-radius: 999px;
  color: #16a34a;
  background: rgba(34, 197, 94, 0.12);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
}

.auth-form {
  display: grid;
  gap: 17px;
}

.input-group {
  display: grid;
  gap: 8px;
}

.input-group label {
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.forgot-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #4f46e5;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.forgot-link:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.input-shell {
  min-height: 54px;
  padding: 0 15px;

  display: flex;
  align-items: center;
  gap: 11px;

  border: 1px solid rgba(100, 116, 139, 0.24);
  border-radius: 15px;
  background: rgba(248, 250, 252, 0.92);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.input-shell:focus-within {
  border-color: rgba(79, 70, 229, 0.54);
  background: white;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.input-icon {
  color: #64748b;
  font-size: 14px;
}

.input-shell input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 15px;
  font-weight: 750;
}

.input-shell input::placeholder {
  color: #94a3b8;
  font-weight: 650;
}

.show-button {
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.field-hint {
  margin: -2px 0 0;
  color: #94a3b8;
  text-align: right;
  font-size: 12px;
  font-weight: 750;
}

.primary-button,
.secondary-button,
.demo-button {
  width: 100%;
  min-height: 56px;

  border-radius: 16px;
  cursor: pointer;

  font-size: 15px;
  font-weight: 950;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;
}

.primary-button {
  margin-top: 4px;
  border: 0;
  color: white;
  background: linear-gradient(135deg, #2563eb, #6d5dfc);
  box-shadow: 0 18px 36px rgba(79, 70, 229, 0.24);
}

.secondary-button,
.demo-button {
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.82);
}

.primary-button:hover,
.secondary-button:hover,
.demo-button:hover {
  transform: translateY(-2px);
}

.primary-button:disabled,
.secondary-button:disabled,
.demo-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 850;
}

.divider span {
  height: 1px;
  flex: 1;
  background: rgba(148, 163, 184, 0.24);
}

.divider p {
  margin: 0;
}

.error-message,
.success-message {
  margin: 18px 0 0;
  padding: 13px 14px;
  border-radius: 15px;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 850;
}

.error-message {
  color: #b91c1c;
  background: rgba(254, 226, 226, 0.72);
  border: 1px solid rgba(248, 113, 113, 0.24);
}

.success-message {
  color: #15803d;
  background: rgba(220, 252, 231, 0.74);
  border: 1px solid rgba(34, 197, 94, 0.22);
}

/* =========================================================
   SECTION 5: Footer
========================================================= */
.login-footer {
  position: relative;
  z-index: 1;

  margin: 22px auto 0;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.login-footer p {
  margin: 0;
}

/* =========================================================
   SECTION 6: Responsive
========================================================= */
@media (max-width: 980px) {
  .login-page {
    padding: 24px 18px 28px;
  }

  .auth-shell {
    min-height: auto;
    padding: 28px;
    grid-template-columns: 1fr;
  }

  .auth-intro {
    min-height: auto;
  }

  .glass-orb {
    display: none;
  }

  .login-card {
    max-width: 520px;
    margin: 0 auto;
  }
}

@media (max-width: 560px) {
  .brand-name {
    font-size: 17px;
  }

  .auth-shell {
    padding: 18px;
    border-radius: 24px;
  }

  .login-card {
    padding: 24px;
    border-radius: 24px;
  }

  .auth-intro h1 {
    font-size: 44px;
  }

  .card-header {
    flex-direction: column;
  }
}
</style>