# Throughput: Roguelike Prototype
### *From Box Hauler to Automation God*

---

## 1. Core Concept

**One sentence:** You start as a warehouse worker manually hauling boxes; you end commanding a chaotic fleet of mobile robots and conveyors that obliterate orders the instant they spawn.

**Core fantasy:** "I built this."

**Genre:** Roguelike survivor (VS-like) + factory builder

---

## 2. Roguelike Structure

### 2.1 Run Structure

| Element | Description |
|---------|-------------|
| **Run length** | 15-20 minutes |
| **Death** | Too many failed orders (5) |
| **Restart** | Full reset, keep meta-unlocks |
| **Scaling** | Order volume increases every minute |

### 2.2 Upgrade System

**During run:**
- XP drops from completed orders
- Walk over XP to collect
- Level up → pick 1 of 3 random upgrades
- Upgrades compound and synergize

**Between runs (meta):**
- Unlock new upgrade types to appear in pool
- No permanent power increases
- More options, not more strength

### 2.3 Build Emergence

Each run forces different builds based on offerings:
- "I got high-speed boots early, manual specialist."
- "Robot-heavy build for hands-off automation."
- "Conveyor-centric setup for passive fulfillment."

---

## 3. Gameplay Loop

### 3.1 Player Actions

| **WASD/Arrow** | Move around warehouse |
| **Tap/Click** | Pathfind to target cell |
| **Walk over item** | Pick up (if hands free) |
| **Walk to I/O port** | Deposit item (fulfills order) |
| **Walk over XP gem** | Collect experience |

Mobile robots and conveyors act on their own based on:
- Proximity rules
- Upgrade modifiers

You don't control them directly. You build the system; it runs.

### 3.3 Moment-to-Moment

**Early run (0-3 min):**
- You're alone, sprinting, barely keeping up
- Every order you complete matters
- Desperate, sweaty

**Mid run (3-10 min):**
- First robots online, partial relief
- Choosing where to invest upgrades
- System starting to form

**Late run (10-20 min):**
- Screen full of automation
- Orders evaporate instantly
- You're dodging your own machines, grabbing XP
- Power fantasy payoff

---

## 4. Upgrade Categories

### 4.1 Automation (Mobile Robots)

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Basic Robot | Auto-fulfills nearest orders | Slow, single-task |
| Faster Robots | +50% robot move speed | — |
| Extra Robot | +1 robot fleet size | — |
| Multi-Carry | Robots can carry 2 items | — |
| Priority Orders | Robots target most urgent orders | — |

### 4.2 Infrastructure (Conveyors)

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Conveyor Belt | Items on ground drift to I/O port | Passive speed only |
| Order Extension | +5 seconds to all order timers | — |
| Double XP | +100% XP from orders | — |

### 4.3 Player

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Speed Boots | Move faster | — |
| Longer Arms | Pickup radius +1 | — |
| Magnetic | XP auto-collected nearby | — |
| Order Radar | Urgent orders glow through UI | — |

---

## 5. Conflict & Tradeoffs

### 5.1 Robot Collision

Multiple robots in same area:
- Path around each other
- Slow down for clearance
- Forces spatial thinking, not just "more robots = better"

### 5.2 Conveyor Management

Items drift slowly toward I/O ports. If the port is blocked:
- Items pile up
- Robots must clear the backlog to resume flow

---

## 6. Minimal Prototype Scope

### 6.1 Phase 1: Core Feel (1 week)

**Goal:** Does manual hauling → first robot feel good?

- [x] Grid (16×16)
- [x] Player movement (WASD)
- [x] Item spawns at I/O port
- [x] Orders spawn with timers
- [x] Manual pickup/deliver
- [x] XP drop on complete (Basic implementation)
- [x] Level up → gain 1 robot (Basic implementation)
- [x] Robot auto-fulfills (dumb, nearest) (Basic implementation)
- [x] Fail state (5 failed orders)

**Test question:** Is the moment you get your first robot satisfying?

### 6.2 Phase 2: Build Variety (Complete)

- [x] 3 upgrade choices per level
- [x] 6-8 different upgrades
- [x] Robot collision/slowdown
- [x] Mobile-friendly touch controls
- [x] Responsive grid system

**Test question:** Do different upgrade paths feel different?

### 6.3 Phase 3: Scaling & Spectacle (Complete)

- [x] Order rate ramps over time
- [x] 10+ robots possible
- [x] Screen-clearing late game
- [x] Run timer (15 min)
- [x] Win condition (survive the shift)

**Test question:** Is the late-game power fantasy real?

### 6.4 Phase 4: Polish & Intelligence (Complete)

- [x] A* Pathfinding for robots and player
- [x] Weighted traversal (Soft obstacles) for better flow
- [x] Cell reservation (no head-on collisions)
- [x] Robot intention visualization (dotted paths, markers)
- [x] Smart player movement (avoiding robots)

**Test question:** Does the system feel reliable and transparent?

---

## 7. What We're NOT Building (Yet)

- Backend / auth / persistence
- Meta progression unlocks
- Multiple maps
- Sound / music
- Leaderboards
- Advanced Sorters/Lifts

---

## 8. Success Criteria

The prototype works if:

1. **First robot moment** feels like relief/reward
2. **Upgrade choices** create genuine decisions
3. **Late game** delivers VS-style spectacle
4. **Failure** feels like "my build was wrong" not "RNG screwed me"
5. **You want to play again** after dying

---

## 9. Design Decisions

| Question | Answer |
|----------|--------|
| View | Top-down |
| Mobile Friendly | Yes (Tap-to-move + Responsive) |
| Items | Colors only (red, blue, green) |

---

## Tech Stack

Same as original (React + Vite + Zustand + Tailwind). Reuse grid/robot rendering code.