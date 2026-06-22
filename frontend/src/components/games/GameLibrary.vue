<script setup>
/* =========================================================
   SECTION 1: Imports
   Purpose:
   - Load reusable GameCard component
   - Keep individual game card code outside GameLibrary
========================================================= */
import GameCard from "./GameCard.vue"

/* =========================================================
   SECTION 2: Emits
   Purpose:
   - Send selected game + mode up to GameStage
========================================================= */
const emit = defineEmits(["launch-game", "open-game-rooms"])
/* =========================================================
   SECTION 3: Game Catalog
   Purpose:
   - Central registry for all VOXYN game cards
   - Add / remove / edit games here only
   - id must match GameStage game component registry
   Notes:
   - ready = true means playable now
   - ready = false means preview / coming soon
========================================================= */
const games = [
  {
    id: "tic-tac-toe",
    number: "Game 1",
    title: "Tic Tac Toe",
    subtitle: "Classic 3x3 strategy duel.",
    cover: "duel",
    compactIcon: "XO",
    players: "1–2 players",
    modes: ["AI", "Multiplayer"],
    ready: true
  },
  {
    id: "falling-blocks",
    number: "Game 2",
    title: "Falling Blocks",
    subtitle: "Stack smart. Clear lines. Beat your high score.",
    cover: "grid",
    compactIcon: "▦",
    players: "1 player",
    modes: ["Single Player"],
    ready: true
  },
  {
    id: "2048",
    number: "Game 3",
    title: "2048",
    subtitle: "Merge tiles. Build higher. Reach 2048.",
    cover: "tiles",
    compactIcon: "2048",
    players: "1 player",
    modes: ["Single Player"],
    ready: true
  },
  {
    id: "minesweeper",
    number: "Game 4",
    title: "Minesweeper",
    subtitle: "Clear the board without hitting mines.",
    cover: "hex",
    compactIcon: "✦",
    players: "1 player",
    modes: ["Single Player"],
    ready: false
  },
  {
    id: "blackjack",
    number: "Game 5",
    title: "Blackjack",
    subtitle: "Hit, stand, and beat the dealer.",
    cover: "chess",
    compactIcon: "21",
    players: "1–4 players",
    modes: ["AI", "Multiplayer"],
    ready: false
  },
  {
    id: "chess",
    number: "Game 6",
    title: "Chess",
    subtitle: "Classic board strategy for serious duels.",
    cover: "orbit",
    compactIcon: "♟",
    players: "1–2 players",
    modes: ["AI", "Multiplayer"],
    ready: false
  },
  {
    id: "word-battle",
    number: "Game 7",
    title: "Word Battle",
    subtitle: "Fast typing, quick thinking, party pressure.",
    cover: "word",
    compactIcon: "Aa",
    players: "2–8 players",
    modes: ["Multiplayer"],
    ready: false
  },
  {
    id: "party-quiz",
    number: "Game 8",
    title: "Party Quiz",
    subtitle: "Answer fast and compete with the room.",
    cover: "quiz",
    compactIcon: "?",
    players: "2–8 players",
    modes: ["AI", "Multiplayer"],
    ready: false
  }
]

/* =========================================================
   SECTION 4: Launch Helpers
   Purpose:
   - Normalize launch payload format
   - Keep desktop cards and compact list using same payload shape
========================================================= */
function createLaunchPayload(game, mode) {
  return {
    gameId: game.id,
    gameTitle: game.title,
    gameNumber: game.number,
    players: game.players,
    mode: mode.toLowerCase(),
    modeLabel: mode,
    ready: game.ready
  }
}

function createRoomsPayload(game) {
  return {
    gameId: game.id,
    gameTitle: game.title,
    gameNumber: game.number,
    players: game.players,
    ready: game.ready
  }
}

function launchGame(game, mode) {
  emit("launch-game", createLaunchPayload(game, mode))
}

function launchGameFromCard(payload) {
  emit("launch-game", payload)
}

function openGameRooms(game) {
  emit("open-game-rooms", createRoomsPayload(game))
}

function openGameRoomsFromCard(payload) {
  emit("open-game-rooms", payload)
}
</script>


