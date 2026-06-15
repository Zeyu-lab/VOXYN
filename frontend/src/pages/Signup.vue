<script setup>
/* =========================================================
   SECTION 1: Imports
========================================================= */
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

/* =========================================================
   SECTION 2: Router / Form State
========================================================= */
const router = useRouter()

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const verificationCode = ref("")

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const loading = ref(false)
const betaLoading = ref(false)
const resendLoading = ref(false)
const verifyLoading = ref(false)

const errorMessage = ref("")
const successMessage = ref("")
const signupStep = ref("form")

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

/* =========================================================
   SECTION 3: Computed
========================================================= */
const passwordInputType = computed(() => {
  return showPassword.value ? "text" : "password"
})

const confirmPasswordInputType = computed(() => {
  return showConfirmPassword.value ? "text" : "password"
})

const cleanEmail = computed(() => {
  return email.value.trim().toLowerCase()
})

const defaultDisplayName = computed(() => {
  const baseName = cleanEmail.value.split("@")[0] || "voxyn-user"

  if (baseName.length < 2) {
    return "voxyn-user"
  }

  return baseName.slice(0, 24)
})

/* =========================================================
   SECTION 4: Navigation
========================================================= */
function goLogin() {
  router.push("/login")
}

function goHome() {
  router.push("/")
}

/* =========================================================
   SECTION 5: Helpers
========================================================= */
function clearMessages() {
  errorMessage.value = ""
  successMessage.value = ""
}

function validateSignupForm() {
  if (!cleanEmail.value) {
    errorMessage.value = "Email address is required."
    return false
  }

  if (!password.value.trim()) {
    errorMessage.value = "Password is required."
    return false
  }

  if (password.value.length < 6) {
    errorMessage.value = "Password must be at least 6 characters."
    return false
  }

  if (!confirmPassword.value.trim()) {
    errorMessage.value = "Please enter the password again."
    return false
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return false
  }

  return true
}

async function readApiMessage(response) {
  try {
    const data = await response.json()
    return data.message || "Request failed."
  } catch {
    return "Request failed."
  }
}

/* =========================================================
   SECTION 6: Request Signup Code
   Purpose:
   - Validate email/password locally
   - Ask Express backend to send a 6-digit code
   - Backend checks existing account and sends SMTP email
========================================================= */
async function createAccount() {
  clearMessages()

  if (!validateSignupForm()) return

  loading.value = true

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup/request-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail.value,
        username: defaultDisplayName.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.message || "Failed to send verification code.")
    }

    signupStep.value = "verify"

    if (data.deliveryMode === "dev_fallback" && data.devCode) {
        successMessage.value = `SMTP failed, but dev code is ready: ${data.devCode}`
    } else {
        successMessage.value = `Verification code sent to ${cleanEmail.value}.`
    }
        errorMessage.value = error.message || "Failed to send verification code."
  } finally {
    loading.value = false
  }
}

/* =========================================================
   SECTION 6.5: Beta Access Signup
   Purpose:
   - Temporary fallback for approved testers
   - Does not send email OTP
   - Backend checks Supabase beta_invites table
   - Backend creates confirmed Supabase Auth account
========================================================= */
async function createBetaAccount() {
  clearMessages()

  if (!validateSignupForm()) return

  betaLoading.value = true

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup/beta-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail.value,
        password: password.value,
        username: defaultDisplayName.value
      })
    })

    if (!response.ok) {
      const message = await readApiMessage(response)
      throw new Error(message)
    }

    successMessage.value = "Beta account created successfully. Redirecting to login..."

    setTimeout(() => {
      goLogin()
    }, 900)
  } catch (error) {
    errorMessage.value = error.message || "Beta access signup failed."
  } finally {
    betaLoading.value = false
  }
}

/* =========================================================
   SECTION 7: Verify Signup Code
   Purpose:
   - Send email/password/code to Express backend
   - Backend verifies OTP and creates Supabase user
========================================================= */
async function verifySignupCode() {
  clearMessages()

  const code = verificationCode.value.trim()

  if (!/^\d{6}$/.test(code)) {
    errorMessage.value = "Please enter the 6-digit verification code."
    return
  }

  verifyLoading.value = true

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail.value,
        password: password.value,
        code
      })
    })

    if (!response.ok) {
      const message = await readApiMessage(response)
      throw new Error(message)
    }

    successMessage.value = "Account created successfully. Redirecting to login..."

    setTimeout(() => {
      goLogin()
    }, 900)
  } catch (error) {
    errorMessage.value = error.message || "Failed to verify code."
  } finally {
    verifyLoading.value = false
  }
}

