# AGENTS.md — Throughput (Roguelike Prototype)

Guidelines for AI coding agents working on this project.

---

## Core Rules

1. **Ask before deciding.** Do not make architectural decisions without human input.
2. **Atomic commits.** Never commit half-done or non-compiling code.
3. **Terminal-first debugging.** Use terminal and logs, not browser DevTools.
4. **Keep docs updated.** Update `prototype-plan.md` or this file as needed.
5. **No orphan TODOs.** If you add a TODO, note it in prototype-plan.md.
6. **Log work in CHANGELOG.md.** After every commit, add an entry.

---

## Project Overview

**Throughput** is a roguelike survivor game set in a warehouse.

**Core loop:** You start as a worker manually hauling boxes. Survive long enough to unlock robots, conveyors, and zones. By late game, your automation empire obliterates orders instantly.

**Genre:** VS-like survivor + factory builder

**Current phase:** Prototype (Phase 3 — Complete)

See `docs/prototype-plan.md` for scope, upgrades, and success criteria.

---

## Tech Stack (Prototype)

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Backend (Telemetry) | Rust (Axum) |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |

**Minimal Backend for Telemetry.** A small Rust service (`agv-logger`) persists pathfinding data for performance analysis. Core game state remains client-side.

---

## Architecture Philosophy

1. **Engine is pure TypeScript** — No React in `/engine`. Framework-agnostic game logic.
2. **React renders, Zustand stores** — Components read from store, dispatch actions.
3. **Player-centric** — Player entity is first-class. Automation serves the player, not the other way around.
4. **Data-Driven Optimization** — Routefinding telemetry is collected to identify and resolve bottlenecks.

---

## Key Entities

| Entity | Description |
|--------|-------------|
| **Player** | WASD or Tap-to-move, picks up items, collects XP |
| **Item** | Colored box, spawns in a ring around the central I/O port |
| **Order** | Request for item type, has timer, fails if expired |
| **Robot** | Auto-fulfills nearest orders, unlocked via upgrades |
| **I/O Port** | Central hub for deliveries, dynamically centered |
| **Routefinding Portal** | Manages modular algorithms (A*, etc.) and telemetry |
| **XP Gem** | Generated on order completion (internal logic) |
| **Floating XP** | Satisfying reward pops on delivery (automated & manual) |
| **Conveyor** | Items on ground drift toward center (ghost path visuals) |
| **Surge (Rush Hour)** | Period high-intensity events (2x spawns, 3x XP rewards) |
| **Map Scaling** | Grid expands every 3m (12x12 → 20x20) |

---

## Game State Shape

```typescript
interface GameState {
  // Player
  player: { x: number; y: number; carrying: Item | null; }
  
  // Grid
  grid: Grid;
  gridSize: number; // Dynamic size (12 to 20)
  
  // Orders & Items
  orders: Order[];
  items: Item[]; // Items on ground (not in slots)
  
  // Automation
  robots: Robot[];
  
  // Progression (within run)
  xp: number;
  level: number;
  upgrades: Upgrade[];
  
  // Run state
  runTime: number;
  failedOrders: number;
  isGameOver: boolean;
  hasWon: boolean;
}
```

---

## File Structure (Prototype)

```
frontend/src/
├── components/
│   ├── game/        # Grid, Player, Robot, Item, Order
│   ├── ui/          # Button, ProgressBar, UpgradeModal
│   └── screens/     # GameScreen, GameOver, StartMenu
├── engine/          # Pure game logic
│   ├── player.ts    # Movement, pickup, deliver
│   ├── orders.ts    # Spawn, timers, fail
│   ├── robots.ts    # Auto-fulfill logic, portal search usage
│   ├── routefinding.ts # IRouteFinder, Portal, TelemetryStore
│   ├── astar.ts     # A* implementation (Modular)
│   ├── upgrades.ts  # Upgrade pool, effects
│   ├── collision.ts # Robot slowing logic
│   └── simulation.ts# Main game tick
├── store/
│   └── gameStore.ts # Single Zustand store
├── types/
│   └── game.ts      # All interfaces
├── constants/
│   └── config.ts    # Balance numbers (Surge settings)
└── hooks/
    ├── useGameLoop.ts
    └── useKeyboard.ts

fleet/               # Backend & Simulation Engine (Rust/React)
├── crates/          # Rust packages
│   ├── agv-core/    # Simulation logic
│   ├── agv-wasm/    # WASM bindings
│   └── agv-logger/  # Telemetry logger
└── web/             # Portfolio Visualizer (Independent)
```

---

## Code Guidelines

### TypeScript / React

1. **No `any`.** Fix types properly.
2. **State in Zustand.** Component useState only for ephemeral UI (hover, focus).
3. **Engine has no React imports.** Pure functions only.
4. **Consistent style.** Run `eslint --fix` before commit.

### Tailwind

1. **Tailwind-first.** No custom CSS unless necessary.
2. **Dark mode only.** No light mode variants.

### Game Loop

```typescript
// 60 FPS target
function tick(delta: number) {
  updatePlayer(delta);
  updateOrders(delta);
  updateRobots(delta); // Handles A* pathing and cell reservations
  // Player also uses A* for tap-to-move navigation
  checkLevelUp();
  checkGameOver();
}
```

---

## Prototype Phases

### Phase 1: Core Feel (Complete)
- [x] Player movement (WASD)
- [x] Item spawns at I/O port
- [x] Orders with timers
- [x] Manual pickup/deliver
- [x] XP reward on complete (Instant)
- [x] Level up → gain 1 robot
- [x] Robot auto-fulfills (nearest)
- [x] Fail state (5 failed orders)

**Test:** Is the first robot satisfying?

### Phase 2: Build Variety (Complete)
- [x] 3 upgrade choices per level
- [x] 6-8 upgrades
- [x] Robot collision
- [x] Mobile support (Tap-to-move)

**Test:** Do different builds feel different?

### Phase 3: Scaling (Complete)
- [x] Order rate ramps
- [x] 10+ robots possible
- [x] 15-20 min runs
- [x] Win condition

**Test:** Is late-game spectacle real?

### Phase 5: Roguelike Depth (Complete)
- [x] **Dynamic Map Scaling**: Grid expands over time.
- [x] **Centered I/O Port**: Fairer balancing for items and robots.
- [x] **Anti-Death-Spiral**: Order throttling and baseline recycling.
- [x] **Rebalanced Meta**: Meaningful upgrade buffs and tighter early game.

**Test:** Does the run feel like it has a distinct arc?

---

## Design Decisions (Locked)

| Decision | Choice |
|----------|--------|
| View | Top-down |
| Mobile controls | Tap-to-Move + WASD (Portrait Optimized) |
| Player-robot collision | Yes (player blocked by robots) |
| Item types | Colors only (red, blue, green) |

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Player movement feels laggy | Use `requestAnimationFrame`, not `setInterval` |
| Robots stacking on same order | Track which order is claimed |
| XP not rewarding | Check order completion logic vs XP gain |
| Upgrades not applying | Verify upgrade is in `upgrades[]` before effect |

---

## Quick Reference

```bash
cd frontend
npm install
npm run dev      # localhost:5173
npm run lint
npm run build
npx tsx src/engine/routefinding.test.ts # Run route-finding tests
npx tsx src/engine/fairness.test.ts     # Run fairness enforcement tests
```

---

## When In Doubt

1. Check `prototype-plan.md` for intended scope
2. Check this file for conventions
3. If unclear: **ask the human**

**Goal:** Validate the core loop fast. Kill it or continue within 3 weeks.