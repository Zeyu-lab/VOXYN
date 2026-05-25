<template>
  <!-- =================================================
       SECTION 1: Profile Page
       Purpose:
       - Compact Glass Profile
       - Real avatar upload through Supabase Storage
  ================================================== -->
  <main class="profile-page">
    <section class="profile-shell">
      <!-- =================================================
           SECTION 2: Profile Topbar
      ================================================== -->
      <header class="profile-topbar">
        <button class="back-link" @click="goDashboard">
          ← Dashboard
        </button>

        <div class="topbar-title">
          <p>VOXYN</p>
          <h1>Profile</h1>
        </div>
      </header>

      <!-- =================================================
           SECTION 3: Hero Profile Card
      ================================================== -->
      <section class="profile-hero">
        <div class="avatar-area">
          <div class="avatar-frame">
            <img
              v-if="avatarDisplayUrl"
              :src="avatarDisplayUrl"
              alt="Profile avatar"
              class="avatar-img"
            />

            <div v-else class="avatar-fallback">
              {{ initials }}
            </div>

            <label class="avatar-upload-btn">
              Change
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                hidden
                @change="handleAvatarUpload"
              />
            </label>
          </div>

          <p v-if="uploadingAvatar" class="upload-text">
            Uploading avatar...
          </p>

          <p v-if="avatarError" class="error-text">
            {{ avatarError }}
          </p>
        </div>

        <div class="identity-block">
          <p class="section-label">Profile</p>
          <h2>{{ accountName }}</h2>
          <p class="email-text">
            {{ loading ? "Loading account..." : userEmail }}
          </p>

          <div class="badge-row">
            <span class="status-badge">
              <span class="status-dot"></span>
              Connected
            </span>

            <span class="soft-badge">Free User</span>
            <span class="soft-badge">Local Host</span>
          </div>
        </div>
      </section>

      <!-- =================================================
           SECTION 4: Main Content Grid
      ================================================== -->
      <section class="profile-grid">
        <!-- Account Card -->
        <article class="glass-card">
          <p class="section-label">Account</p>
          <h3>Basic Info</h3>

          <div class="info-list">
            <div class="info-row">
              <span>Email</span>
              <strong>{{ userEmail || "Not available" }}</strong>
            </div>

            <div class="info-row">
              <span>User ID</span>
              <strong>{{ shortUserId }}</strong>
            </div>

            <div class="info-row">
              <span>Login Method</span>
              <strong>Email</strong>
            </div>
          </div>
        </article>

        <!-- Activity Card -->
        <article class="glass-card">
          <p class="section-label">Activity</p>
          <h3>VOXYN Status</h3>

          <div class="info-list">
            <div class="info-row">
              <span>Rooms Created</span>
              <strong>0</strong>
            </div>

            <div class="info-row">
              <span>Rooms Joined</span>
              <strong>0</strong>
            </div>

            <div class="info-row">
              <span>Last Online</span>
              <strong>Now</strong>
            </div>
          </div>
        </article>
      </section>

      <!-- =================================================
           SECTION 5: Settings Card
      ================================================== -->
      <section class="settings-card">
        <div class="settings-header">
          <div>
            <p class="section-label">Settings</p>
            <h3>Profile Settings</h3>
          </div>

          <button class="save-btn" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? "Saving..." : "Save" }}
          </button>
        </div>

        <div class="settings-grid">
          <label class="field-block">
            Display Name
            <input
              v-model="displayName"
              class="profile-input"
              type="text"
              placeholder="Enter display name"
            />
          </label>

          <label class="field-block">
            Status Message
            <input
              v-model="statusMessage"
              class="profile-input"
              type="text"
              placeholder="Building VOXYN..."
            />
          </label>
        </div>

        <div class="theme-row">
          <button class="theme-chip active">Dark Glass</button>
          <button class="theme-chip">Light</button>
          <button class="theme-chip">System</button>
        </div>

        <p v-if="saveMessage" class="save-message">
          {{ saveMessage }}
        </p>
      </section>

      <!-- =================================================
           SECTION 6: Danger Zone
      ================================================== -->
      <section class="danger-card">
        <div>
          <p class="section-label">Session</p>
          <h3>Sign out from this account</h3>
        </div>

        <button class="logout-btn" @click="signOut">
          Sign out
        </button>
      </section>
    </section>
  </main>
</template>

<script setup>
/* =================================================
   SECTION 1: Imports
================================================== */
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../lib/supabaseClient"

/* =================================================
   SECTION 2: State
================================================== */
const router = useRouter()

const loading = ref(true)
const uploadingAvatar = ref(false)
const savingProfile = ref(false)

const userEmail = ref("")
const userId = ref("")
const displayName = ref("")
const statusMessage = ref("Building VOXYN...")

const avatarUrl = ref("")
const avatarUpdatedAt = ref("")
const avatarError = ref("")
const saveMessage = ref("")

