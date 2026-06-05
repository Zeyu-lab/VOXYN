<template>
  <!-- =========================================================
       SECTION 1: Account Settings Card
       Purpose:
       - Show current account identity
       - Keep Profile editing in Profile.vue
       - Prepare account settings for future Supabase features
  ========================================================= -->
  <section class="settings-section-card">
    <header class="section-header">
      <p class="section-kicker">ACCOUNT</p>
      <h2>Account Overview</h2>
      <span>
        Review your VOXYN account information and jump to your full profile page.
      </span>
    </header>

    <div class="account-hero-card">
      <div class="account-avatar">
            <img
                v-if="safeAvatarUrl"
                :src="safeAvatarUrl"
                alt="Profile avatar"
                class="account-avatar-img"
                @error="handleAccountAvatarError"
            />
            <span v-else>{{ accountInitial }}</span>
        </div>

      <div class="account-main-info">
        <strong>{{ displayName }}</strong>
        <span>{{ email || "No email found" }}</span>
      </div>

      <button class="primary-action" @click="emit('open-profile')">
        Open Profile
      </button>
    </div>

    <div class="settings-list">
      <div class="settings-row">
        <div>
          <h3>Display name</h3>
          <p>{{ displayName }}</p>
        </div>

        <span class="status-pill">Profile</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Email address</h3>
          <p>{{ email || "Connected through Supabase Auth" }}</p>
        </div>

        <span class="status-pill">Auth</span>
      </div>

      <div class="settings-row">
        <div>
          <h3>Account security</h3>
          <p>Password reset and login device controls can be added later.</p>
        </div>

        <span class="status-pill muted">Coming soon</span>
      </div>
    </div>
  </section>
</template>

<script setup>
/* =========================================================
   SECTION 2: Props / Events
========================================================= */
import { computed, ref, watch } from "vue"

const props = defineProps({
  user: {
    type: Object,
    default: null
  },
  displayName: {
    type: String,
    default: "User"
  },
  email: {
    type: String,
    default: ""
  },
  avatarUrl: {
    type: String,
    default: ""
  }
})

const emit = defineEmits(["open-profile"])
const avatarLoadFailed = ref(false)

watch(
  () => props.avatarUrl,
  () => {
    avatarLoadFailed.value = false
  }
)

/* =========================================================
   SECTION 3: Computed Identity
========================================================= */
const accountInitial = computed(() => {
  return props.displayName.charAt(0).toUpperCase() || "U"
})

const safeAvatarUrl = computed(() => {
  if (avatarLoadFailed.value) return ""
  return props.avatarUrl
})

function handleAccountAvatarError() {
  avatarLoadFailed.value = true
}
</script>

<style scoped>
/* =========================================================
   SECTION 4: Shared Section Card
========================================================= */
.settings-section-card {
  display: grid;
  gap: 18px;
}

.section-header {
  padding: 26px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
}

.section-kicker {
  margin: 0 0 8px;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.22em;
}

.section-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.section-header span {
  display: block;
  margin-top: 10px;
  color: #64748b;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.5;
}

/* =========================================================
   SECTION 5: Account Hero
========================================================= */
.account-hero-card {
  min-width: 0;
  padding: 22px;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
}

.account-avatar {
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  overflow: hidden;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  font-size: 24px;
  font-weight: 950;
}

.account-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.account-main-info {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.account-main-info strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 22px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-main-info span {
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-action {
  min-height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  color: white;
  background: #4f46e5;
  font-family: inherit;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.2);
}

/* =========================================================
   SECTION 6: Rows
========================================================= */
.settings-list {
  display: grid;
  gap: 14px;
}

.settings-row {
  min-height: 92px;
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

.settings-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
}

.settings-row p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}

.status-pill {
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

.status-pill.muted {
  color: #64748b;
  background: #f1f5f9;
}

/* =========================================================
   SECTION 7: Responsive
========================================================= */
@media (max-width: 720px) {
  .account-hero-card {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
