# Throughput Roguelite - From-Scratch Rebuild

## Context

Throughput has a solid warehouse simulation engine but a hollow player experience. The current linear level-select model with manual controls has no replay value. The ROGUELITE_DESIGN.md describes a complete redesign as an auto-battler deckbuilder: 8-shift runs, upgrade card picks between shifts, HP as a run-wide resource, meta-progression with crate currency and card unlocks.

Rather than grafting this onto the existing codebase, we're building from scratch using the same stack (React + TypeScript + Zustand + Vite + Framer Motion + Tailwind). The existing engine logic serves as reference for the simulation mechanics but will be rewritten with seeded RNG, multi-crane support, and upgrade/modifier flags built in from the start.

**Step 0**: Delete all contents of `frontend/src/` before starting Phase 1. Keep `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig*.json`, `frontend/index.html` — only wipe `src/`.

---

## Frontend Structure

```
frontend/src/
├── main.tsx                        # React entry point
├── App.tsx                         # Screen router via uiStore.currentScreen
├── index.css                       # Tailwind imports
│
├── engine/                         # Pure simulation (NO React/Zustand)
│   ├── index.ts                    # Barrel export
│   ├── types.ts                    # All engine types
│   ├── rng.ts                      # Seeded PRNG (Mulberry32)
│   ├── simulation.ts               # tickSimulation(context, dt) -> TickResult
│   ├── crane.ts                    # Crane FSM: IDLE/MOVING/TRANSFERRING
│   ├── storage.ts                  # Zone-based storage slot resolution
│   ├── retrieval.ts                # FIFO/deadline/nearest retrieval
│   ├── orders.ts                   # Order generation & deadline expiration
│   ├── grid.ts                     # Grid creation, blocked cells, inventory
│   ├── shift.ts                    # Shift param generation (escalation + modifiers + upgrades)
│   ├── score.ts                    # Score computation
│   └── __tests__/                  # Unit tests for each module
│
├── data/                           # Static game data (readonly definitions)
│   ├── upgrades.ts                 # 25 upgrade card definitions
│   ├── modifiers.ts                # 9 modifier definitions
│   ├── escalation.ts               # 8-shift parameter table
│   └── milestones.ts               # Milestone definitions
│
├── store/                          # Zustand stores
│   ├── uiStore.ts                  # Screen navigation, animation flags
│   ├── gameStore.ts                # Current shift simulation state
│   ├── runStore.ts                 # Current run (HP, upgrades, shift #, seed)
│   └── metaStore.ts                # Persistent progression (crates, unlocks, milestones)
│
├── hooks/
│   ├── useGameLoop.ts              # requestAnimationFrame -> tickSimulation bridge
│   └── useShiftEnd.ts              # Detects shift end (time=0 or HP=0)
│
├── components/
│   ├── screens/
│   │   ├── MainMenuScreen.tsx
│   │   ├── PreShiftScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── UpgradePickScreen.tsx
│   │   ├── VictoryScreen.tsx
│   │   ├── RunOverScreen.tsx
│   │   └── UnlockShopScreen.tsx
│   ├── game/
│   │   ├── Grid.tsx                # Renders slots + crane overlay
│   │   ├── Slot.tsx                # Single grid cell
│   │   ├── Crane.tsx               # Animated crane (Framer Motion)
│   │   ├── OrderList.tsx           # Active orders with countdowns
│   │   ├── HpBar.tsx               # Heart counter with damage/heal flash
│   │   ├── ShiftTimer.tsx          # Countdown bar
│   │   ├── ModifierBanner.tsx      # Active modifier strip
│   │   └── BuildIcons.tsx          # Current upgrade icons row
│   ├── cards/
│   │   ├── UpgradeCard.tsx         # Single card (name, effect, rarity)
│   │   └── CardOffering.tsx        # 3-card pick layout
│   └── ui/
│       ├── Button.tsx
│       ├── ScreenTransition.tsx    # AnimatePresence wrapper
│       ├── StatRow.tsx
│       └── CrateCounter.tsx
│
├── constants/
│   ├── config.ts                   # Tuning constants
│   ├── colors.ts                   # Color palette
│   └── itemColors.ts               # ItemType -> CSS color
│
├── utils/
│   ├── coordinates.ts              # toKey/fromKey/distance helpers
│   └── formatters.ts               # Time/score formatting
│
└── api/
    └── client.ts                   # Backend API client (meta sync, run submission)
```

---

## Backend Changes

The existing Go backend (Gin + PostgreSQL) needs new tables and endpoints for the roguelite model. The old `levels` table and `progress` table are replaced.

### New Database Schema

