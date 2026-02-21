# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Updated `plan.md` to include Phase 3.5 (Architecture Refactor) and reference `REFACTOR_PLAN.md`
- Adjusted timeline for Phases 4-6 to accommodate refactoring work

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
