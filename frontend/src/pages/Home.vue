<script setup>
import { useRouter } from "vue-router"

const router = useRouter()

function goToLogin() {
  router.push("/login")
}

function goToSignup() {
  router.push("/signup")
}

function goHome() {
  router.push("/")
}
</script>

<template>
  <main class="home-page">
    <!-- =========================================================
        SECTION 01: TOP BAR / 顶部导航
      ========================================================== -->
      <header class="top-bar">
        <div class="top-bar-inner">
          <div class="top-bar-logo" @click="goHome">
            <div class="logo-mark">◆</div>

            <div class="logo-text">
              <span>VOXYN</span>
              <small>Social Room Platform</small>
            </div>
          </div>

          <nav class="top-bar-nav">
            <a href="#story">Product</a>
            <a href="#features">Features</a>
            <a href="#tech-stack">Tech Stack</a>
            <a href="#roadmap">Roadmap</a>
          </nav>

          <div class="top-bar-actions">
            <button class="login-button" @click="goToLogin">
              Log in
            </button>

            <button class="nav-cta-button" @click="goToSignup">
              Get Started
            </button>
          </div>
        </div>
      </header>

    <!-- =========================================================
      SECTION 02: HERO / 首页主视觉
    ========================================================== -->
    <section class="hero-section">
      <div class="hero-bg-shape shape-one"></div>
      <div class="hero-bg-shape shape-two"></div>

      <div class="hero-layout">
        <!-- LEFT: Product Mockup -->
        <section class="hero-mockup-section">
          <div class="desktop-mockup">
            <div class="mockup-top">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div class="mockup-body">
              <aside class="mock-sidebar">
                <div class="side-logo">V</div>
                <div class="side-dot active"></div>
                <div class="side-dot"></div>
                <div class="side-dot"></div>
                <div class="side-dot"></div>
              </aside>

              <div class="mock-main">
                <div class="mock-header">
                  <div>
                    <h3>Room VX-482A</h3>
                    <p><span></span> 3 users online</p>
                  </div>

                  <div class="mock-actions">
                    <button>👥</button>
                    <button>⋮</button>
                  </div>
                </div>

                <div class="voice-grid">
                  <div class="voice-user active">Z</div>
                  <div class="voice-user">A</div>
                  <div class="voice-user">M</div>
                </div>

                <div class="mock-chat">
                  <p><strong>Jiahao</strong> created a room.</p>
                  <p><strong>Alex</strong> joined with room code.</p>
                  <p><strong>Mia</strong> started Click Battle.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="phone-mockup">
            <div class="phone-notch"></div>

            <div class="phone-screen">
              <div class="phone-title">VOXYN</div>
              <div class="phone-room">Room VX-482A</div>
              <div class="phone-line"></div>
              <div class="phone-line short"></div>
              <div class="phone-button">Join Room</div>
            </div>
          </div>
        </section>

        <!-- RIGHT: Hero Text + Promo Card -->
        <section class="hero-copy-section">
          <p class="hero-label">SELF-HOSTED SOCIAL ROOM PLATFORM</p>

          <h1>
            Create rooms,
            <br />
            invite friends,
            <br />
            and play together instantly.
          </h1>

          <p class="hero-description">
            VOXYN is a lightweight self-hosted social room platform for creating
            rooms, sharing room codes, chatting in real time, and playing simple
            mini games with friends.
          </p>

          <div
            class="hero-promo-card"
            role="button"
            tabindex="0"
            @click="goToSignup"
            @keydown.enter="goToSignup"
            @keydown.space.prevent="goToSignup"
          >
            <div class="promo-card-top">
              <span class="promo-kicker">ROOM SYSTEM PREVIEW</span>
              <span class="promo-status">MVP BUILD</span>
            </div>

            <div class="promo-display">
              <div class="promo-line"></div>
              <div class="promo-line short"></div>

              <div class="process-grid">
                <div class="process-box active">
                  <span>01</span>
                  <strong>Create</strong>
                  <p>Start a room from your own VOXYN instance.</p>
                </div>

                <div class="process-box">
                  <span>02</span>
                  <strong>Share</strong>
                  <p>Send the server link and room code to friends.</p>
                </div>

                <div class="process-box">
                  <span>03</span>
                  <strong>Play</strong>
                  <p>Chat, join rooms, and play small real-time games.</p>
                </div>
              </div>
            </div>

            <div class="promo-bottom">
              <div>
                <h3>Self-hosted room flow</h3>
                <p>
                  Built to show frontend, backend, real-time communication,
                  and product thinking in one complete portfolio project.
                </p>
              </div>

              <button class="primary-action-button" @click.stop="goToLogin">
                ⚡ Get Started
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>

    <!-- =========================================================
      SECTION 03: STACK STRIP / 技术栈横条
    ========================================================== -->
    <section class="stack-strip">
      <h2>Built as a real full-stack portfolio project</h2>

      <div class="stack-strip-items">
        <span>Vue</span>
        <span>Express</span>
        <span>Socket.IO</span>
        <span>Supabase</span>
        <span>WebRTC Later</span>
      </div>
    </section>

    <!-- =========================================================
      SECTION 04: PRODUCT STORY / 项目宣传介绍
    ========================================================== -->
    <section id="story" class="story-section">
      <div class="story-shell">
        <div class="story-left">
          <p class="section-tag">PRODUCT CONCEPT</p>
          <h2>
            A small social room system,
            designed like a real product.
          </h2>
          <p>
            VOXYN is not trying to become a full Discord clone. The first goal
            is to build a small but complete room-based platform that clearly
            shows how users create a room, invite friends, and interact in real time.
          </p>
        </div>

        <div class="story-panel">
          <div class="story-panel-header">
            <span>VOXYN FLOW</span>
            <span>01 / 03</span>
          </div>

          <div class="story-panel-grid">
            <div class="large-number">01</div>

            <div class="story-panel-content">
              <h3>From local server to shared room</h3>
              <p>
                One person runs a VOXYN instance, shares the server link, and
                friends join using a room code generated inside that instance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================
      SECTION 05: FEATURES / 核心功能宣传
    ========================================================== -->
    <section id="features" class="features-section">
      <div class="section-heading">
        <p class="section-tag">CORE FEATURES</p>
        <h2>Focused on a small but complete MVP</h2>
        <p>
          The first version keeps the scope clear. It focuses on the room flow,
          real-time interaction, and a simple user experience.
        </p>
      </div>

      <div class="feature-grid">
        <article class="feature-card">
          <span>01</span>
          <h3>Room code system</h3>
          <p>Create a room and let friends join with a simple code.</p>
        </article>

        <article class="feature-card">
          <span>02</span>
          <h3>Real-time chat</h3>
          <p>Send messages instantly through a Socket.IO-powered backend.</p>
        </article>

        <article class="feature-card">
          <span>03</span>
          <h3>Online users</h3>
          <p>Show who is currently inside the same room.</p>
        </article>

        <article class="feature-card">
          <span>04</span>
          <h3>Self-hosted instance</h3>
          <p>Each running server has its own independent rooms and codes.</p>
        </article>

        <article class="feature-card">
          <span>05</span>
          <h3>Mini games</h3>
          <p>Simple multiplayer games can be added inside the room experience.</p>
        </article>

        <article class="feature-card">
          <span>06</span>
          <h3>Voice room later</h3>
          <p>Voice support is planned after the basic MVP becomes stable.</p>
        </article>
      </div>
    </section>

    <!-- =========================================================
      SECTION 06: TECH STACK / 技术栈说明
    ========================================================== -->
    <section id="tech-stack" class="tech-section">
      <div class="section-heading">
        <p class="section-tag">TECH STACK</p>
        <h2>Designed to show full-stack ability</h2>
        <p>
          VOXYN is structured as a portfolio project that can demonstrate
          frontend design, backend APIs, real-time events, authentication,
          and future deployment planning.
        </p>
      </div>

      <div class="tech-grid">
        <div class="tech-item">
          <strong>Vue 3</strong>
          <span>Frontend interface</span>
        </div>

        <div class="tech-item">
          <strong>Vite</strong>
          <span>Fast development setup</span>
        </div>

        <div class="tech-item">
          <strong>Express</strong>
          <span>Backend server</span>
        </div>

        <div class="tech-item">
          <strong>Socket.IO</strong>
          <span>Real-time communication</span>
        </div>

        <div class="tech-item">
          <strong>Supabase</strong>
          <span>Auth and database later</span>
        </div>

        <div class="tech-item">
          <strong>WebRTC</strong>
          <span>Voice room later</span>
        </div>
      </div>
    </section>

    <!-- =========================================================
      SECTION 07: ROADMAP / 后续开发计划
    ========================================================== -->
    <section id="roadmap" class="roadmap-section">
      <div class="section-heading">
        <p class="section-tag">ROADMAP</p>
        <h2>Future development plan</h2>
      </div>

      <div class="roadmap-list">
        <div class="roadmap-item">
          <span>V1</span>
          <div>
            <h3>Room MVP</h3>
            <p>Room creation, room code joining, online users, and real-time chat.</p>
          </div>
        </div>

        <div class="roadmap-item">
          <span>V2</span>
          <div>
            <h3>Mini-game layer</h3>
            <p>Simple multiplayer mini games and better room state management.</p>
          </div>
        </div>

        <div class="roadmap-item">
          <span>V3</span>
          <div>
            <h3>Accounts and voice</h3>
            <p>Supabase accounts, voice support, deployment, and payment experiments.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================
      SECTION 08: BOTTOM CTA / 底部行动按钮
    ========================================================== -->
    <section class="bottom-cta-section">
      <p class="section-tag light">START BUILDING</p>
      <h2>Ready to enter VOXYN?</h2>
      <p>
        Create an account, log in, and continue building the full room experience.
      </p>

      <div class="bottom-cta-actions">
        <button class="bottom-primary-button" @click="goToSignup">
          Create account
        </button>

        <button class="bottom-secondary-button" @click="goToLogin">
          Log in
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
}