/* =================================================
   SECTION 3: Computed Values
================================================== */
const initials = computed(() => {
  const source = displayName.value || userEmail.value || "User"
  return source.charAt(0).toUpperCase()
})

const accountName = computed(() => {
  if (displayName.value) return displayName.value
  if (userEmail.value) return userEmail.value.split("@")[0]
  return "VOXYN User"
})

const shortUserId = computed(() => {
  if (!userId.value) return "Not available"
  return `${userId.value.slice(0, 8)}...`
})

const avatarDisplayUrl = computed(() => {
  if (!avatarUrl.value) return ""

  if (avatarUpdatedAt.value) {
    return `${avatarUrl.value}?v=${avatarUpdatedAt.value}`
  }

  return avatarUrl.value
})

/* =================================================
   SECTION 4: Load Current User
================================================== */
onMounted(() => {
  loadProfile()
})

async function loadProfile() {
  loading.value = true

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Profile session error:", error)
      return
    }

    const user = data?.session?.user

    if (!user) {
      router.push("/login")
      return
    }

    const metadata = user.user_metadata || {}

    userEmail.value = user.email || ""
    userId.value = user.id || ""

    displayName.value =
      metadata.display_name ||
      user.email?.split("@")[0] ||
      "VOXYN User"

    statusMessage.value =
      metadata.status_message ||
      "Building VOXYN..."

    avatarUrl.value = metadata.avatar_url || ""
    avatarUpdatedAt.value = metadata.avatar_updated_at || ""
  } catch (err) {
    console.error("Profile load failed:", err)
  } finally {
    loading.value = false
  }
}

/* =================================================
   SECTION 5: Avatar Upload
   Purpose:
   - User selects local image
   - Upload to Supabase Storage bucket: avatars
   - Save public avatar URL into auth metadata
================================================== */
async function handleAvatarUpload(event) {
  avatarError.value = ""

  const file = event.target.files?.[0]

  if (!file) return

  const allowedTypes = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  }

  const fileExt = allowedTypes[file.type]

  if (!fileExt) {
    avatarError.value = "Please upload PNG, JPG, or WEBP image."
    event.target.value = ""
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = "Avatar image must be under 2MB."
    event.target.value = ""
    return
  }

  uploadingAvatar.value = true

  try {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) {
      throw new Error("User is not signed in.")
    }

    const user = data.user
    const metadata = user.user_metadata || {}
    const oldAvatarPath = metadata.avatar_path || ""
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      throw uploadError
    }
    if (oldAvatarPath && oldAvatarPath !== filePath) {
        const { error: removeError } = await supabase.storage
            .from("avatars")
            .remove([oldAvatarPath])

        if (removeError) {
            console.warn("Old avatar remove failed:", removeError)
        }
    }

avatarUrl.value = publicUrl
avatarUpdatedAt.value = updatedAt

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl
    const updatedAt = Date.now().toString()

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        avatar_url: publicUrl,
        avatar_path: filePath,
        avatar_updated_at: updatedAt
      }
    })

    if (updateError) {
      throw updateError
    }

    avatarUrl.value = publicUrl
    avatarUpdatedAt.value = updatedAt
  } catch (err) {
    console.error("Avatar upload failed:", err)
    avatarError.value = "Avatar upload failed. Check bucket policy or try again."
  } finally {
    uploadingAvatar.value = false
    event.target.value = ""
  }
}

/* =================================================
   SECTION 6: Save Profile Metadata
================================================== */
async function saveProfile() {
  saveMessage.value = ""
  savingProfile.value = true

  try {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) {
      throw new Error("User is not signed in.")
    }

    const metadata = data.user.user_metadata || {}

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        display_name: displayName.value,
        status_message: statusMessage.value
      }
    })

    if (updateError) {
      throw updateError
    }

    saveMessage.value = "Profile saved."
  } catch (err) {
    console.error("Profile save failed:", err)
    saveMessage.value = "Save failed. Please try again."
  } finally {
    savingProfile.value = false

    setTimeout(() => {
      saveMessage.value = ""
    }, 2200)
  }
}

/* =================================================
   SECTION 7: Navigation Actions
================================================== */
function goDashboard() {
  router.push("/dashboard")
}

async function signOut() {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error("Sign out failed:", err)
  }

  router.push("/")
}
</script>

<style scoped>
/* =================================================
   SECTION 1: Page Base
================================================== */
.profile-page {
  min-height: 100vh;
  padding: 34px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.22), transparent 34%),
    radial-gradient(circle at bottom left, rgba(147, 197, 253, 0.2), transparent 30%),
    linear-gradient(135deg, #eef8ff 0%, #f8fbff 48%, #e7f5ff 100%);
  color: #080d1d;
}

.profile-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
}

/* =================================================
   SECTION 2: Topbar
================================================== */
.profile-topbar {
  min-height: 116px;
  padding: 28px 34px;
  border-radius: 34px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(22px);
}

.back-link {
  height: 54px;
  padding: 0 22px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);

  background: rgba(255, 255, 255, 0.68);
  color: #0f172a;

  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.topbar-title {
  text-align: right;
}

