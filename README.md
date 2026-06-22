# VOXYN

**VOXYN** is a real-time voice room and mini-game social platform built with Vue, Node.js, Express, Socket.IO, WebRTC, Supabase, and custom email OTP authentication.

The project started as a Discord-inspired room system and gradually evolved into a full-stack social platform prototype with authentication, user profiles, real-time rooms, WebRTC voice communication, room-based game launching, and a polished Apple-style glass UI.

> Current milestone: **v1.0**
> Status: Feature-frozen for v1.0. Future development will focus on stabilization, deeper synchronization, MySQL migration, Docker deployment, and self-hosting.

---

## Project Overview

VOXYN was designed as a lightweight social platform where users can create rooms, invite friends, communicate through voice, and play small interactive games inside shared spaces.

The core idea is simple:

```txt
Create Room → Invite Friends → Join Voice → Open Game Library → Play or Watch
```

Instead of building a static website, VOXYN focuses on real-time interaction. The project combines frontend UI, backend APIs, socket events, authentication, profile data, WebRTC voice, and mini-game systems into one connected experience.

---

## Key Features

### Authentication

* Custom email OTP signup flow.
* 6-digit email verification code.
* Express backend handles OTP generation and verification.
* OTP expiration and resend cooldown.
* Supabase used as the account and profile storage layer for v1.0.
* SMTP email delivery tested through Gmail App Password.
* Slider Security Verification added before OTP requests to reduce spam and repeated email sending.

### User System

* Login and signup pages.
* Profile data flow.
* Display name, avatar, and status structure.
* Dashboard entry after authentication.
* Room identity connected to user profile information.

### Room System

* Create room.
* Join room by room code.
* Room workspace layout.
* Room owner / member display.
* Invite code copy.
* Room status and user presence foundation.
* Socket.IO-based room state management.

### Voice System

* WebRTC voice connection flow.
* Socket.IO signaling.
* Microphone control.
* Mute / deafen / leave voice controls.
* Voice room integration inside Room Workspace.
* HTTPS testing through Cloudflare Quick Tunnel for external device testing.

### Game System

VOXYN v1.0 includes three playable games:

* **Tic Tac Toe**
* **Falling Blocks**
* **2048**

The v1.0 game system includes:

* Game Library.
* Game Stage.
* Game cards.
* Game launch flow.
* Room / Watch / Join concept structure.
* Basic session UI foundation.

Full synchronized spectator gameplay is planned for a later version. For v1.0, the priority is to complete the core product flow rather than endlessly adding games.

### UI / UX

* Apple-style white glass design direction.
* Frosted panels.
* Rounded cards.
* Clean dashboard layout.
* Room workspace structure.
* Game library cards.
* Security verification modal.
* Consistent visual identity across the main product pages.

---

## Tech Stack

### Frontend

* Vue 3
* Vite
* JavaScript
* CSS
* Component-based UI structure

### Backend

* Node.js
* Express
* Socket.IO
* Nodemailer SMTP
* Custom OTP authentication endpoints

### Realtime / Communication

* Socket.IO for room state, chat/presence structure, and signaling
* WebRTC for voice communication

### Database / Storage

* Supabase Auth / Database / Storage for v1.0
* Custom backend logic layered on top of Supabase

### Testing / Development

* Local development through Vite and Express
* Cloudflare Quick Tunnel for HTTPS and external device testing
* Multi-device testing for voice and room behavior

---

## Development Journey

VOXYN was developed through multiple staged milestones. The project did not start as a complete platform. It grew step by step from a basic room concept into a real-time full-stack prototype.

---

### Early Stage: Project Setup

The project began with a separated structure:

```txt
frontend/
backend/
docs/
```

The frontend was created with Vite and Vue. The backend was built with Node.js and Express. The goal at this stage was to create a clean foundation for a future social-room application.

The initial focus was not on advanced features. The first goal was to make sure the project had a maintainable structure and could support future modules such as authentication, profiles, rooms, chat, voice, and games.

---

### Room Concept Stage

The first major product idea was:

```txt
User creates a room → system generates a room code → friends join the same room
```

This became the foundation of VOXYN.

The room system was designed around a shared `room_code`, rather than creating a separate server instance for each room. This allowed multiple rooms to exist under one backend while keeping users separated by room state.

Core room goals included:

* Create room.
* Join room.
* Display room code.
* Show room members.
* Support real-time updates.
* Prepare the space for chat, voice, and games.