* {
  box-sizing: border-box;
}

.home-page {
  min-height: 100vh;
  background: #ffffff;
  color: #0f172a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}
/* =========================================================
  SECTION 01: TOP BAR / 顶部导航
========================================================= */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;

  padding: 14px 6%;
  background: rgba(255, 255, 255, 0.78);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  backdrop-filter: blur(22px);
}

.top-bar-inner {
  width: min(1280px, 100%);
  margin: 0 auto;

  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 34px;
}

.top-bar-logo {
  display: inline-flex;
  align-items: center;
  gap: 14px;

  cursor: pointer;
  user-select: none;
}

.logo-mark {
  width: 48px;
  height: 48px;

  display: grid;
  place-items: center;

  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 16px;
  color: #ffffff;
  background: linear-gradient(135deg, #38bdf8, #4f46e5);
  box-shadow: 0 14px 34px rgba(79, 70, 229, 0.22);

  font-size: 15px;
  font-weight: 950;
}

.logo-text {
  display: grid;
  gap: 2px;
}

.logo-text span {
  color: #0f172a;
  letter-spacing: 0.26em;
  font-size: 24px;
  font-weight: 950;
}

.logo-text small {
  color: #64748b;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 850;
}

.top-bar-nav {
  justify-self: center;

  padding: 8px;

  display: flex;
  align-items: center;
  gap: 6px;

  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.top-bar-nav a {
  padding: 10px 16px;

  border-radius: 999px;
  color: #475569;
  text-decoration: none;

  font-size: 14px;
  font-weight: 850;

  transition:
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.top-bar-nav a:hover {
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.09);
  transform: translateY(-1px);
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-button,
.nav-cta-button {
  min-height: 44px;
  padding: 0 18px;

  border-radius: 999px;
  cursor: pointer;

  font-size: 14px;
  font-weight: 900;

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.login-button {
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  background: rgba(255, 255, 255, 0.68);
}

.login-button:hover {
  color: #4f46e5;
  background: rgba(255, 255, 255, 0.94);
  transform: translateY(-1px);
}

.nav-cta-button {
  border: 0;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #6d5dfc);
  box-shadow: 0 14px 32px rgba(79, 70, 229, 0.24);
}

.nav-cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 42px rgba(79, 70, 229, 0.3);
}

/* =========================================================
  SECTION 02: HERO / 首页主视觉
========================================================= */
.hero-section {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.22), transparent 34%),
    linear-gradient(135deg, #0d4ca8 0%, #0076d8 48%, #0787de 100%);
  min-height: calc(100vh - 96px);
  padding: 88px 6% 150px;
}

.hero-bg-shape {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.shape-one {
  width: 640px;
  height: 640px;
  left: -220px;
  top: -160px;
  background: rgba(255, 255, 255, 0.14);
}

.shape-two {
  width: 780px;
  height: 780px;
  right: -260px;
  bottom: -420px;
  background: rgba(255, 255, 255, 0.13);
}

.hero-layout {
  position: relative;
  z-index: 2;
  max-width: 1420px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 72px;
}

/* Hero Left Mockup */
.hero-mockup-section {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
}

.desktop-mockup {
  width: 100%;
  max-width: 720px;
  border: 18px solid #05070d;
  border-radius: 22px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.28);
}

.mockup-top {
  height: 38px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 22px;
}

.mockup-top span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
}

.mockup-body {
  display: grid;
  grid-template-columns: 110px 1fr;
  min-height: 420px;
}

.mock-sidebar {
  background: #07537d;
  padding: 34px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
}

.side-logo {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #ffffff;
  color: #07537d;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 22px;
}

.side-dot {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(203, 213, 225, 0.45);
}

.side-dot.active {
  background: #22c772;
}

.mock-main {
  padding: 46px 42px;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

.mock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.mock-header h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 30px;
  font-weight: 900;
}

.mock-header p {
  margin: 0;
  color: #334155;
  font-size: 16px;
  font-weight: 700;
}

.mock-header p span {
  display: inline-block;
  width: 12px;
  height: 12px;
  background: #22c772;
  border-radius: 50%;
}

.mock-actions {
  display: flex;
  gap: 12px;
}

.mock-actions button {
  width: 46px;
  height: 46px;
  border: 1px solid #d7e3f2;
  background: #f8fbff;
  border-radius: 16px;
  cursor: pointer;
}

.voice-grid {
  display: flex;
  gap: 30px;
  margin-top: 44px;
}

.voice-user {
  width: 96px;
  height: 96px;
  border-radius: 26px;
  background: #e6f0ff;
  color: #075b93;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 900;
}

.voice-user.active {
  background: linear-gradient(135deg, #23c765, #1fc9aa);
  color: #ffffff;
}

.mock-chat {
  margin-top: 42px;
  max-width: 360px;
  padding: 34px;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.09);
}

.mock-chat p {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.5;
}

.mock-chat p:last-child {
  margin-bottom: 0;
}

.phone-mockup {
  position: absolute;
  right: 0;
  bottom: 40px;
  width: 160px;
  height: 310px;
  border: 10px solid #05070d;
  border-radius: 34px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
}

.phone-notch {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 18px;
  background: #05070d;
  border-radius: 999px;
  z-index: 2;
}

.phone-screen {
  padding: 62px 18px 18px;
}

.phone-title {
  color: #075b93;
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 24px;
}

.phone-room {
  color: #0f172a;
  font-weight: 900;
  font-size: 14px;
  line-height: 1.2;
  margin-bottom: 28px;
}

.phone-line {
  height: 12px;
  background: #d7e3f2;
  border-radius: 999px;
  margin-bottom: 14px;
}

.phone-line.short {
  width: 78%;
}

.phone-button {
  margin-top: 36px;
  height: 42px;
  border-radius: 14px;
  background: #20c767;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 13px;
}

/* Hero Right Copy */
.hero-copy-section {
  color: #ffffff;
}

.hero-label {
  display: inline-flex;
  margin: 0 0 22px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #eaf6ff;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.hero-copy-section h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(44px, 5vw, 68px);
  line-height: 0.98;
  letter-spacing: -3px;
  font-weight: 900;
}

.hero-description {
  max-width: 660px;
  margin: 28px 0 34px;
  color: #f0f8ff;
  font-size: 20px;
  line-height: 1.55;
  font-weight: 500;
}

/* Hero Promo Card */
.hero-promo-card {
  max-width: 680px;
  padding: 26px;
  border-radius: 26px;
  background: rgba(8, 18, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 34px 80px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  backdrop-filter: blur(18px);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.hero-promo-card:hover,
.hero-promo-card:focus {
  transform: translateY(-4px);
  box-shadow: 0 42px 95px rgba(0, 0, 0, 0.36);
  outline: none;
}

.promo-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.promo-kicker {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.promo-status {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
  font-size: 12px;
  font-weight: 900;
}

.promo-display {
  padding: 28px;
  border-radius: 22px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.25), transparent 32%),
    #050b16;
  background-size: 42px 42px, 42px 42px, auto, auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.promo-line {
  width: 62%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin-bottom: 12px;
}

.promo-line.short {
  width: 38%;
  margin-bottom: 28px;
}

.process-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.process-box {
  min-height: 170px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.11);
}

.process-box.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.28), rgba(14, 165, 233, 0.22));
  border-color: rgba(134, 239, 172, 0.42);
}