<template>
  <section class="game-library">
    <!-- =====================================================
        SECTION 1: Library Header
        Purpose:
        - Show Stage 2 game library title and helper text
    ====================================================== -->
    <div class="library-header">
      <div class="library-icon">
        ▦
      </div>

      <div class="library-copy">
        <h2>Game Library</h2>
        <p>Choose a game and jump in. Stay focused, stay connected.</p>
        <span>Select a mode to launch full game view. Exit anytime.</span>
      </div>
    </div>

    <!-- =====================================================
        SECTION 2: Filter / Search Tools
        Purpose:
        - Visual filter chips for future game filtering
        - Search box placeholder for future game search
    ====================================================== -->
    <div class="library-tools">
      <div class="filter-row">
        <button class="filter-chip active">▦ All Games</button>
        <button class="filter-chip">AI</button>
        <button class="filter-chip">Multiplayer</button>
        <button class="filter-chip">Party</button>
        <button class="filter-chip">Puzzle</button>
        <button class="filter-chip">Strategy</button>
      </div>

      <div class="search-box">
        ⌕
        <input placeholder="Search games..." />
      </div>
    </div>

    <!-- =====================================================
            SECTION 3: Desktop Game Grid
            Purpose:
            - Full Stage 2 view
            - 4 cards per row on large screens
        ====================================================== -->
        <div class="game-grid desktop-game-grid">
        <GameCard
            v-for="game in games"
            :key="game.id"
            :game="game"
            @launch-game="launchGameFromCard"
            @open-game-rooms="openGameRoomsFromCard"
        />
        </div>

        <!-- =====================================================
            SECTION 4: Compact Game Launcher
            Purpose:
            - Half-screen layout
            - Do not squeeze full game cards into a narrow column
            - Show clean launcher rows instead
        ====================================================== -->
        <div class="compact-game-list">
        <article
            v-for="game in games"
            :key="`compact-${game.id}`"
            class="compact-game-row"
            :class="{ ready: game.ready }"
        >
            <div
            class="compact-game-art"
            :class="`compact-${game.cover}`"
            >
            <span>{{ game.compactIcon || (game.ready ? "01" : "◇") }}</span>
            </div>

            <div class="compact-game-info">
            <p>{{ game.number }}</p>
            <h3>{{ game.title }}</h3>
            <small>{{ game.subtitle }}</small>
            <span>{{ game.players }} · {{ game.ready ? "Playable" : "Preview" }}</span>
            </div>

            <div class="compact-mode-row">
            <button
                v-for="mode in game.modes"
                :key="`compact-${game.id}-${mode}`"
                type="button"
                class="compact-mode-btn"
                :class="mode.toLowerCase()"
                @click="launchGame(game, mode)"
            >
                {{ mode === "AI" ? "🤖" : "👥" }}
                {{ mode }}
            </button>

            <button
                type="button"
                class="compact-mode-btn rooms"
                @click="openGameRooms(game)"
            >
                👁 Rooms
            </button>
            </div>
        </article>
        </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Library Shell - White Liquid Glass
   Notes:
   - Style-only change
   - Game data / launch behavior unchanged