At this stage, VOXYN started becoming more than a simple website. It became a real-time room-based application.

---

### Dashboard and Profile Stage

After the room idea became clear, the project moved toward building a usable product flow.

The Dashboard became the main landing area after login. It was designed to show room access, recent room activity, and entry points into the room system.

Profile work was also introduced so users could have a consistent identity inside VOXYN. The profile system helped prepare the app for real-time presence, room member lists, avatars, and display names.

This stage helped connect the basic pages into one application flow:

```txt
Login → Dashboard → Create / Join Room → Room Workspace
```

---

### Socket.IO Realtime Stage

Socket.IO was introduced to support real-time room behavior.

The backend started handling events such as:

* User joining a room.
* User leaving a room.
* Broadcasting room member changes.
* Sending room history.
* Syncing user status.
* Preparing event channels for chat, voice, and games.

This was one of the most important architecture steps because it turned VOXYN from a static frontend/backend app into a real-time application.

The project started to use the backend as a central event coordinator.

---

### WebRTC Voice Stage

After room and socket logic were working, VOXYN added WebRTC voice communication.

This required two major systems to work together:

```txt
Socket.IO → signaling
WebRTC → peer-to-peer audio connection
```

Socket.IO was used to exchange signaling messages such as offers, answers, and ICE candidates. WebRTC handled the actual voice connection between users.

This stage included:

* Microphone access.
* Joining voice.
* Leaving voice.
* Muting.
* Deafening.
* Voice peer synchronization.
* Testing across different devices.
* HTTPS testing through Cloudflare Tunnel.

This was one of the most complex parts of VOXYN because browser microphone access and WebRTC behavior require HTTPS and careful state handling.

---

### Stage Layout and Room Workspace

The room page evolved into a larger workspace.

The Room Workspace became the central place for:

* Room info.
* Voice controls.
* Member list.
* Game launcher.
* Focus/game area.
* Room actions.

The layout was gradually improved from a basic room page into a more complete product interface.

The project also explored a Stage-style layout where users could focus on voice and game interaction in a larger room environment.

---

### Authentication Upgrade Stage

The original signup flow was not enough for the intended product direction, so VOXYN moved toward a custom email OTP system.

The new signup flow became:

```txt
User enters email
→ Security slider verification
→ Backend sends 6-digit OTP
→ User verifies code
→ Backend creates user through Supabase admin flow
```

This introduced a more production-style authentication experience.

The backend added:

* OTP generation.
* OTP hashing.
* OTP expiration.
* Resend cooldown.
* Email existence checking.
* SMTP email delivery.
* Supabase user creation after verification.

Gmail SMTP App Password was eventually confirmed working for real email delivery.

This stage made VOXYN feel much closer to a real application instead of a simple demo.

---

### Slider Security Verification Stage

To reduce repeated OTP requests and prevent abuse, VOXYN added a slider verification modal before sending signup email codes.

The user must drag a square into the target slot before the frontend calls the OTP request endpoint.

This improved the signup flow in two ways:

* It made the product feel more polished.
* It added a lightweight protection layer before email sending.

The verification was intentionally kept simple for v1.0, but it created a stronger user experience and a better authentication flow.

---

### UI Redesign Stage

VOXYN went through multiple UI revisions.

The final v1.0 direction became:

```txt
White glass
Apple-style panels
Soft shadows
Rounded cards
Clean spacing
Minimal premium interface
```

Several pages were redesigned or polished, including:

* Home
* Login
* Signup
* Dashboard
* Profile
* RoomView
* GameLibrary
* GameStage

The goal was not only to make the project functional, but also to make it look like a real product.

Advanced motion design and animations are planned for later versions, but they are not required for v1.0.

---

### Game System Stage

The mini-game system was added after the room and voice foundations were already in place.

The goal was not simply to add random games. The goal was to make games part of the VOXYN room experience.

The final v1.0 game scope includes:

```txt
Tic Tac Toe
Falling Blocks
2048
```

Each game represents a different product direction:

| Game           | Purpose                                  |
| -------------- | ---------------------------------------- |
| Tic Tac Toe    | Multiplayer / turn-based game concept    |
| Falling Blocks | Arcade / single-player game concept      |
| 2048           | Puzzle / lightweight casual game concept |

The game architecture includes:

* Game Library cards.
* Game Stage rendering.
* Game selection.
* Single-player and multiplayer direction.
* Room / Watch / Join concept.
* Basic session presentation.