.process-box span {
  display: block;
  margin-bottom: 30px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 42px;
  font-weight: 300;
  letter-spacing: -2px;
}

.process-box strong {
  display: block;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 8px;
}

.process-box p {
  margin: 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.45;
}

.promo-bottom {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
}

.promo-bottom h3 {
  margin: 0 0 8px;
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
}

.promo-bottom p {
  margin: 0;
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1.5;
}

.primary-action-button {
  min-width: 210px;
  height: 62px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #22c55e, #16b86c);
  color: #ffffff;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 16px 32px rgba(22, 184, 108, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 38px rgba(22, 184, 108, 0.35);
}

/* =========================================================
  SECTION 03: STACK STRIP / 技术栈横条
========================================================= */
.stack-strip {
  position: relative;
  z-index: 5;
  max-width: 1180px;
  margin: -92px auto 0;
  padding: 34px 48px;
  border-radius: 18px 18px 0 0;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 -12px 50px rgba(15, 23, 42, 0.1);
}

.stack-strip h2 {
  margin: 0 0 24px;
  color: #075b93;
  font-size: 24px;
  font-weight: 900;
}

.stack-strip-items {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 34px;
}

.stack-strip-items span {
  color: #075b93;
  font-size: 18px;
  font-weight: 900;
}

/* =========================================================
  SHARED SECTION HEADING / 通用标题样式
========================================================= */
.section-heading {
  max-width: 780px;
  margin: 0 auto 52px;
  text-align: center;
}