```sql
-- 003_roguelite_meta.sql (new migration, replaces old tables)

-- Drop old tables
DROP TABLE IF EXISTS progress;
DROP TABLE IF EXISTS levels;

-- Player meta-progression (one row per device)
CREATE TABLE meta (
    device_id       TEXT PRIMARY KEY,
    crates          INTEGER NOT NULL DEFAULT 0,
    unlocked_cards  JSONB NOT NULL DEFAULT '[]',    -- UpgradeId[]
    milestones      JSONB NOT NULL DEFAULT '[]',    -- string[]
    best_scores     JSONB NOT NULL DEFAULT '{}',    -- {normal: number, hard: number, brutal: number}
    best_shift      INTEGER NOT NULL DEFAULT 0,
    total_runs      INTEGER NOT NULL DEFAULT 0,
    total_wins      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run history (one row per completed/failed run)
CREATE TABLE runs (
    id                    SERIAL PRIMARY KEY,
    device_id             TEXT NOT NULL REFERENCES meta(device_id),
    seed                  INTEGER NOT NULL,
    difficulty            TEXT NOT NULL DEFAULT 'normal',
    shifts_survived       INTEGER NOT NULL,
    total_orders_completed INTEGER NOT NULL,
    total_orders_failed   INTEGER NOT NULL,
    final_hp              INTEGER NOT NULL,
    max_hp                INTEGER NOT NULL,
    score                 INTEGER NOT NULL,
    upgrades_held         JSONB NOT NULL DEFAULT '[]',
    won                   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_runs_device_id ON runs(device_id);
CREATE INDEX idx_runs_score ON runs(score DESC);
```

### New API Endpoints

Replace the old levels/progress endpoints:

```
GET  /api/meta?deviceId={id}          -> MetaResponse (crates, unlocked cards, milestones, stats)
PUT  /api/meta?deviceId={id}          -> Update meta (sync from client after run)
POST /api/runs                        -> Submit completed run result
GET  /api/leaderboard?difficulty={d}  -> Top scores (future, not blocking)
```

Keep existing:
```
GET  /health
GET  /api/ping
POST /api/log
```

Remove:
```
GET  /api/levels        (shifts are generated client-side)
GET  /api/levels/:id
GET  /api/progress
POST /api/progress/:levelId
```

### Backend File Changes

```
backend/
├── cmd/server/
│   ├── main.go                  # Update: remove level seeder, register new routes
│   ├── migrations/
│   │   ├── 001_create_levels.sql    # Keep for migration ordering
│   │   ├── 002_create_progress.sql  # Keep for migration ordering
│   │   └── 003_roguelite.sql        # NEW: drop old tables, create meta + runs
│   └── seeder.go                # DELETE (no more level seeding)
│   └── levels/                  # DELETE (no more level JSON files)
│
├── internal/
│   ├── api/
│   │   ├── router.go            # UPDATE: new route registrations
│   │   ├── meta.go              # NEW: GetMeta, UpdateMeta handlers
│   │   ├── runs.go              # NEW: SubmitRun handler
│   │   ├── levels.go            # DELETE
│   │   ├── progress.go          # DELETE
│   │   ├── logger.go            # KEEP
│   │   └── frontlog.go          # KEEP
│   │
│   ├── models/
│   │   ├── meta.go              # NEW: Meta struct, MetaResponse
│   │   ├── run.go               # NEW: Run struct, RunSubmission
│   │   ├── level.go             # DELETE
│   │   └── progress.go          # DELETE
│   │
│   ├── services/
│   │   ├── meta.go              # NEW: GetMeta, UpdateMeta, EnsureDevice
│   │   ├── runs.go              # NEW: SubmitRun (also updates meta stats)
│   │   ├── levels.go            # DELETE
│   │   └── progress.go          # DELETE
│   │
│   └── storage/
│       ├── postgres.go          # KEEP
│       ├── meta.go              # NEW: meta table queries
│       ├── runs.go              # NEW: runs table queries
│       ├── level.go             # DELETE
│       └── progress.go          # DELETE
```

### Backend Data Models (Go)

```go
// models/meta.go
type Meta struct {
    DeviceID      string          `json:"deviceId"`
    Crates        int             `json:"crates"`
    UnlockedCards []string        `json:"unlockedCards"`
    Milestones    []string        `json:"milestones"`
    BestScores    map[string]int  `json:"bestScores"`   // difficulty -> score
    BestShift     int             `json:"bestShift"`
    TotalRuns     int             `json:"totalRuns"`
    TotalWins     int             `json:"totalWins"`
}

// models/run.go
type RunSubmission struct {
    DeviceID            string   `json:"deviceId"`
    Seed                int      `json:"seed"`
    Difficulty          string   `json:"difficulty"`
    ShiftsSurvived      int      `json:"shiftsSurvived"`
    TotalOrdersCompleted int     `json:"totalOrdersCompleted"`
    TotalOrdersFailed   int     `json:"totalOrdersFailed"`
    FinalHp             int      `json:"finalHp"`
    MaxHp               int      `json:"maxHp"`
    Score               int      `json:"score"`
    UpgradesHeld        []string `json:"upgradesHeld"`
    Won                 bool     `json:"won"`
    CratesEarned        int      `json:"cratesEarned"`
}
```