During development, Minesweeper and other games were considered, but v1.0 was intentionally feature-frozen at three games to avoid endless scope expansion.

---

### Spectator and Session Exploration

VOXYN explored a spectator system where users could watch friends playing games inside rooms.

The intended future flow is:

```txt
Player starts a game
→ Server creates game session
→ Friends see active room
→ Friends join as spectators
→ Game state syncs from player to watchers
```

For v1.0, the UI and session direction were explored, but full synchronized spectator gameplay is postponed.

This decision keeps v1.0 stable and prevents the project from becoming too large before the first release milestone.

---

## Version Milestones

### v0.4

* Express backend and Socket.IO room foundation.
* Basic join / leave logic.
* Room event broadcasting.
* Early real-time room structure.

### v0.46

* Profile system became a more stable identity source.
* Display name, avatar, and user status direction became clearer.
* Profile data started connecting better with room behavior.

### v0.5

* WebRTC voice system entered the main development path.
* Voice room logic started becoming part of the Room Workspace.

### v0.52

* HTTPS testing through Cloudflare Tunnel.
* Remote audio testing became possible.
* External device testing helped validate the WebRTC direction.

### v0.53

* Improved voice join / leave behavior.
* Fixed several channel and voice-state issues.
* Voice flow became more reliable.

### v0.6

* Login and Signup UI improved.
* Dashboard moved toward a more complete product layout.
* The app started feeling less like separate pages and more like one platform.

### v0.61

* Dashboard and room layout continued to improve.
* Room workspace became more central to the product.
* Stage-style UI direction began forming.

### v0.63

* Stage layout became more advanced.
* Fullscreen / focus-style room experience was explored.
* Voice controls and room UI became more connected.

### v0.71

* Game system became component-based.
* Game Library and GameStage direction became clearer.
* Mini-games became part of the core VOXYN scope.

### v0.73

* Falling Blocks was added.
* The project gained an arcade-style game.
* Difficulty, board layout, and gameplay UI were improved.

### v0.75

* Unified game session direction began.
* Tic Tac Toe and Falling Blocks became part of a shared game-stage structure.
* Player slots, spectators, and room-scoped game concepts were explored.

### v0.751

* Custom email OTP signup backend was introduced.
* Express backend started handling OTP request and verification.
* Supabase remained the account/profile storage layer.
* Signup flow moved away from simple direct Supabase signup.

### v0.752

* OTP backend and frontend were mostly wired together.
* Supabase admin user creation flow was connected.
* SMTP testing and email delivery debugging became the main focus.

### v0.753

* SMTP authentication debugging continued.
* Brevo SMTP configuration was tested.
* The project confirmed that the email flow required proper SMTP account activation or a working provider.

### v0.755

* Gmail SMTP App Password setup succeeded.
* Real verification emails were successfully sent.
* Custom OTP registration became practically usable.

### v0.8

* Custom signup authentication became a confirmed milestone.
* VOXYN had two working registration paths:

  * Frontend signup flow.
  * Express backend OTP verification and Supabase user creation.
* Authentication became one of the strongest technical parts of the project.

### v0.801

* UI stabilization became the priority.
* White Apple-style liquid glass direction was applied more seriously.
* Room and auth debugging were cleaned up.
* Local testing issues between frontend and backend URLs were identified and fixed.

### v0.82

* Slider Security Verification was completed.
* Signup now requires slider verification before requesting OTP.
* The authentication flow became more polished and more resistant to repeated email requests.

### v0.9

* Game session layout direction became clearer.
* GameStage started carrying session-level UI such as:

  * Back to Library
  * Watch
  * Player role/status
  * Join slot
  * Reset
  * Room Info
  * Players
  * Spectators
* The project moved toward a complete v1.0 structure.

### v0.91

* Final v1.0 game scope was reviewed.
* Minesweeper and additional games were postponed.
* 2048, Tic Tac Toe, and Falling Blocks became the final v1.0 game set.
* The project shifted from feature expansion to stabilization.

### v1.0

VOXYN reached its first stable product milestone.

v1.0 includes:

* Main product flow.
* Authentication.
* Custom email OTP.
* Slider verification.
* Dashboard.
* Profile direction.
* Room system.
* Socket.IO realtime layer.
* WebRTC voice.
* Game Library.
* Game Stage.
* Three playable games.
* Apple-style glass UI direction.
* Basic session and spectator structure.

v1.0 is not the final architecture, but it is the first complete product version.

---

## Current v1.0 Scope

