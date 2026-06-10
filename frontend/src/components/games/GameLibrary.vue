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
const emit = defineEmits(["launch-game"])

/* =========================================================
   SECTION 3: Game Catalog
   Purpose:
   - Central registry for all VOXYN game cards
   - Add / remove / edit games here only
   - Future games should be added as new objects below
   Notes:
   - id must match GameStage game component registry
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
    players: "1 player",
    modes: ["Single Player"],
    ready: false
  },
  {
    id: "game-3",
    number: "Game 3",
    title: "Game 3",
    subtitle: "Plan, adapt, dominate.",
    cover: "orbit",
    players: "2–6 players",
    modes: ["AI", "Multiplayer"],
    ready: false
  },
  {
    id: "game-4",
    number: "Game 4",
    title: "Game 4",
    subtitle: "Outsmart your opponents.",
    cover: "hex",
    players: "2–4 players",
    modes: ["Multiplayer"],
    ready: false
  },
  {
    id: "game-5",
    number: "Game 5",
    title: "Coming Soon",
    subtitle: "More VOXYN games later.",
    cover: "chess",
    players: "1–2 players",
    modes: ["AI"],
    ready: false
  },
  {
    id: "game-6",
    number: "Game 6",
    title: "Coming Soon",
    subtitle: "More VOXYN games later.",
    cover: "word",
    players: "2–8 players",
    modes: ["Multiplayer"],
    ready: false
  },
  {
    id: "game-7",
    number: "Game 7",
    title: "Coming Soon",
    subtitle: "More VOXYN games later.",
    cover: "race",
    players: "2–4 players",
    modes: ["Multiplayer"],
    ready: false
  },
  {
    id: "game-8",
    number: "Game 8",
    title: "Coming Soon",
    subtitle: "More VOXYN games later.",
    cover: "quiz",
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
    mode,
    modeLabel: mode
  }
}

function launchGame(game, mode) {
  emit("launch-game", createLaunchPayload(game, mode))
}

function launchGameFromCard(payload) {
  emit("launch-game", payload)
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
            <span>{{ game.ready ? "01" : "◇" }}</span>
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
            </div>
        </article>
        </div>
  </section>
</template>

<style scoped>
/* =========================================================
   SECTION 1: Library Shell
   Purpose:
   - Main Game Library container
   - Keep content scroll-safe inside Stage 2
========================================================= */
.game-library {
  width: 100%;
  min-height: 100%;
  padding: 36px 32px 98px;
  color: #e5edff;
  text-align: left;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
}

/* =========================================================
   SECTION 2: Library Header
   Purpose:
   - Game Library title area
   - Icon + heading + helper text
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

  border-radius: 22px;
  color: #bfdbfe;
  font-size: 32px;
  font-weight: 950;

  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 22px 54px rgba(37, 99, 235, 0.3);
}

.library-copy {
  min-width: 0;
}

.library-header h2 {
  margin: 0 0 6px;
  color: white;
  font-size: 36px;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.library-header p {
  margin: 0 0 7px;
  color: #c7d2fe;
  font-size: 15px;
  font-weight: 750;
}

.library-header span {
  color: #60a5fa;
  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 3: Filter / Search Tools
   Purpose:
   - Category chips
   - Search input
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

  border-radius: 13px;
  border: 1px solid rgba(148, 163, 184, 0.22);

  background: rgba(15, 23, 42, 0.6);
  color: #dbeafe;

  font-family: inherit;
  font-size: 13px;
  font-weight: 900;

  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border-color: rgba(96, 165, 250, 0.76);
}

.search-box {
  width: 230px;
  min-height: 42px;
  padding: 0 14px;
  flex: 0 0 230px;

  display: flex;
  align-items: center;
  gap: 8px;

  border-radius: 14px;
  background: rgba(2, 6, 23, 0.46);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #93c5fd;

  box-sizing: border-box;
}

.search-box input {
  width: 100%;
  min-width: 0;

  border: none;
  outline: none;
  background: transparent;
  color: #dbeafe;

  font: inherit;
  font-size: 13px;
  font-weight: 800;
}

.search-box input::placeholder {
  color: #64748b;
}

/* =========================================================
   SECTION 4: Game Grid
   Purpose:
   - Full screen: 4 cards per row
   - Medium screen: 2 cards per row
   - Half / narrow screen: 1 card per row
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

  color: #94a3b8;
  font-size: 13px;
  font-weight: 850;
}

/* =========================================================
   SECTION 6: Compact Half-Screen Game Launcher
   Purpose:
   - Full screen uses card grid
   - Half screen uses compact launcher rows
   - Prevent ugly squeezed vertical card layout
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
    padding: 26px 18px 96px;
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
    border-radius: 17px;
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

    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.22);

    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.48)),
      rgba(2, 6, 23, 0.42);

    box-shadow: 0 18px 46px rgba(2, 6, 23, 0.26);
  }

  .compact-game-row.ready {
    border-color: rgba(96, 165, 250, 0.38);
  }

  .compact-game-art {
    width: 76px;
    height: 76px;

    display: grid;
    place-items: center;

    border-radius: 18px;

    background:
      radial-gradient(circle at 35% 20%, rgba(96, 165, 250, 0.44), transparent 32%),
      radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.34), transparent 34%),
      linear-gradient(135deg, #020617, #172554);

    border: 1px solid rgba(96, 165, 250, 0.22);
    color: #bfdbfe;

    font-size: 16px;
    font-weight: 950;
  }

  .compact-game-info {
    min-width: 0;
  }

  .compact-game-info p {
    margin: 0 0 4px;
    color: #60a5fa;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .compact-game-info h3 {
    margin: 0 0 4px;
    color: white;
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

    color: #94a3b8;
    font-size: 12px;
    font-weight: 750;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact-game-info span {
    color: #64748b;
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

    border: none;
    border-radius: 12px;

    color: white;
    background: linear-gradient(135deg, #2563eb, #3b82f6);

    font-family: inherit;
    font-size: 13px;
    font-weight: 950;

    cursor: pointer;
  }

  .compact-mode-btn.multiplayer {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
  }

  .scroll-hint {
    display: none;
  }
}


/* =========================================================
   SECTION 7: Responsive - Half Screen / Narrow Screen
   Purpose:
   - Prevent the broken squeezed card layout
   - Switch to one card per row
   - Make filter row horizontally scrollable
========================================================= */
@media (max-width: 760px) {
  .game-library {
    padding: 28px 18px 96px;
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
   Purpose:
   - Extra safety for extremely small split-screen width
========================================================= */
@media (max-width: 480px) {
  .game-library {
    padding: 22px 14px 96px;
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
/* =========================================================
   SECTION 9: Stage 2 Scroll Safety
   Purpose:
   - Make GameLibrary content scroll correctly inside RoomView game-area
   - Prevent content from being clipped in half-screen mode
========================================================= */
.game-library {
  overflow: visible;
}

@media (max-width: 900px) {
  .game-library {
    min-height: auto;
    padding-bottom: 120px;
  }

  .compact-game-list {
    padding-bottom: 24px;
  }
}

</style>