### Sync Strategy

- **Primary**: Client-side localStorage (metaStore with Zustand persist) — game works offline
- **Secondary**: Backend sync — fire-and-forget on run completion
  - `POST /api/runs` submits the run result
  - Backend's SubmitRun handler also updates the meta table (adds crates, updates stats, checks milestones)
  - On app load, `GET /api/meta` fetches server state and merges with local (take max of each field)
  - Same merge strategy as the existing progressStore: `max(local, server)` for crates, union for unlocked cards/milestones

---

## Key Architecture Decisions

### 1. Seeded RNG everywhere
Every random decision (order generation, item selection, modifier picks, card offerings, blocked cell placement) uses a Mulberry32 seeded PRNG. The RNG state is threaded through all functions and stored in context. Same seed = identical run.

### 2. Pure engine with event output
`tickSimulation(context, dt) -> TickResult` remains pure. Instead of callbacks, it returns `SimulationEvent[]` (ORDER_CREATED, ORDER_COMPLETED, ORDER_FAILED, ITEM_STORED, etc.). The React layer processes these events for HP updates and UI effects.

### 3. Upgrades applied before shifts, not during
`generateShiftParameters()` takes the escalation table entry + modifier + held upgrades and produces a fully resolved `ShiftParameters`. The engine reads `SimulationFlags` from these params but never modifies them mid-tick.

### 4. Four stores with clear ownership
- **uiStore**: Screen navigation only
- **gameStore**: Per-shift simulation state (reset each shift)
- **runStore**: Per-run state - HP, upgrades, shift progression (reset each run)
- **metaStore**: Persistent across runs - crates, unlocks, milestones (localStorage + backend sync)