========================================================= */
.game-library {
  width: 100%;
  min-height: 100%;
  padding: 36px 32px 98px;
  color: #0f172a;
  text-align: left;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  overflow: visible;

  border-radius: 30px;
  background:
    radial-gradient(circle at 18% 8%, rgba(96, 165, 250, 0.18), transparent 30%),
    radial-gradient(circle at 82% 12%, rgba(168, 85, 247, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(244, 248, 255, 0.72));
  backdrop-filter: blur(26px) saturate(180%);
  -webkit-backdrop-filter: blur(26px) saturate(180%);
}

/* =========================================================
   SECTION 2: Library Header
========================================================= */
.library-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.library-icon {
  width: 70px;
  height: 70px;
  flex: 0 0 70px;

  display: grid;
  place-items: center;

  border-radius: 24px;
  color: #ffffff;
  font-size: 32px;
  font-weight: 950;

  background: linear-gradient(135deg, #0a84ff, #4f46e5);
  box-shadow:
    0 20px 48px rgba(37, 99, 235, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.library-copy {
  min-width: 0;
}

.library-header h2 {
  margin: 0 0 6px;
  color: #101828;
  font-size: 36px;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.library-header p {
  margin: 0 0 7px;
  color: #667085;
  font-size: 15px;
  font-weight: 750;
}

.library-header span {
  color: #0a84ff;
  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 3: Filter / Search Tools
========================================================= */
.library-tools {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.filter-row {
  min-width: 0;

  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-chip {
  min-height: 42px;
  padding: 0 15px;

  border-radius: 15px;
  border: 1px solid rgba(15, 23, 42, 0.07);

  background: rgba(255, 255, 255, 0.62);
  color: #344054;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);

  font-family: inherit;
  font-size: 13px;
  font-weight: 900;

  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: linear-gradient(135deg, #0a84ff, #3b82f6);
  border-color: rgba(59, 130, 246, 0.26);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.18);
}

.search-box {
  width: 230px;
  min-height: 42px;
  padding: 0 14px;
  flex: 0 0 230px;

  display: flex;
  align-items: center;
  gap: 8px;

  border-radius: 15px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(15, 23, 42, 0.07);
  color: #667085;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);

  box-sizing: border-box;
}

.search-box input {
  width: 100%;
  min-width: 0;

  border: none;
  outline: none;
  background: transparent;
  color: #101828;

  font: inherit;
  font-size: 13px;
  font-weight: 800;
}

.search-box input::placeholder {
  color: #98a2b3;
}

/* =========================================================
   SECTION 4: Game Grid
========================================================= */
.game-grid {
  width: 100%;
  min-width: 0;

  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* =========================================================
   SECTION 5: Scroll Hint
========================================================= */
.scroll-hint {
  margin: 18px auto 0;
  width: fit-content;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  color: #667085;
  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 6: Compact Half-Screen Game Launcher
========================================================= */
.compact-game-list {
  display: none;
}

@media (max-width: 900px) {
  .desktop-game-grid {
    display: none;
  }

  .compact-game-list {
    display: grid;
    gap: 12px;
  }

  .game-library {
    min-height: auto;
    padding: 26px 18px 120px;
  }

  .library-header {
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .library-icon {
    width: 52px;
    height: 52px;
    flex: 0 0 52px;
    border-radius: 18px;
    font-size: 23px;
  }

  .library-header h2 {
    font-size: 27px;
  }

  .library-header p {
    font-size: 13px;
    line-height: 1.45;
  }

  .library-header span {
    display: none;
  }

  .library-tools {
    margin-bottom: 16px;
  }

  .filter-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .filter-row::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
    font-size: 12px;
  }

  .search-box {
    display: none;
  }

  .compact-game-row {
    min-width: 0;
    padding: 12px;

    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 12px;
    align-items: center;

    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.82);

    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58)),
      rgba(255, 255, 255, 0.64);

    box-shadow:
      0 18px 44px rgba(30, 64, 175, 0.10),
      inset 0 1px 0 rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(22px) saturate(180%);
    -webkit-backdrop-filter: blur(22px) saturate(180%);
  }

  .compact-game-row.ready {
    border-color: rgba(59, 130, 246, 0.28);
  }

  .compact-game-art {
    width: 76px;
    height: 76px;

    display: grid;
    place-items: center;

    border-radius: 20px;

    background:
      radial-gradient(circle at 35% 20%, rgba(96, 165, 250, 0.28), transparent 32%),
      radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.20), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,0.92), rgba(232,240,255,0.74));

    border: 1px solid rgba(255, 255, 255, 0.82);
    color: #2563eb;

    font-size: 16px;
    font-weight: 950;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.88);
  }

  .compact-game-info {
    min-width: 0;
  }

  .compact-game-info p {
    margin: 0 0 4px;
    color: #2563eb;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .compact-game-info h3 {
    margin: 0 0 4px;
    color: #101828;
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact-game-info small {
    display: block;
    margin-bottom: 5px;

    color: #667085;
    font-size: 12px;
    font-weight: 750;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact-game-info span {
    color: #98a2b3;
    font-size: 11px;
    font-weight: 850;
  }

  .compact-mode-row {
    grid-column: 1 / -1;

    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 9px;
  }

  .compact-mode-btn {
    min-height: 38px;
    padding: 0 12px;

    border: 1px solid rgba(37, 99, 235, 0.16);
    border-radius: 13px;

    color: #ffffff;
    background: linear-gradient(135deg, #0a84ff, #3b82f6);
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);

    font-family: inherit;
    font-size: 13px;
    font-weight: 950;

    cursor: pointer;
  }

  .compact-mode-btn.ai,
  .compact-mode-btn.single,
  .compact-mode-btn.player {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.10);
    border-color: rgba(37, 99, 235, 0.14);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.84);
  }

  .compact-mode-btn.multiplayer {
    background: linear-gradient(135deg, #0a84ff, #4f46e5);
  }

  .compact-mode-btn.rooms {
    color: #2563eb;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.88), rgba(239,246,255,0.74)),
      rgba(255, 255, 255, 0.68);
    border-color: rgba(37, 99, 235, 0.14);
    box-shadow:
      0 10px 20px rgba(37, 99, 235, 0.08),
      inset 0 1px 0 rgba(255,255,255,0.88);
  }

  .scroll-hint {
    display: none;
  }
}

/* =========================================================
   SECTION 7: Responsive - Half Screen / Narrow Screen
========================================================= */
@media (max-width: 760px) {
  .game-library {
    padding: 28px 18px 120px;
  }

  .library-header {
    align-items: flex-start;
    gap: 14px;
  }

  .library-icon {
    width: 54px;
    height: 54px;
    flex-basis: 54px;
    border-radius: 18px;
    font-size: 24px;
  }

  .library-header h2 {
    font-size: 28px;
  }

  .library-header p {
    font-size: 13px;
    line-height: 1.45;
  }

  .library-header span {
    font-size: 12px;
    line-height: 1.45;
  }

  .filter-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .filter-row::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 0 13px;
    font-size: 12px;
  }

  .game-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

/* =========================================================
   SECTION 8: Responsive - Very Narrow
========================================================= */
@media (max-width: 480px) {
  .game-library {
    padding: 22px 14px 120px;
  }

  .library-header {
    flex-direction: column;
  }

  .library-header h2 {
    font-size: 25px;
  }

  .search-box {
    min-height: 38px;
  }
}
</style>