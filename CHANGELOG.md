# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Issue completion pass: Phase 4/5/vertical-slice glue** — Completed the remaining gameplay gaps behind the open GitHub issues.
  - Added contract/debt upgrades (`hostile_sla`, `debt_financing`) that opt players into explicit contract orders with visible breach damage/rewards.
  - Enabled same-type batch order spawning from Shift 3, and Shift 2+ VIP pressure without requiring the old `vip_clients` gate.
  - Implemented stackable upgrade effects for crane speed, transfer time, shift time, and deadline length.
  - Added rarity-weighted upgrade offerings, prerequisite filtering, real rerolls, resolved held-upgrade metadata, and next-shift preview UI.
  - Replaced the placeholder unlock shop with a functional crate-based unlock screen.
  - Applied difficulty EP recovery tuning (Normal 100%, Hard 80%, Brutal 60%), Time Warp deadline drain, and Emergency Brake one-shot save.
  - Synced run HP from engine integrity so variable breach damage and integrity abilities carry across shifts correctly.

### Added
- **Phase 3: Mobile-First UI** — Complete mobile-first responsive UI for the hybrid operations-manager gameplay
  - `components/game/TopHUD.tsx` — Compact top bar with Shift number, countdown timer, System Integrity chunks, Emergency Power meter, Queue load, and Policy indicator
  - `components/game/MobileOperationsBoard.tsx` — Operations board for mobile with Flow Status (input/output/storage), Zone Summaries (fullness % + risk labels), and Crane Task Board (per-crane job status)
  - `components/game/ExpandableOrderStrip.tsx` — Always-visible critical order strip showing top 3 highest-risk orders with compact cards; expandable full queue with order diagnostics (ETA, bottleneck, breach risk) and ability preview integration (24→11 · SAVES)
  - `components/game/BottomActionBar.tsx` — Bottom action bar with 6 buttons: Policy, Priority Override (35 EP), Turbo Crane (35 EP), Deadline Freeze (60 EP), Reject Contract (1 HP), Core Surge (1 HP); each shows cost, disabled state, and active indicators
  - `components/game/PolicyPickerSheet.tsx` — Bottom sheet policy picker with icon, description, cooldown display, and active state for all 6 automation policies
  - `components/game/IntegrityActionConfirmSheet.tsx` — Confirmation sheet for Reject Contract and Core Surge, showing net integrity gain/loss and HP-after calculation
  - `store/uiStore.ts` — Added Phase 3 state: selectedAbility, showPolicyPicker, showConfirmSheet, confirmAction, confirmTargetOrderId, isOrderStripExpanded with corresponding actions
  - `components/screens/GameScreen.tsx` — Rewritten with mobile-first responsive layout: mobile (TopHUD → OpsBoard → OrderStrip → ActionBar) and desktop (lg+) with detailed grid + order panel + stats panel; integrated ability activation via engine simulation (activateAbility, switchSimulationPolicy) with correct ability ID mapping
- **Phase 2: Core Abilities** — Playable emergency action layer for the hybrid operations-manager loop
  - `engine/simulation.ts` — Added `activateAbility()` dispatcher plus concrete Priority Override, Turbo Crane, Deadline Freeze, Reject Contract, and Core Surge activation paths
  - Priority Override spends 35 EP, safely interrupts only eligible cranes, assigns the selected order immediately, and returns current/projected ETA metadata
  - Turbo Crane spends 35 EP for a 7s global speed boost; Deadline Freeze spends 60 EP and pauses order timers for 4s while shift time/cranes continue
  - Reject Contract spends 1 System Integrity and removes the selected order; Core Surge spends 1 System Integrity for a stronger 6s global speed boost
  - `engine/ability-preview.ts` — Fixed preview cloning so Map-backed grids survive what-if ETA projections and aligned SAVES/RISK/NO EFFECT outcome tags with the design spec
  - `engine/eta-service.ts` — Fixed policy queue-position ETA calculation so selected-order previews compare against real queue order
  - `engine/__tests__/abilities.test.ts` — Added focused coverage for all five abilities, preview helpers, freeze timer behavior, safe interruption, and ABILITY_USED events