.topbar-title p,
.section-label {
  margin: 0 0 8px;
  color: #1593e8;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.topbar-title h1 {
  margin: 0;
  font-size: clamp(34px, 4vw, 58px);
  line-height: 0.95;
  letter-spacing: -0.055em;
}

/* =================================================
   SECTION 3: Hero Card
================================================== */
.profile-hero {
  margin-top: 26px;
  padding: 42px;
  border-radius: 38px;

  display: grid;
  grid-template-columns: 220px 1fr;
  align-items: center;
  gap: 34px;

  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(24px);
}

.avatar-area {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.avatar-frame {
  position: relative;
  width: 148px;
  height: 148px;
  padding: 5px;
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg, #07111f, #1593e8);
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.2);
}

.avatar-img,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-img {
  object-fit: cover;
  display: block;
  border: 3px solid rgba(255, 255, 255, 0.94);
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;

  background: #070b1a;
  color: white;

  font-size: 56px;
  font-weight: 950;
  border: 3px solid rgba(255, 255, 255, 0.94);
}

.avatar-upload-btn {
  position: absolute;
  right: -12px;
  bottom: 12px;

  height: 36px;
  padding: 0 14px;
  border-radius: 999px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #070b1a;
  color: white;

  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.24);
}

.upload-text {
  margin: 0;
  color: #1593e8;
  font-size: 14px;
  font-weight: 900;
}

.error-text {
  margin: 0;
  color: #dc2626;
  font-size: 14px;
  font-weight: 900;
  text-align: center;
}

.identity-block h2 {
  margin: 0;
  font-size: clamp(44px, 6vw, 78px);
  line-height: 0.92;
  letter-spacing: -0.06em;
}

.email-text {
  margin: 18px 0 0;
  color: #64748b;
  font-size: 20px;
  font-weight: 800;
}

.badge-row {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.status-badge,
.soft-badge {
  height: 44px;
  padding: 0 18px;
  border-radius: 999px;

  display: inline-flex;
  align-items: center;
  gap: 10px;

  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.24);

  color: #334155;
  font-size: 14px;
  font-weight: 950;
}

.status-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #22c55e;
}

/* =================================================
   SECTION 4: Cards
================================================== */
.profile-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.glass-card,
.settings-card,
.danger-card {
  padding: 30px;
  border-radius: 32px;

  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.07);
  backdrop-filter: blur(22px);
}

.glass-card h3,
.settings-card h3,
.danger-card h3 {
  margin: 0 0 22px;
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.info-list {
  display: grid;
  gap: 14px;
}

.info-row {
  min-height: 58px;
  padding: 16px 18px;
  border-radius: 20px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  background: rgba(241, 245, 249, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.info-row span {
  color: #64748b;
  font-size: 15px;
  font-weight: 850;
}

.info-row strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  text-align: right;
  word-break: break-word;
}

/* =================================================
   SECTION 5: Settings
================================================== */
.settings-card {
  margin-top: 24px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.field-block {
  display: grid;
  gap: 10px;

  color: #334155;
  font-size: 15px;
  font-weight: 950;
}

.profile-input {
  height: 58px;
  padding: 0 18px;
  border-radius: 18px;

  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.82);

  color: #0f172a;
  font-size: 17px;
  font-weight: 850;
  outline: none;
}

.profile-input:focus {
  border-color: rgba(21, 147, 232, 0.6);
  box-shadow: 0 0 0 4px rgba(21, 147, 232, 0.12);
}

.theme-row {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.theme-chip {
  height: 44px;
  padding: 0 18px;
  border-radius: 999px;

  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.68);

  color: #334155;
  font-size: 14px;
  font-weight: 950;
  cursor: pointer;
}

.theme-chip.active {
  background: #070b1a;
  color: white;
}

.save-btn {
  height: 54px;
  padding: 0 28px;
  border: none;
  border-radius: 20px;

  background: #1593e8;
  color: white;

  font-size: 16px;
  font-weight: 950;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-message {
  margin: 18px 0 0;
  color: #16a34a;
  font-size: 14px;
  font-weight: 950;
}

/* =================================================
   SECTION 6: Danger Zone
================================================== */
.danger-card {
  margin-top: 24px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.danger-card h3 {
  margin-bottom: 0;
}

.logout-btn {
  height: 58px;
  padding: 0 30px;
  border: none;
  border-radius: 22px;

  background: #070b1a;
  color: white;

  font-size: 17px;
  font-weight: 950;
  cursor: pointer;
}

/* =================================================
   SECTION 7: Responsive
================================================== */
@media (max-width: 900px) {
  .profile-page {
    padding: 18px;
  }

  .profile-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-title {
    text-align: left;
  }

  .profile-hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .badge-row {
    justify-content: center;
  }

  .profile-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .settings-header,
  .danger-card {
    flex-direction: column;
    align-items: stretch;
  }

  .save-btn,
  .logout-btn {
    width: 100%;
  }
}
</style>