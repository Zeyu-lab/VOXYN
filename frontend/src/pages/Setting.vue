<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load Vue tools
   - Load router
   - Load Supabase auth
   - Load VoicePanel component
========================================================= */
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"
import VoicePanel from "../components/VoicePanel.vue"

/* =========================================================
   SECTION 2: Router / Page State
========================================================= */
const router = useRouter()

const loading = ref(true)
const errorMessage = ref("")
const user = ref(null)

const activeSection = ref("voice")

const settingSections = [
  {
    id: "account",
    label: "Account",
    icon: "◎"
  },
  {
    id: "profile",
    label: "Profile",
    icon: "▣"
  },
  {
    id: "voice",
    label: "Voice & Audio",
    icon: "≋"
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: "◇"
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "◌"
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: "◐"
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "⚙"
  }
]

/* =========================================================
   SECTION 3: Computed
========================================================= */
const displayName = computed(() => {
  if (!user.value) return "User"

  return (
    user.value.user_metadata?.display_name ||
    user.value.email?.split("@")[0] ||
    "User"
  )
})

const userInitial = computed(() => {
  return displayName.value.charAt(0).toUpperCase()
})

const activeSectionTitle = computed(() => {
  const currentSection = settingSections.find((section) => {
    return section.id === activeSection.value
  })

  return currentSection?.label || "Settings"
})

/* =========================================================
   SECTION 4: Page Init
   Purpose:
   - Protect settings page
   - Redirect if user is not logged in
========================================================= */
onMounted(async () => {
  await loadSettingsPage()
})

async function loadSettingsPage() {
  loading.value = true
  errorMessage.value = ""

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error("Settings session error:", error.message)
    errorMessage.value = error.message
    loading.value = false
    return
  }

  if (!data.session) {
    loading.value = false
    router.push("/login")
    return
  }

  user.value = data.session.user
  loading.value = false
}

/* =========================================================
   SECTION 5: Navigation
========================================================= */
function backToDashboard() {
  router.push("/dashboard")
}

function closeSettings() {
  router.back()
}
</script>

<template>
  <main class="settings-page">
    <!-- =====================================================
         SECTION 1: Settings Sidebar
    ====================================================== -->
    <aside class="settings-sidebar">
      <button class="user-card" @click="router.push('/profile')">
        <span class="user-avatar">
          {{ userInitial }}
        </span>

        <span class="user-info">
          <strong>{{ displayName }}</strong>
          <small>{{ user?.email || "Connected" }}</small>
        </span>
      </button>

      <div class="settings-search">
        <span>⌕</span>
        <input type="text" placeholder="Search settings" />
      </div>

      <nav class="settings-nav">
        <button
          v-for="section in settingSections"
          :key="section.id"
          :class="{ active: activeSection === section.id }"
          @click="activeSection = section.id"
        >
          <span class="nav-icon">{{ section.icon }}</span>
          <span>{{ section.label }}</span>
        </button>
      </nav>

      <div class="settings-sidebar-footer">
        <button @click="backToDashboard">
          ← Back to Dashboard
        </button>
      </div>
    </aside>

    <!-- =====================================================
         SECTION 2: Settings Content
    ====================================================== -->
    <section class="settings-content">
      <button class="close-btn" @click="closeSettings">
        ×
      </button>

      <section v-if="loading" class="loading-card">
        Loading settings...
      </section>

      <section v-else class="content-shell">
        <header class="settings-header">
          <p class="eyebrow">SETTINGS</p>
          <h1>Settings</h1>
          <h2>{{ activeSectionTitle }}</h2>

          <span v-if="activeSection === 'voice'">
            Test your microphone before joining real voice channels.
          </span>

          <span v-else>
            This section is prepared for future VOXYN settings.
          </span>
        </header>

        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>

        <!-- ===============================================
             SECTION 3A: Voice & Audio
        ================================================ -->
        <section v-if="activeSection === 'voice'" class="voice-section">
          <VoicePanel />

          <div class="setting-row">
            <div class="setting-row-left">
              <span class="setting-row-icon">🎙</span>

              <div>
                <h3>Input Device</h3>
                <p>Choose your microphone.</p>
              </div>
            </div>

            <div class="coming-soon">
              Coming soon
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row-left">
              <span class="setting-row-icon">≋</span>

              <div>
                <h3>Noise Suppression</h3>
                <p>Reduce background noise for clearer communication.</p>
              </div>
            </div>

            <div class="coming-soon">
              Coming soon
            </div>
          </div>

          <div class="privacy-note">
            <span>◇</span>
            <p>
              VOXYN does not store your voice recordings. The current Mic Test
              only checks local microphone input in your browser.
            </p>
          </div>
        </section>

        <!-- ===============================================
             SECTION 3B: Placeholder Sections
        ================================================ -->
        <section v-else class="placeholder-section">
          <div class="placeholder-card">
            <div class="placeholder-icon">
              {{ settingSections.find((section) => section.id === activeSection)?.icon }}
            </div>

            <p class="eyebrow">COMING SOON</p>
            <h2>{{ activeSectionTitle }}</h2>
            <span>
              This settings section is reserved for a future VOXYN update.
            </span>
          </div>
        </section>
      </section>
    </section>
  </main>
</template>

<style scoped>
.settings-page,
.settings-page *,
.settings-page *::before,
.settings-page *::after {
  box-sizing: border-box;
}

/* =========================================================
   SECTION 1: Page Shell
========================================================= */
.settings-page {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;

  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);

  color: #0f172a;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.16), transparent 36%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.12), transparent 34%),
    #eef5fb;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  overflow-x: hidden;
}