- **Phase 1: Simulation Foundations** — Complete implementation of all 8 subsystems for the hybrid operations-manager game design
  - `engine/types.ts` — Expanded types: AutomationPolicy enum, full order taxonomy (VIP/Batch/Contract), variable breach damage, Emergency Power system, order diagnostics (bottleneck labels), exact ETA types, ability preview types, safe interruption model
  - `engine/policy.ts` — 6-policy automation system with cooldown switching, policy-based order sorting, crane assignment integration
  - `engine/order-taxonomy.ts` — VIP order creation, batch parent/child bundles, contract orders with variable breach damage
  - `engine/ep-system.ts` — Emergency Power resource: spend/recover, streak tracking, VIP/queue-clear recovery triggers
  - `engine/diagnostics.ts` — Order bottleneck labels (ALL CRANES BUSY, NO MATCHING ITEM, NO STORAGE SPACE, INPUT BLOCKED, OUTPUT CONGESTED, LOW DEADLINE, VIP RISK) and system-level diagnostics
  - `engine/eta-service.ts` — Exact ETA prediction computing travel/transfer/queue time with ON TRACK/LIKELY BREACH/BLOCKED designations
  - `engine/ability-preview.ts` — Projection hooks for Priority Override, Turbo, Freeze, Reject, Core Surge abilities
  - `engine/simulation.ts` — Integrated policy cooldown, variable breach damage, EP tracking, integrity-based shift end, ability ticking, speed multipliers
  - `engine/crane.ts` — Safe interruption model (isCraneInterruptible, interruptCrane, interruptMultipleCranes), speed multiplier support
  - `store/gameStore.ts` — Synced new state fields: currentPolicy, policyCooldownRemaining, ep, epMax, integrity, maxIntegrity
- **Design Specification** — Complete `THROUGHPUT-DESIGN.md` defining the hybrid operations-manager game: emergency abilities, exact ETA, policy system, mobile-first operations board, upgrade/contract system, difficulty curves
- **Phase Planning Issues** — 6 GitHub issues created covering all implementation phases:
  - #1: Phase 1 — Simulation Foundations (policy, taxonomy, economy, ETA)
  - #2: Phase 2 — Core Abilities (5 emergency actions)
  - #3: Phase 3 — Mobile-First UI (operations board, action bar)
  - #4: Phase 4 — Upgrades and Contracts (roguelite layer)
  - #5: Phase 5 — Balance and Tuning (difficulty curves)
  - #6: First Vertical Slice (3-shift integrated milestone)
- **Phase 11: Backend Roguelite Persistence** - New schema and APIs for roguelite meta-progression and run history
  - `backend/cmd/server/migrations/003_roguelite.sql` - Drops old levels/progress tables, creates meta + runs tables with indexes
  - `backend/internal/models/meta.go` - Meta, MetaResponse, MetaUpdate structs
  - `backend/internal/models/run.go` - Run, RunSubmission structs with cratesEarned
  - `backend/internal/storage/meta.go` - GetMeta, UpsertMeta, EnsureMeta, UpdateMetaBestScores queries
  - `backend/internal/storage/runs.go` - InsertRun, GetRunsByDevice queries
  - `backend/internal/services/meta.go` - GetMeta, UpdateMeta with union/merge strategy
  - `backend/internal/services/runs.go` - SubmitRun inserts run + updates meta stats atomically
  - `backend/internal/api/meta.go` - GET /api/meta, PUT /api/meta handlers
  - `backend/internal/api/runs.go` - POST /api/runs handler
  - Updated `api/router.go` - New route registration for meta/runs instead of levels/progress
  - Updated `cmd/server/main.go` - Wire new services, add PUT to CORS methods, remove old level/progress wiring
  - Deleted old files: levels.go, progress.go (api, services, storage, models)
