# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
- `(pending)` docs(plan): mark phase 1 as complete

---

## [Initial Setup] - 2025-12-12

### Added
- Project scaffolding (Vite + React + TypeScript)
- Basic grid renderer
- Crane entity and movement animation
- Documentation: `plan.md`, `tutorial.md`, `AGENTS.md`