VOXYN v1.0 is focused on proving the complete product concept.

### Included in v1.0

* User authentication.
* Email OTP signup.
* Security slider verification.
* Dashboard.
* Profile system.
* Room creation and joining.
* Realtime Socket.IO room layer.
* WebRTC voice communication.
* Game Library.
* Game Stage.
* Tic Tac Toe.
* Falling Blocks.
* 2048.
* Polished white glass UI direction.

### Deferred After v1.0

* Full synchronized spectator gameplay.
* Deeper game-state authority on the backend.
* More games such as Minesweeper, Blackjack, Chess, or Gomoku.
* Docker deployment.
* MySQL migration.
* Self-hosted architecture.
* Advanced animation system.
* Production-grade permission system.
* TURN server setup for more reliable WebRTC networking.

---

## Architecture Overview

```txt
Frontend: Vue 3 + Vite
        ↓
Express Backend
        ↓
Socket.IO Realtime Layer
        ↓
Supabase Auth / Database / Storage
        ↓
SMTP Email OTP
        ↓
WebRTC Voice Connections
```

The backend is responsible for:

* API routes.
* OTP requests.
* OTP verification.
* SMTP email delivery.
* Socket.IO room events.
* WebRTC signaling.
* Game session coordination foundation.

The frontend is responsible for:

* UI rendering.
* Authentication pages.
* Dashboard.
* Room workspace.
* Voice controls.
* Game library.
* Game rendering.
* User interaction state.

---

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Default frontend development URL:

```txt
http://localhost:5173
```

### Backend

```bash
cd backend
npm install
node server.js
```

Default backend development URL:

```txt
http://localhost:3001
```

---

## Environment Variables

The backend uses environment variables for Supabase, OTP security, SMTP email, and allowed frontend origins.

Example structure:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

OTP_PEPPER=
OTP_DEV_FALLBACK=false

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

CLIENT_URLS=http://localhost:5173
```

Sensitive values should never be committed to GitHub.

---

## Development Notes

This project was built through repeated iteration, debugging, and feature refactoring.

Major technical challenges included:

* Connecting Vue frontend state with Express backend routes.
* Building a custom OTP system instead of relying only on default Supabase signup.
* Debugging SMTP providers and authentication.
* Handling local frontend/backend URL mismatch.
* Testing WebRTC voice through HTTPS.
* Managing Socket.IO room state.
* Designing room-based game architecture.
* Keeping game scope controlled for v1.0.
* Maintaining a consistent UI style across many pages.

The project intentionally keeps v1.0 focused. More advanced features are planned, but v1.0 is treated as the first complete milestone rather than the final version.

---

## Roadmap

### v1.1

* Bug fixes.
* Room polish.
* GameStage cleanup.
* Better mobile layout.
* Improved spectator UI.
* More stable game session handling.

### v1.2

* More mini-games.
* Minesweeper or Blackjack.
* Improved game state synchronization.
* Better room discovery experience.

### v2.0

* Migrate away from Supabase dependency.
* Add MySQL backend.
* Dockerize frontend, backend, and database.
* Create a self-hosted deployment structure.
* Improve backend APIs and data persistence.
* Add stronger permission and security logic.

### v3.0

* Explore desktop game launcher direction.
* Allow users to import local game folders.
* Scan local executables.
* Build private game library launcher flow.
* Separate web social layer from desktop launcher layer.

---

## What I Learned

Through VOXYN, I practiced building a real full-stack application that combines frontend, backend, realtime networking, authentication, voice communication, and interactive UI.

Key learning areas:

* Vue component structure.
* Express backend API design.
* Socket.IO event architecture.
* WebRTC signaling and voice behavior.
* Supabase admin/user flow.
* SMTP email delivery.
* OTP authentication design.
* Real-time room state.
* UI/UX iteration.
* Debugging frontend/backend integration.
* Scope control and version planning.

VOXYN helped me understand that building a product is not only about writing isolated features. It is about connecting systems together into a usable flow.

---

## Final v1.0 Summary

VOXYN v1.0 is a functional real-time voice room and mini-game social platform prototype.

It includes:

* Authentication.
* Custom OTP signup.
* Security verification.
* User dashboard.
* Room workspace.
* Socket.IO real-time behavior.
* WebRTC voice.
* Game library.
* Three playable mini-games.
* Polished Apple-style glass UI.

v1.0 marks the first complete product milestone. Future versions will focus on synchronization, infrastructure, deployment, and deeper backend architecture.