- **Phase 11: Frontend API Sync** - Offline-friendly backend sync
  - `frontend/src/api/client.ts` - API client with GET /api/meta, PUT /api/meta, POST /api/runs
  - `frontend/src/api/index.ts` - Barrel export
  - `App.tsx` - Sync meta from backend on mount
  - `VictoryScreen.tsx`, `RunOverScreen.tsx` - Fire-and-forget POST /api/runs on run end with cratesEarned
- **Deployment Config** - Fixed docker-compose.yml DATABASE_URL password masking artifact
- **Docs** - This CHANGELOG entry per AGENTS.md requirements

### Fixed
- **Run Progression Order Totals** - Restored order completion/failure tracking in engine stats
  - `completeOrder()` now increments `ordersCompleted`
  - `updateOrders()` now increments `ordersFailed` for expired orders
  - `createSimulationContext()` now persists `orderDeadlineBase` into runtime context
  - `trySpawnOrder()` now uses shift-specific `orderDeadlineBase` instead of a hardcoded default
  - Hard-mode spawn scaling was tuned to preserve difficulty pressure without granting a free extra completion in 1-second simulation steps

- **Multiple Crane Assignment Bug** - Fixed issue where multiple cranes could be assigned the same order
  - Root cause: `assignJobsToCranes()` filtered unassigned orders once, then iterated through all available cranes
  - Each crane got the same "best" order because assigned orders weren't removed from the pool
  - Solution: Filter out assigned orders from `sortedOrders` after each successful job assignment
  - Added 2 new integration tests to verify unique order-to-crane mapping

### Added
- **Manhattan/Grid-Based Crane Movement** - Cranes now move only horizontally or vertically (no diagonals)
  - New `movingAxis` field on `Crane` type tracks current movement direction ('x', 'y', or null)
  - Cranes move horizontally first, then vertically to reach targets
  - Ensures realistic warehouse robot movement patterns
  - Updated `moveTowards()` function with axis-locked movement logic

- **Job-Based Crane FSM** - Complete redesign of crane state machine
  - New `TransferJob` type encapsulates full job lifecycle
  - Job phases: `MOVING_TO_SOURCE` → `ACQUIRING` → `MOVING_TO_DEST` → `DEPOSITING`
  - Crane never goes IDLE while holding an item with a job
  - Automatic transition from pickup to delivery - no gaps
  - `createTransferJob()` - Factory for creating jobs
  - `assignJob()` - Assigns job to IDLE crane
  - Updated all crane states: `IDLE`, `MOVING_TO_SOURCE`, `ACQUIRING`, `MOVING_TO_DEST`, `DEPOSITING`

- **Crane State Display** - System logs now show real-time crane status
  - `GameScreen.tsx` displays each crane's current state
  - States: STANDBY (idle), MOVING, ACQUIRING (picking up), DEPOSITING (dropping off), HOLDING
  - Color-coded status: yellow (holding), blue (moving), cyan (acquiring), green (depositing)
  - Transfer progress percentage shown during ACQUIRING/DEPOSITING

- **Robust Integration Tests** - Added comprehensive integration test suite
  - `engine/__tests__/integration.test.ts` - 18 integration tests
  - Tests for full order lifecycles (store and retrieve)
  - Tests for crane assignment, pickup, and dropoff
  - Tests for orphaned crane handling
  - Tests for edge cases (rapid spawning, shift timeout)

### Fixed
- **Shift Transition Loading Bug** - Fixed game stuck on "Loading..." after picking upgrade
  - Root cause: `PreShiftScreen` navigated to 'game' without initializing simulation context
  - Solution: Added `handleBeginOperation()` to `PreShiftScreen` that initializes shift before navigation
  - Uses same initialization logic as `MainMenuScreen` for consistency