### 5. Multi-crane from day one
`SimulationContext.cranes: Crane[]` instead of a single crane. The FSM ticks each crane independently. Simple slot reservation prevents collisions (each crane's target is off-limits to others).

---

## Store Design

### uiStore
```
State: currentScreen, previousScreen, hpFlash
Screens: main_menu | pre_shift | game | upgrade_pick | victory | run_over | unlock_shop
```

### gameStore
```
State: shiftNumber, shiftParameters, shiftTime, realTime, isPaused,
       grid, cranes[], orders[], zones[], retrievalMode, stats,
       lastOrderTime, rng
Actions: initializeShift(params, rng), setSimulationState(updates),
         setPaused(bool), reset()
```

### runStore
```
State: isActive, seed, difficulty, rng, currentShift (1-8), hp, maxHp,
       upgrades: HeldUpgrade[], usedModifiers[], shiftResults[],
       currentModifier, nextModifier, offeredCards[3], rerollsRemaining
Actions: startRun(seed, difficulty), advanceToNextShift(),
         applyShiftResult(result, events), pickUpgrade(id),
         generateOffering(), damageHp(n), healHp(n), endRun() -> RunResult
```

### metaStore (persisted to localStorage + backend sync)
```
State: crates, unlockedCards[], milestones[], bestScores{},
       bestShift, totalRuns, totalWins, deviceId
Actions: addCrates(n), spendCrates(n), unlockCard(id),
         completeMilestone(id), recordRun(result), getUnlockedPool(),
         syncFromBackend(), syncToBackend()
```

---

## Run Flow

```
Main Menu -> startRun(seed, difficulty)
  -> Pre-Shift (shift 1, no modifier)
    -> Begin Shift -> generateShiftParameters() -> initializeShift()
      -> Game Screen (simulation runs, events collected)
        -> Shift ends (time=0) -> applyShiftResult(events)
          -> if shift < 8: generateOffering() -> Upgrade Pick
            -> pickUpgrade() -> advanceToNextShift() -> Pre-Shift
          -> if shift = 8: endRun() -> Victory Screen
        -> HP hits 0 -> endRun() -> Run Over Screen
      -> Victory/Run Over -> metaStore.recordRun() + POST /api/runs
```

---

## Build Order (13 Phases)

### Phase 0: Cleanup
- Delete all contents of `frontend/src/`
- Delete `backend/cmd/server/levels/`, `backend/cmd/server/seeder.go`
- Keep config files (package.json, vite, tsconfig, index.html)
- Create fresh `frontend/src/main.tsx` + `index.css` stubs

### Phase 1: Seeded RNG + Engine Types
- `engine/rng.ts` - Mulberry32: createRng, nextFloat, nextInt, nextItem, nextWeighted, shuffle
- `engine/types.ts` - All types: Grid, Slot, Item, Crane, Order, Zone, SimulationContext, SimulationFlags, TickResult, SimulationEvent, ShiftParameters, ShiftResult
- Tests proving determinism

### Phase 2: Grid + Crane + Storage + Retrieval
- `engine/grid.ts` - createGrid(params, rng) with blocked cells and initial inventory
- `engine/crane.ts` - FSM with id, configurable transferTime, afterburner support
- `engine/storage.ts` - Zone-priority slot resolution, smartSorting flag
- `engine/retrieval.ts` - FIFO/deadline/nearest modes
- Unit tests for each

### Phase 3: Order Generation
- `engine/orders.ts` - Seeded order generation with VIP, timeWarp, emergencyBrake, zoneMastery
- Tests proving determinism and flag behavior

### Phase 4: Simulation Tick
- `engine/simulation.ts` - tickSimulation assembling all modules, multi-crane, dualCommand, predictivePathing, overclocked, conveyorBelt
- `engine/index.ts` - Public API barrel export
- Full simulation integration tests

### Phase 5: Data Layer + Shift Generation
- `data/upgrades.ts` - 25 card definitions
- `data/modifiers.ts` - 9 modifier definitions
- `data/escalation.ts` - 8-shift parameter table
- `data/milestones.ts` - Milestone definitions
- `engine/shift.ts` - generateShiftParameters(), applyModifier(), applyUpgrades()
- `engine/score.ts` - computeScore()
- Tests verifying upgrade/modifier application

### Phase 6: Zustand Stores + Utilities
- `store/uiStore.ts`, `store/gameStore.ts`, `store/runStore.ts`, `store/metaStore.ts`
- `constants/config.ts`, `constants/colors.ts`, `constants/itemColors.ts`
- `utils/coordinates.ts`, `utils/formatters.ts`
- Unit tests for store actions

### Phase 7: Game Loop + Shift End Detection
- `hooks/useGameLoop.ts` - rAF bridge to tickSimulation
- `hooks/useShiftEnd.ts` - Watches shiftTime and HP, triggers transitions

### Phase 8: Core Screens - Main Menu + Pre-Shift + Game
- `App.tsx` - Screen router with AnimatePresence
- `MainMenuScreen.tsx`, `PreShiftScreen.tsx`, `GameScreen.tsx`
- `Grid.tsx`, `Slot.tsx`, `Crane.tsx`, `OrderList.tsx`, `HpBar.tsx`, `ShiftTimer.tsx`, `ModifierBanner.tsx`, `BuildIcons.tsx`
- `ui/Button.tsx`, `ui/ScreenTransition.tsx`
- First playable shift end-to-end

### Phase 9: Upgrade Pick + Victory + Run Over
- `UpgradePickScreen.tsx`, `VictoryScreen.tsx`, `RunOverScreen.tsx`
- `UpgradeCard.tsx`, `CardOffering.tsx`, `StatRow.tsx`
- First complete run end-to-end

### Phase 10: Unlock Shop + Meta-Progression
- `UnlockShopScreen.tsx`, `CrateCounter.tsx`
- Milestone checks on run completion
- Crate earning/spending flow

### Phase 11: Backend - New Schema + APIs
- `backend/cmd/server/migrations/003_roguelite.sql` - New migration
- `backend/internal/models/meta.go`, `models/run.go` - New models
- `backend/internal/storage/meta.go`, `storage/runs.go` - New queries
- `backend/internal/services/meta.go`, `services/runs.go` - New services
- `backend/internal/api/meta.go`, `api/runs.go` - New handlers
- Update `router.go` and `main.go` - Wire new routes, remove old
- Delete old level/progress files
- `frontend/src/api/client.ts` - Backend API client
- Wire metaStore.syncFromBackend() on app load, syncToBackend() on run end

### Phase 12: Screen Transitions + Polish
- AnimatePresence transitions between all screens
- HP flash animations (red damage, green heal)
- Card flip/glow on upgrade pick
- Shift start/end effects

### Phase 13: Difficulty Tiers + Seeded Runs
- Difficulty selection on main menu (Normal/Hard/Brutal)
- Seed input for shareable runs
- Per-difficulty best score tracking

---

## Verification

After each phase:
- **Phases 1-5**: `npm run test` - all engine unit tests pass
- **Phase 6**: `npm run test` - store unit tests pass
- **Phase 8**: `npm run dev` - can start a run, see pre-shift, begin shift, watch simulation with HP
- **Phase 9**: `npm run dev` - complete a full 8-shift run with upgrade picks, see victory/run-over
- **Phase 10**: `npm run dev` - earn crates, unlock cards, see them in next run's offerings
- **Phase 11**: `docker-compose up` - backend serves new APIs, frontend syncs meta on load
- **Phase 13**: `npm run dev` - seeded runs produce identical modifier/card sequences
