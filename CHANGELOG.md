# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