- **3x Slower Game Time** - Fixed critical timing bug caused by unstable callbacks
  - Root cause: `onTick`, `onShiftEnd`, `onHpLoss` callbacks recreated every render
  - These were in `useGameLoop` dependency array, causing effect restart every render
  - Effect restart reset `lastTimeRef.current = 0`, losing that frame's delta time
  - React StrictMode + frequent re-renders = ~2/3 of frames lost = 3x slower
  - Solution: Wrapped all callbacks in `useCallback` in `GameScreen.tsx`

- **Timing Architecture** - Fixed delta time handling to prevent time loss during lag
  - Removed hard `maxDelta` cap that was dropping time on tab switches
  - Implemented proper fixed timestep with catch-up: up to 10 steps per frame
  - Accumulator now caps at 10× targetDelta instead of discarding excess time
  - Creates brief "slow motion" effect during catch-up instead of losing game time
  - `useGameLoop.ts` now processes multiple ticks per frame when behind

- **Shift End Transition** - Fixed game freezing after shift ends
  - Moved shift end handling directly into `GameScreen.tsx` via `handleShiftEnd` callback
  - Eliminated race condition between `useGameLoop` and `useShiftEnd` effect
  - `onShiftEnd` now directly triggers navigation to upgrade pick / victory / run over screens
  - **Added missing `generateOffering` call** - Card offerings are now generated before navigating to upgrade pick screen
  
- **Shift End Detection** - Fixed shift not transitioning when timer hits zero
  - `useGameLoop.ts` now calls `onTick` to update store with final context before stopping loop
  
- **Store Order Item Spawning** - Items now spawn in input slots when store orders are created
  - `createStoreOrder()` now places item in available input slot
  - Crane assignment uses `sourceSlotKey` to find the correct input slot
  - Prevents "robot stuck on acquiring" issue
  
- **Orphaned Crane Handling** - Cranes with expired orders no longer get stuck
  - `isAvailable()` now clears stale order assignments
  - `assignTasksToCranes()` handles orphaned items (crane holding item with no valid order)
  - Orphaned items are automatically sent to storage

- **Store Order Completion** - Fixed crane getting stuck after pickup
  - `assignTasksToCranes()` now continues store orders to storage after pickup
  - Crane with `taskType='store'` and `reservedKey` automatically moves to storage slot
  - Fixes the "stuck in HOLDING" issue for store orders

- **Order Completion Matching** - Fixed retrieve order completion logic
  - `handleDropoff()` now properly matches orders by ID first, then falls back to item type
  - Ensures orders complete even when crane's order ID doesn't match

### Changed
- Updated `plan.md` to include Phase 3.5 (Architecture Refactor) and reference `REFACTOR_PLAN.md`
- Adjusted timeline for Phases 4-6 to accommodate refactoring work

### Test Summary
- **128 total unit tests** (added 18 integration tests, 2 new crane tests)
- All tests passing

## [Roguelite Rebuild Phases 0-3] - 2026-02-24

### Added
- **Phase 0: Cleanup**: Deleted all contents of `frontend/src/` and old backend files
  - Removed old levels, progress tables, seeder code
  - Created fresh directory structure

- **Phase 1: Seeded RNG + Engine Types**
  - `engine/rng.ts` - Mulberry32 seeded PRNG with full test coverage
    - Deterministic sequence from same seed
    - `nextFloat`, `nextInt`, `nextItem`, `nextWeighted`, `shuffle`, `fork`
  - `engine/types.ts` - Complete type definitions
    - Grid, Slot, Zone, Crane, Order, Item types
    - SimulationFlags for upgrades/modifiers
    - SimulationContext, TickResult, SimulationEvent
    - ShiftParameters, ShiftResult, RunState, MetaState
  - 22 unit tests for RNG proving determinism