.section-tag {
  margin: 0 0 14px;
  color: #0b6fc9;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.8px;
}

.section-tag.light {
  color: #dbeafe;
}

.section-heading h2 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.08;
  letter-spacing: -1.6px;
  font-weight: 900;
}

.section-heading p {
  margin: 0;
  color: #64748b;
  font-size: 18px;
  line-height: 1.7;
}

/* =========================================================
  SECTION 04: PRODUCT STORY / 项目宣传介绍
========================================================= */
.story-section {
  padding: 110px 6%;
  background: #0a0d14;
  color: #ffffff;
}

.story-shell {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 48px;
  align-items: stretch;
}

.story-left {
  padding: 48px 0;
}

.story-left h2 {
  margin: 0 0 24px;
  font-size: clamp(36px, 5vw, 62px);
  line-height: 1.02;
  letter-spacing: -2.5px;
  font-weight: 800;
}

.story-left p:last-child {
  margin: 0;
  color: #cbd5e1;
  font-size: 18px;
  line-height: 1.75;
}

.story-panel {
  min-height: 460px;
  padding: 34px;
  border-radius: 28px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(135deg, rgba(37, 99, 235, 0.36), rgba(15, 23, 42, 0.96));
  background-size: 52px 52px, 52px 52px, auto;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 35px 90px rgba(0, 0, 0, 0.34);
}

