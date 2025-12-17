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
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |

**No backend for prototype.** All state is client-side. Backend comes later if core loop works.

---

## Architecture Philosophy

1. **Engine is pure TypeScript** — No React in `/engine`. Framework-agnostic game logic.
2. **React renders, Zustand stores** — Components read from store, dispatch actions.
3. **Player-centric** — Player entity is first-class. Automation serves the player, not the other way around.
4. **Prototype speed > perfection** — Ship fast, test feel, iterate or kill.

---

## Key Entities

| Entity | Description |
|--------|-------------|
| **Player** | WASD movement, picks up items, collects XP |
| **Item** | Colored box (red/blue/green), spawns at I/O port |
| **Order** | Request for item type, has timer, fails if expired |
| **Robot** | Auto-fulfills orders in its zone, unlocked via upgrades |
| **Zone** | Painted region, affects robot behavior |
| **XP Gem** | Dropped on order complete, walk over to collect |

---

## Game State Shape

```typescript
interface GameState {
  // Player
  player: { x: number; y: number; carrying: Item | null; }
  
  // Grid
  grid: Grid;
  
  // Orders & Items
  orders: Order[];
  items: Item[]; // Items on ground (not in slots)
  
  // Automation
  robots: Robot[];
  zones: Zone[];
  
  // Progression (within run)
  xp: number;
  level: number;
  upgrades: Upgrade[];
  
  // Resources
  power: { current: number; max: number; }
  
  // Run state
  runTime: number;
  failedOrders: number;
  isGameOver: boolean;
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
│   ├── robots.ts    # Auto-fulfill logic
│   ├── upgrades.ts  # Upgrade pool, effects
│   ├── collision.ts # Robot pathing conflicts
│   └── simulation.ts# Main game tick
├── store/
│   └── gameStore.ts # Single Zustand store
├── types/
│   └── game.ts      # All interfaces
├── constants/
│   └── config.ts    # Balance numbers
└── hooks/
    ├── useGameLoop.ts
    └── useKeyboard.ts
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
  updateRobots(delta);
  checkCollisions();
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
- [x] XP drop on complete
- [x] Level up → gain 1 robot
- [x] Robot auto-fulfills (nearest)
- [x] Fail state (5 failed orders)

**Test:** Is the first robot satisfying?

### Phase 2: Build Variety (Complete)
- [x] 3 upgrade choices per level
- [x] 6-8 upgrades
- [x] Power budget
- [x] Zone painting
- [x] Robot collision

**Test:** Do different builds feel different?

### Phase 3: Scaling (Complete)
- [x] Order rate ramps
- [x] 10+ robots possible
- [x] 15-20 min runs
- [x] Win condition

**Test:** Is late-game spectacle real?

---

## Design Decisions (Locked)

| Decision | Choice |
|----------|--------|
| View | Top-down |
| Power budget UI | Prominent bar |
| Player-robot collision | No (robots pass through) |
| Item types | Colors only (red, blue, green) |

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Player movement feels laggy | Use `requestAnimationFrame`, not `setInterval` |
| Robots stacking on same order | Track which order is claimed |
| XP not collecting | Check player hitbox vs gem position |
| Upgrades not applying | Verify upgrade is in `upgrades[]` before effect |

---

## Quick Reference

```bash
cd frontend
npm install
npm run dev      # localhost:5173
npm run lint
npm run build
```

---

## When In Doubt

1. Check `prototype-plan.md` for intended scope
2. Check this file for conventions
3. If unclear: **ask the human**

**Goal:** Validate the core loop fast. Kill it or continue within 3 weeks.