- **Phase 2: Grid + Crane + Storage + Retrieval**
  - `engine/grid.ts` - Grid creation with zones and blocked cells
    - Input/output area generation
    - Zone-based storage with priority system
    - Initial inventory placement
  - `engine/crane.ts` - Crane FSM (IDLE/MOVING/TRANSFERRING)
    - Move and transfer timing
    - Target reservation for collision avoidance
    - Afterburner speed support
  - `engine/storage.ts` - Zone-priority storage logic
    - Smart sorting by zone priority
    - Zone mastery for item-type zones
    - Load balancing across zones
  - `engine/retrieval.ts` - Three retrieval modes
    - FIFO (oldest first)
    - Deadline (closest to output)
    - Nearest (to crane position)
  - 57 unit tests for grid, crane, storage, retrieval

- **Phase 3: Order Generation**
  - `engine/orders.ts` - Order lifecycle management
    - Store and retrieve order generation
    - VIP orders with shorter deadlines
    - Automatic store/retrieve balance based on utilization
    - Order priority scoring and sorting
    - Deadline tracking and expiration
  - 16 unit tests for order management

### Test Summary
- **95 total unit tests** across all engine modules
- All tests passing with deterministic behavior verified

## [Roguelite Rebuild Phases 4-8] - 2026-02-24

### Added
- **Phase 4: Simulation Tick**
  - `engine/simulation.ts` - Main game loop
  - `createSimulationContext()` - Initialize simulation
  - `tickSimulation()` - Advance simulation by delta time
  - Order spawning, crane assignment, event generation
  - Shift end detection

- **Phase 5: Data Layer**
  - `data/upgrades.ts` - 18 upgrade definitions with rarity/cost
  - `data/modifiers.ts` - 9 challenge modifiers
  - `data/escalation.ts` - 8-shift difficulty progression table
  - `data/milestones.ts` - Achievement system

- **Phase 6: Zustand Stores**
  - `store/uiStore.ts` - Screen navigation, pause state
  - `store/gameStore.ts` - Per-shift simulation state
  - `store/runStore.ts` - Run-wide state (HP, upgrades, modifiers)
  - `store/metaStore.ts` - Persistent progression (crates, unlocks)
  - `utils/coordinates.ts` - Position/distance helpers
  - `utils/formatters.ts` - Time/number formatting

- **Phase 7: Game Loop**
  - `hooks/useGameLoop.ts` - RAF bridge to tickSimulation
  - `hooks/useShiftEnd.ts` - Detects shift end, transitions screens

- **Phase 8: Core Screens**
  - `components/screens/MainMenuScreen.tsx` - Start runs, view stats
  - `components/screens/GameScreen.tsx` - Grid, orders, stats
  - `App.tsx` - Screen router with AnimatePresence
  - Placeholder screens for Pre-Shift, Upgrade Pick, Victory, Run Over

### Build
- Production build compiles successfully
- 351KB bundle size (gzipped: 112KB)

### Test Summary (Final)
- **107 total unit tests**
- All tests passing

## [Phase 3.5] - 2026-02-21

### Added
- **New Engine Structure**: Created framework-agnostic game engine in `/engine`
  - `types.ts` - Core engine types (no React dependencies)
  - `simulation.ts` - Main tick function, pure state transformation
  - `crane.ts` - Crane movement and state machine
  - `storage.ts` - Storage decision logic (from decision.ts)
  - `retrieval.ts` - Retrieval decision logic (from decision.ts)
  - `orders.ts` - Order generation and deadline checking
  - `index.ts` - Public API exports
- **Unit Tests**: Added 50 tests for engine functions
  - `storage.test.ts` - 6 tests for storage slot selection
  - `retrieval.test.ts` - 7 tests for retrieval strategies
  - `orders.test.ts` - 12 tests for order management
  - `crane.test.ts` - 15 tests for crane state machine
  - `simulation.test.ts` - 10 tests for simulation integration
- **Test Infrastructure**: Added Vitest test runner with `npm test`