/* =========================================================
   SECTION 8: Resend Signup Code
========================================================= */
async function resendVerificationCode() {
  clearMessages()

  if (!cleanEmail.value) {
    errorMessage.value = "Email address is missing."
    return
  }

  resendLoading.value = true

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup/request-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail.value,
        username: defaultDisplayName.value
      })
    })

    if (!response.ok) {
      const message = await readApiMessage(response)
      throw new Error(message)
    }

    successMessage.value = `Verification code resent to ${cleanEmail.value}.`
  } catch (error) {
    errorMessage.value = error.message || "Failed to resend verification code."
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <!-- =========================================================
         SECTION 1: Background
    ========================================================== -->
    <div class="background-grid"></div>
    <div class="background-glow glow-one"></div>
    <div class="background-glow glow-two"></div>

    <!-- =========================================================
         SECTION 2: Brand Bar
    ========================================================== -->
    <header class="brand-bar">
      <button class="brand-button" @click="goHome">
        <span class="brand-mark">◆</span>
        <span class="brand-name">VOXYN</span>
      </button>

      <button class="login-link" @click="goLogin">
        Already have an account? <span>Log in</span>
      </button>
    </header>

    <!-- =========================================================
         SECTION 3: Signup Shell
    ========================================================== -->
    <section class="signup-shell">
      <section class="signup-card">
        <div class="card-header">
          <span class="card-icon">◆</span>
          <span class="mvp-badge">MVP</span>
        </div>

        <template v-if="signupStep === 'form'">
          <p class="card-kicker">CREATE ACCOUNT</p>
          <h1>Create your account</h1>
          <p class="card-description">
            Your email address will be used as your username to log in.
          </p>

          <form class="auth-form" @submit.prevent="createAccount">
            <div class="input-group">
              <label>Email address username</label>
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
              <label>Password</label>
              <div class="input-shell">
                <span class="input-icon">⌘</span>
                <input
                  v-model="password"
                  :type="passwordInputType"
                  placeholder="Enter your password"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="show-button"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? "Hide" : "Show" }}
                </button>
              </div>
            </div>

            <div class="input-group">
              <label>Enter password again</label>
              <div class="input-shell">
                <span class="input-icon">⌘</span>
                <input
                  v-model="confirmPassword"
                  :type="confirmPasswordInputType"
                  placeholder="Confirm your password"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="show-button"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  {{ showConfirmPassword ? "Hide" : "Show" }}
                </button>
              </div>
            </div>

            <button
                class="primary-button"
                type="submit"
                :disabled="loading || betaLoading"
            >
                {{ loading ? "Sending verification code..." : "Create account" }}
            </button>

                <div class="beta-divider">
                    <span></span>
                    <p>For approved testers</p>
                    <span></span>
                </div>

            <button
                class="beta-access-button"
                type="button"
                @click="createBetaAccount"
                :disabled="loading || betaLoading"
            >
                {{ betaLoading ? "Checking beta access..." : "Beta access without email code" }}
            </button>

                <p class="beta-note">
                    Use normal signup for email verification. Use beta access only if your email is approved in Supabase.
                </p>

            <button
                class="secondary-button"
                type="button"
                @click="goLogin"
                :disabled="loading || betaLoading"
            >
                Back to login
            </button>
          </form>
        </template>

        <template v-else>
            <div class="verify-panel">
                <div class="verify-icon">✉</div>

                <p class="card-kicker">VERIFY ACCOUNT</p>
                <h1>Check your email</h1>

                <p class="card-description">
                We sent a 6-digit verification code to
                <strong>{{ cleanEmail }}</strong>.
                Enter the code below to finish creating your VOXYN account.
                </p>

                <form class="auth-form" @submit.prevent="verifySignupCode">
                <div class="input-group">
                    <label>Verification code</label>
                    <div class="input-shell">
                    <span class="input-icon">#</span>
                    <input
                        v-model="verificationCode"
                        type="text"
                        maxlength="6"
                        inputmode="numeric"
                        placeholder="Enter 6-digit code"
                        autocomplete="one-time-code"
                    />
                    </div>
                </div>

                <button
                    class="primary-button"
                    type="submit"
                    :disabled="verifyLoading"
                >
                    {{ verifyLoading ? "Verifying..." : "Verify and create account" }}
                </button>

                <button
                    class="secondary-button"
                    type="button"
                    @click="resendVerificationCode"
                    :disabled="resendLoading || verifyLoading"
                >
                    {{ resendLoading ? "Sending..." : "Resend code" }}
                </button>

                <button
                    class="text-button"
                    type="button"
                    @click="signupStep = 'form'"
                    :disabled="verifyLoading"
                >
                    Back to edit email
                </button>
                </form>

                <p class="verify-hint">
                The code expires in 5 minutes. Check your spam folder if you do not see it.
                </p>
            </div>
        </template>

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
    <footer class="auth-footer">
      <span>⌂</span>
      <p>Your data stays on your server. Secure. Private. Yours.</p>
    </footer>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.signup-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: 32px 34px 28px;

  color: #0f172a;
  background:
    radial-gradient(circle at 18% 12%, rgba(96, 165, 250, 0.22), transparent 28%),
    radial-gradient(circle at 86% 82%, rgba(99, 102, 241, 0.2), transparent 28%),
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