.story-panel-header {
  display: flex;
  justify-content: space-between;
  color: #bfdbfe;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.5px;
  margin-bottom: 80px;
}

.story-panel-grid {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 32px;
  align-items: end;
}

.large-number {
  color: rgba(255, 255, 255, 0.32);
  font-size: 150px;
  line-height: 0.8;
  font-weight: 200;
  letter-spacing: -8px;
}

.story-panel-content h3 {
  margin: 0 0 18px;
  color: #ffffff;
  font-size: 34px;
  line-height: 1.1;
  font-weight: 800;
}

.story-panel-content p {
  margin: 0;
  color: #cbd5e1;
  font-size: 17px;
  line-height: 1.65;
}

/* =========================================================
  SECTION 05: FEATURES / 核心功能宣传
========================================================= */
.features-section {
  padding: 105px 8%;
  background: #f5f8fc;
}

.feature-grid {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  min-height: 230px;
  padding: 32px;
  border-radius: 28px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.feature-card span {
  color: #0b6fc9;
  font-size: 14px;
  font-weight: 900;
}

.feature-card h3 {
  margin: 26px 0 12px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 900;
}

.feature-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

/* =========================================================
  SECTION 06: TECH STACK / 技术栈说明
========================================================= */
.tech-section {
  padding: 105px 8%;
  background: #ffffff;
}

.tech-grid {
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.tech-item {
  padding: 28px;
  border-radius: 24px;
  background: #eef6ff;
  border: 1px solid #dbeafe;
}

.tech-item strong {
  display: block;
  margin-bottom: 10px;
  color: #075b93;
  font-size: 22px;
  font-weight: 900;
}

.tech-item span {
  color: #475569;
  font-size: 15px;
  font-weight: 700;
}

/* =========================================================
  SECTION 07: ROADMAP / 后续开发计划
========================================================= */
.roadmap-section {
  padding: 105px 8%;
  background: #f8fafc;
}

.roadmap-list {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.roadmap-item {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 28px;
  padding: 30px 34px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.roadmap-item span {
  color: #0b6fc9;
  font-size: 24px;
  font-weight: 900;
}

.roadmap-item h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 900;
}

.roadmap-item p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

/* =========================================================
  SECTION 08: BOTTOM CTA / 底部行动按钮
========================================================= */
.bottom-cta-section {
  padding: 100px 8%;
  text-align: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.22), transparent 28%),
    linear-gradient(135deg, #075b93, #0076d8);
  color: #ffffff;
}

.bottom-cta-section h2 {
  margin: 0 0 14px;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -1.5px;
}

.bottom-cta-section p {
  margin: 0 auto 30px;
  max-width: 620px;
  color: #eaf6ff;
  font-size: 18px;
  line-height: 1.6;
}

.bottom-cta-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.bottom-primary-button,
.bottom-secondary-button {
  border: none;
  padding: 18px 34px;
  border-radius: 18px;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.bottom-primary-button {
  background: #ffffff;
  color: #075b93;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.bottom-secondary-button {
  border: 1px solid rgba(255, 255, 255, 0.46);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  backdrop-filter: blur(16px);
}

.bottom-primary-button:hover,
.bottom-secondary-button:hover {
  transform: translateY(-2px);
}

/* =========================================================
  RESPONSIVE / 响应式
========================================================= */
@media (max-width: 1180px) {
  .hero-layout {
    grid-template-columns: 1fr;
    gap: 50px;
  }

  .hero-mockup-section {
    min-height: auto;
    justify-content: center;
  }

  .hero-copy-section {
    text-align: center;
  }

  .hero-description,
  .hero-promo-card {
    margin-left: auto;
    margin-right: auto;
  }

  .phone-mockup {
    right: 4%;
  }

  .story-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
    .top-bar {
      padding: 12px 5%;
    }

    .top-bar-inner {
      grid-template-columns: auto auto;
      justify-content: space-between;
      gap: 18px;
    }

    .top-bar-nav {
      display: none;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      border-radius: 15px;
    }

    .logo-text span {
      font-size: 21px;
    }

    .logo-text small {
      display: none;
    }

  .hero-section {
    padding-top: 60px;
  }

  .desktop-mockup {
    border-width: 12px;
  }

  .mockup-body {
    grid-template-columns: 78px 1fr;
  }

  .mock-main {
    padding: 34px 26px;
  }

  .voice-grid {
    gap: 16px;
  }

  .voice-user {
    width: 76px;
    height: 76px;
    font-size: 26px;
  }

  .phone-mockup {
    display: none;
  }

  .process-grid,
  .feature-grid,
  .tech-grid {
    grid-template-columns: 1fr;
  }

  .stack-strip {
    margin-left: 6%;
    margin-right: 6%;
    padding: 32px 24px;
  }

  .story-panel-grid {
    grid-template-columns: 1fr;
  }

  .large-number {
    font-size: 110px;
  }
}

@media (max-width: 640px) {
  .top-bar-inner {
    gap: 12px;
  }

  .logo-mark {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    font-size: 13px;
  }

  .logo-text span {
    font-size: 18px;
    letter-spacing: 0.2em;
  }

  .top-bar-actions {
    gap: 8px;
  }

  .login-button {
    display: none;
  }

  .nav-cta-button {
    min-height: 40px;
    padding: 0 15px;
    font-size: 13px;
  }

  .hero-section {
    padding: 48px 5% 130px;
  }

  .hero-copy-section h1 {
    font-size: 42px;
    letter-spacing: -2px;
  }

  .hero-description {
    font-size: 17px;
  }

  .promo-bottom {
    grid-template-columns: 1fr;
  }

  .primary-action-button {
    width: 100%;
    min-width: 0;
  }

  .mockup-top {
    height: 30px;
  }

  .mockup-body {
    grid-template-columns: 64px 1fr;
  }

  .mock-sidebar {
    padding: 24px 0;
    gap: 18px;
  }

  .side-logo,
  .side-dot {
    width: 36px;
    height: 36px;
  }

  .mock-header {
    flex-direction: column;
    gap: 18px;
  }

  .mock-header h3 {
    font-size: 24px;
  }

  .mock-actions {
    display: none;
  }

  .voice-grid {
    flex-wrap: wrap;
  }

  .mock-chat {
    padding: 24px;
  }

  .stack-strip-items {
    gap: 18px;
  }

  .features-section,
  .tech-section,
  .roadmap-section,
  .story-section {
    padding: 76px 6%;
  }

  .roadmap-item {
    grid-template-columns: 1fr;
  }
}
</style>