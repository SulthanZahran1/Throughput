# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Route-finding Test Suite**: A comprehensive testing harness in `src/engine/routefinding.test.ts` verifying deadlocks, item avoidance, player-robot interaction, and dynamic drift.
- **Item Avoidance Logic**: Ground items are now treated as weighted soft obstacles in A* pathfinding, so robots naturally path around them.
- **A* Pathfinding for Robots**: Robots now use A* search to navigate around obstacles and other robots.
- **Mobile-Friendly Support**: Game now works on mobile devices with responsive layout and touch controls.
  - **Tap-to-Move**: Touch/click any grid cell to walk there smoothly.
  - **Responsive Grid**: Cell sizes scale based on viewport using CSS custom properties.
  - **Stacked Layout**: Game area and order queue stack vertically on mobile.
  - **Responsive UI**: HUD, modals, and all overlays adapt to smaller screens.
  - Added `targetX`/`targetY` to Player for smooth movement toward tapped position.
  - Added `setPlayerTarget` action and smooth player movement in game tick.

### Changed
- **Upgrade System Overhaul**: Removed useless upgrades and systems, added 5 new meaningful upgrades.
  - **Removed**: Power System (budget, draw, slowdown), Zone System (zones, painting).
  - **Removed Upgrades**: Zone Slot, Magnetic, Power Boost.
  - **Added Upgrades**: Conveyor Belt (items drift to I/O), Priority Orders (robots target urgent orders), Multi-Carry (robots carry 2 items), Double XP (stackable), Order Radar (urgent orders glow).
  - Robots now use `carryingItems: Item[]` array instead of single `carrying` field.
  - Deleted `Zone.tsx` and `PowerBar.tsx` components.

- **Mobile Robot Rebrand**: Rebranded game from "crane" to "mobile robot" automation.
  - Renamed `Crane` type → `Robot`, `CraneState` → `RobotState` in types.
  - Renamed `engine/cranes.ts` → `engine/robots.ts` with all related functions.
  - Updated upgrade IDs: `faster_cranes` → `faster_robots`, `extra_crane` → `extra_robot`.
  - Renamed component `Crane.tsx` → `Robot.tsx`.
  - Updated all constants: `CRANE_*` → `ROBOT_*` in config.
  - Updated documentation in `AGENTS.md` and `prototype-plan.md`.

### Added
- Initialized frontend project with Vite + React + TypeScript.
- Added dependencies: `zustand`, `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react`.
- Implemented Phase 1: Core Feel (Completed).
  - Added Grid, Player, Item, Crane, OrderQueue components.
  - Implemented game loop and engine logic (orders, cranes, player).
  - Added basic game state management with Zustand.
  - Implemented fail state and restart functionality.

- Implemented Phase 2: Build Variety (Completed).
  - **Upgrade System**: Added UpgradeModal UI for choosing 1 of 3 upgrades on level up.
  - **Upgrade Pool**: Implemented 8 upgrades (Faster Robots, Speed Boots, Zone Slot, Longer Arms, Power Boost, Magnetic, Extra Robot, Order Extension).
  - **Power System**: Added power budget tracking with slowdown when over budget. PowerBar UI component shows status.
  - **Zone Painting**: Spacebar paints 3x3 zones at player position. Zone component renders on grid.
  - **Robot FSM**: Rewrote robot logic with proper state machine (idle, moving_to_item, picking, moving_to_port, dropping).
  - **Robot Collision**: Robots slow down when within 1.5 cells of each other.
  - Extended types: `Upgrade`, `UpgradeId`, `RobotState`, enhanced `Player`, `Robot`, `Zone`, `GameState`.
  - Added config constants for XP, power, collision, and upgrade values.

- Implemented Phase 3: Scaling & Spectacle (Completed).
  - **Order Rate Ramping**: Orders spawn faster over time (5s → 0.8s over 10 minutes).
  - **Run Timer**: Added visible timer showing progress toward 15-minute win goal.
  - **Win Condition**: "Survive the Shift" - after 15 minutes, player wins.
  - **VictoryScreen**: Celebration screen with stats (run time, orders completed, robots, level).
  - Added `hasWon` state, `TARGET_RUN_TIME` and `getOrderSpawnRate()` function to config.
  - Supports 10+ robots for late-game spectacle.