.background-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(22px);
  pointer-events: none;
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

/* =========================================================
   SECTION 2: Brand Bar
========================================================= */
.brand-bar {
  position: relative;
  z-index: 2;

  max-width: 1120px;
  margin: 0 auto;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand-button,
.login-link {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.brand-button {
  padding: 0;

  display: inline-flex;
  align-items: center;
  gap: 14px;
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

.login-link {
  color: #64748b;
  font-size: 14px;
  font-weight: 850;
}

.login-link span {
  color: #4f46e5;
}

/* =========================================================
   SECTION 3: Signup Shell
========================================================= */
.signup-shell {
  position: relative;
  z-index: 1;

  width: min(840px, 100%);
  min-height: calc(100vh - 160px);

  margin: 34px auto 0;
  padding: 48px;

  display: grid;
  place-items: center;

  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(22px);
}

.signup-card {
  width: min(480px, 100%);
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
  margin-bottom: 22px;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.card-kicker {
  margin: 0 0 12px;
  color: #4f46e5;
  letter-spacing: 0.3em;
  font-size: 11px;
  font-weight: 950;
}

.signup-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
  letter-spacing: -0.05em;
  font-weight: 950;
}

.card-description {
  margin: 12px 0 24px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.55;
  font-weight: 750;
}

.card-description strong {
  color: #4f46e5;
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

.primary-button,
.secondary-button {
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

.secondary-button {
  margin-top: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.82);
}

.beta-divider {
  margin: 4px 0 -2px;

  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}

.beta-divider span {
  height: 1px;
  background: rgba(148, 163, 184, 0.26);
}

.beta-divider p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.beta-access-button {
  width: 100%;
  min-height: 56px;

  border: 1px solid rgba(79, 70, 229, 0.42);
  border-radius: 16px;

  color: #4f46e5;
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.04)),
    rgba(255, 255, 255, 0.86);

  cursor: pointer;
  font-size: 15px;
  font-weight: 950;

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

.beta-access-button:hover {
  transform: translateY(-2px);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(79, 70, 229, 0.07)),
    rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.12);
}

.beta-access-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.beta-note {
  margin: -4px 0 0;
  padding: 12px 13px;

  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 14px;

  color: #64748b;
  background: rgba(99, 102, 241, 0.06);

  font-size: 12px;
  line-height: 1.45;
  font-weight: 750;
}

.primary-button:hover,
.secondary-button:hover {
  transform: translateY(-2px);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.verify-panel {
  text-align: center;
}

.verify-icon {
  width: 64px;
  height: 64px;

  margin: 0 auto 22px;

  display: grid;
  place-items: center;

  border-radius: 22px;
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.1);
  font-size: 28px;
}

.verify-hint {
  margin: 14px 0 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 750;
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

.text-button {
  margin-top: 14px;
  border: 0;
  background: transparent;
  color: #4f46e5;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
}

.text-button:hover {
  text-decoration: underline;
}

/* =========================================================
   SECTION 4: Footer
========================================================= */
.auth-footer {
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

.auth-footer p {
  margin: 0;
}

/* =========================================================
   SECTION 5: Responsive
========================================================= */
@media (max-width: 640px) {
  .signup-page {
    padding: 24px 18px 28px;
  }

  .brand-name {
    font-size: 17px;
  }

  .brand-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .signup-shell {
    min-height: auto;
    padding: 18px;
    border-radius: 24px;
  }

  .signup-card {
    padding: 24px;
    border-radius: 24px;
  }
}
</style>