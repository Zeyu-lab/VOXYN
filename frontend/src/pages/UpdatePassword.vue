<script setup>
/* =========================================================
   SECTION 1: Imports
========================================================= */
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

/* =========================================================
   SECTION 2: Router / Form State
========================================================= */
const router = useRouter()

const newPassword = ref("")
const confirmPassword = ref("")

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const loading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

/* =========================================================
   SECTION 3: Computed
========================================================= */
const passwordInputType = computed(() => {
  return showPassword.value ? "text" : "password"
})

const confirmPasswordInputType = computed(() => {
  return showConfirmPassword.value ? "text" : "password"
})

/* =========================================================
   SECTION 4: Navigation
========================================================= */
function goLogin() {
  router.push("/login")
}

/* =========================================================
   SECTION 5: Helpers
========================================================= */
function clearMessages() {
  errorMessage.value = ""
  successMessage.value = ""
}

function validatePasswordForm() {
  if (!newPassword.value.trim()) {
    errorMessage.value = "New password is required."
    return false
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = "Password must be at least 6 characters."
    return false
  }

  if (!confirmPassword.value.trim()) {
    errorMessage.value = "Please enter the password again."
    return false
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return false
  }

  return true
}

/* =========================================================
   SECTION 6: Update Password
   Purpose:
   - Supabase password recovery link opens this page
   - User sets new password
========================================================= */
async function updatePassword() {
  clearMessages()

  if (!validatePasswordForm()) return

  loading.value = true

  const { error } = await supabase.auth.updateUser({
    password: newPassword.value
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  successMessage.value = "Password updated successfully. You can now log in."

  setTimeout(() => {
    router.push("/login")
  }, 1200)
}
</script>

<template>
  <main class="update-page">
    <!-- =========================================================
         SECTION 1: Background
    ========================================================== -->
    <div class="background-grid"></div>
    <div class="background-glow glow-one"></div>
    <div class="background-glow glow-two"></div>

    <!-- =========================================================
         SECTION 2: Password Card
    ========================================================== -->
    <section class="password-card">
      <div class="card-icon">⌘</div>

      <p class="card-kicker">RESET PASSWORD</p>
      <h1>Create a new password</h1>

      <p class="card-description">
        Enter your new VOXYN password below. After updating it,
        you can return to the login page.
      </p>

      <form class="auth-form" @submit.prevent="updatePassword">
        <div class="input-group">
          <label>New password</label>
          <div class="input-shell">
            <span class="input-icon">⌘</span>
            <input
              v-model="newPassword"
              :type="passwordInputType"
              placeholder="Enter new password"
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
              placeholder="Confirm new password"
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

        <button class="primary-button" type="submit" :disabled="loading">
          {{ loading ? "Updating..." : "Update password" }}
        </button>

        <button class="secondary-button" type="button" @click="goLogin">
          Back to login
        </button>
      </form>

      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>

      <p v-if="successMessage" class="success-message">
        {{ successMessage }}
      </p>
    </section>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.update-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: 32px 22px;

  display: grid;
  place-items: center;

  color: #0f172a;
  background:
    radial-gradient(circle at 18% 12%, rgba(96, 165, 250, 0.22), transparent 28%),
    radial-gradient(circle at 86% 82%, rgba(99, 102, 241, 0.2), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #eef5ff 48%, #f6f8ff 100%);

  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

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

.password-card {
  position: relative;
  z-index: 1;

  width: min(470px, 100%);
  padding: 34px;

  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow:
    0 28px 80px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(20px);
}

.card-icon {
  width: 54px;
  height: 54px;

  margin-bottom: 22px;

  display: grid;
  place-items: center;

  border-radius: 18px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 14px 32px rgba(79, 70, 229, 0.24);

  font-size: 20px;
  font-weight: 950;
}

.card-kicker {
  margin: 0 0 12px;
  color: #4f46e5;
  letter-spacing: 0.3em;
  font-size: 11px;
  font-weight: 950;
}

.password-card h1 {
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
}

.primary-button {
  margin-top: 4px;
  border: 0;
  color: white;
  background: linear-gradient(135deg, #2563eb, #6d5dfc);
  box-shadow: 0 18px 36px rgba(79, 70, 229, 0.24);
}

.secondary-button {
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.82);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
</style>