### Changed
- **Refactored gameStore.ts**: Removed 400+ lines of game logic
  - Eliminated `tick()` method (moved to engine)
  - Store now only manages state and simple setters
  - Added `setSimulationState()` for bulk updates from engine
- **Updated useGameLoop.ts**: Now calls engine instead of store
  - Gets simulation context from store
  - Calls `tickSimulation()` from engine
  - Updates store with new state via `setSimulationState()`
- **Deleted decision.ts**: Logic moved to engine modules

### Technical Details
- Engine is pure TypeScript with no React/Zustand dependencies
- All engine functions are pure (same input → same output)
- State flows: Store → Engine → New State → Store Update
- Build passes with strict TypeScript settings

## [Phase 4] - 2025-12-12
 
 ### Added
 - **Backend Scaffolding**: Initialized Go module `throughput-backend`.
 - **Logging**: Implemented structured logging with `slog` and Gin middleware.
 - **Server**: Basic HTTP server setup on port 8080.
 
 ---

## [Phase 3] - 2025-12-12

### Added
- **Level Definition System**: `types/level.ts` with LevelDefinition, OrderWave, StarThreshold, UserProgress, and ShiftResult types.
- **10 Campaign Levels**: Act 1 (tutorial, L1-5) and Act 2 (automation, L6-10) in `data/levels/`.
- **Progress Store**: `store/progressStore.ts` with localStorage persistence.
- **Level Select Screen**: Grid-based level selection with star display and unlock logic.
- **Shift Summary Screen**: Post-shift results with stats, stars, and navigation.
- **loadLevel Action**: `gameStore` can now initialize from level definitions.
- **getShiftResult Action**: Calculates win/lose, JPH, and star ratings.
- **Auto Order Generation**: Orders spawn automatically based on level's `orderSchedule`.
- **End-of-Shift Detection**: Game detects win/lose and navigates to summary screen.

### Changed
- Updated `App.tsx` with level select and shift summary routing.
- Main menu now routes to level select instead of directly to game.
- GameScreen shows shift timer countdown and level name.
- Removed manual "+ Order" button (orders are now automatic).
- Added `bgSecondary` color to color constants.

---
 
 ## [Phase 2] - 2025-12-12

### Added
- **Zone System**: Create, edit, and delete zones with custom colors and priorities.
- **Zone Editor**: Overlay UI for painting zones on the grid and configuring rules.
- **Decision Engine**: Automated crane logic for storage (respecting zones) and retrieval.
- **Automation Controls**: Toggles for Retrieval Mode (FIFO, Deadline, Nearest) and Crane Mode.
- **Visuals**: Zone overlays on grid slots.

### Changed
- Updated `GameScreen` to include "Zones" toggle and new "Controls" panel.
- Enhanced `Grid` and `Slot` components to support painting interactions.
- Integrated automation logic into the main game loop (`gameStore.tick`).

---

## [Phase 1] - 2025-12-12

### Added
- Core game loop with `tick` system in `gameStore`
- Crane actions: `pickupFromIO`, `storeAt`, `retrieveFrom`, `deliverToIO`
- Order generation system with deadlines
- Basic UI: Order queue, Stats panel, Info panel
- Manual controls: Pause/Resume, + Order button
- `useGameLoop` hook for time-based updates

### Changed
- Updated `AGENTS.md` to reference this changelog
- Updated `task.md` to reflect Phase 1 completion

### Commits
- `b37acd3` feat(engine): implement core game loop and manual controls
- `a4f0276` docs(agents): update implementation plan with phase 1 details
- `02359b7` docs: move implementation log to CHANGELOG.md
- `8d32361` docs(plan): mark phase 1 as complete

---

## [Initial Setup] - 2025-12-12

### Added
- Project scaffolding (Vite + React + TypeScript)
- Basic grid renderer
- Crane entity and movement animation
- Documentation: `plan.md`, `tutorial.md`, `AGENTS.md`