/* =========================================================
   SECTION 2: Settings Sidebar
========================================================= */
.settings-sidebar {
  min-width: 0;
  min-height: 100vh;
  padding: 24px 18px;

  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 18px;

  background: rgba(255, 255, 255, 0.72);
  border-right: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 14px 0 44px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(18px);
}

.user-card {
  width: 100%;
  min-width: 0;
  padding: 14px;

  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
  align-items: center;

  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;

  text-align: left;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.05);
}

.user-avatar {
  width: 54px;
  height: 54px;

  display: grid;
  place-items: center;

  border-radius: 18px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);

  font-size: 18px;
  font-weight: 950;
}

.user-info {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.user-info strong {
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info small {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-search {
  min-height: 46px;
  padding: 0 14px;

  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  border-radius: 16px;
  background: rgba(248, 250, 252, 0.94);
  border: 1px solid #cbd5e1;
}

.settings-search span {
  color: #64748b;
  font-size: 18px;
  font-weight: 900;
}

.settings-search input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;

  color: #0f172a;
  font-family: inherit;
  font-size: 14px;
  font-weight: 750;
}

.settings-search input::placeholder {
  color: #94a3b8;
}

.settings-nav {
  display: grid;
  align-content: start;
  gap: 8px;
}

.settings-nav button {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;

  display: flex;
  align-items: center;
  gap: 12px;

  border: none;
  border-radius: 16px;
  background: transparent;
  color: #475569;

  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;

  transition:
    transform 0.18s ease,
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.settings-nav button:hover {
  transform: translateY(-1px);
  background: rgba(239, 246, 255, 0.78);
  color: #2563eb;
}

.settings-nav button.active {
  color: #4f46e5;
  background: rgba(238, 242, 255, 0.96);
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.12);
}

.nav-icon {
  width: 24px;
  height: 24px;

  display: grid;
  place-items: center;

  color: currentColor;
  font-size: 17px;
  line-height: 1;
  font-weight: 950;
}

.settings-sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.settings-sidebar-footer button {
  width: 100%;
  min-height: 44px;

  border-radius: 15px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;

  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

/* =========================================================
   SECTION 3: Content Shell
========================================================= */
.settings-content {
  min-width: 0;
  position: relative;
  padding: 52px 64px;
}

.close-btn {
  position: absolute;
  top: 24px;
  right: 28px;

  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  color: #475569;

  font-size: 24px;
  line-height: 1;
  cursor: pointer;

  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.content-shell {
  width: min(1120px, 100%);
  display: grid;
  gap: 22px;
}

.settings-header {
  display: grid;
  gap: 8px;
}

.eyebrow {
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.3em;
}

.settings-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 38px;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.settings-header h2 {
  margin: 0;
  color: #4f46e5;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: -0.03em;
}

.settings-header span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.5;
}

/* =========================================================
   SECTION 4: Voice Section
========================================================= */
.voice-section {
  display: grid;
  gap: 16px;
}

.setting-row {
  min-height: 96px;
  padding: 18px 20px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;

  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
}

.setting-row-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.setting-row-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;

  display: grid;
  place-items: center;

  border-radius: 16px;
  color: #4f46e5;
  background: #eef2ff;

  font-size: 20px;
}

.setting-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 950;
}

.setting-row p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.coming-soon {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 12px;

  display: inline-flex;
  align-items: center;

  border-radius: 999px;
  color: #4f46e5;
  background: #eef2ff;

  font-size: 12px;
  font-weight: 950;
}

.privacy-note {
  padding: 16px 18px;

  display: flex;
  gap: 12px;
  align-items: flex-start;

  border-radius: 20px;
  color: #475569;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid #e2e8f0;
}

.privacy-note span {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;

  display: grid;
  place-items: center;

  border-radius: 999px;
  color: #4f46e5;
  background: #eef2ff;

  font-weight: 950;
}

.privacy-note p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

/* =========================================================
   SECTION 5: Placeholder
========================================================= */
.placeholder-section {
  display: grid;
}

.placeholder-card {
  min-height: 420px;
  padding: 42px;

  display: grid;
  place-items: center;
  justify-items: center;
  align-content: center;
  text-align: center;

  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
}

.placeholder-icon {
  width: 76px;
  height: 76px;
  margin-bottom: 22px;

  display: grid;
  place-items: center;

  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);

  font-size: 30px;
  font-weight: 950;
}

.placeholder-card h2 {
  margin: 8px 0 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.placeholder-card span {
  display: block;
  margin-top: 10px;
  color: #64748b;
  font-size: 15px;
  font-weight: 750;
}

/* =========================================================
   SECTION 6: States
========================================================= */
.loading-card {
  padding: 24px;
  border-radius: 24px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-weight: 900;
}

.error-message {
  margin: 0;
  padding: 14px 16px;

  border-radius: 16px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;

  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 7: Responsive
========================================================= */
@media (max-width: 1080px) {
  .settings-page {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .settings-content {
    padding: 48px 34px;
  }
}

@media (max-width: 860px) {
  .settings-page {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .settings-content {
    padding: 30px 18px;
  }

  .close-btn {
    top: 18px;
    right: 18px;
  }
}

@media (max-width: 620px) {
  .settings-nav button {
    min-height: 44px;
  }

  .settings-header h1 {
    font-size: 30px;
  }

  .setting-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .coming-soon {
    align-self: flex-start;
  }
}
</style>