# Throughput: Roguelike Prototype
### *From Box Hauler to Automation God*

---

## 1. Core Concept

**One sentence:** You start as a warehouse worker manually hauling boxes; you end commanding a chaotic fleet of robots, conveyors, and zones that obliterate orders the instant they spawn.

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
- "I got conveyors early, going belt-heavy"
- "No robots yet, manual speed build"
- "Three zone upgrades—painting strategy"

---

## 3. Gameplay Loop

### 3.1 Player Actions

| Input | Effect |
|-------|--------|
| **WASD/Arrow** | Move around warehouse |
| **Walk over item** | Pick up (if hands free) |
| **Walk to I/O port** | Deposit item (fulfills order) |
| **Walk over XP gem** | Collect experience |
| **Spacebar** | Quick-paint zone (late unlock) |

### 3.2 Automation Actions (Passive)

Robots, conveyors, sorters act on their own based on:
- Zone assignments
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

### 4.1 Automation (Robots)

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Basic Robot | Auto-fulfills orders in its zone | Slow, single-task |
| Fast Robot | 2× speed | Draws 2× power |
| Specialist Robot | 3× speed for one item type | Ignores others |
| Wide Robot | Covers 2× area | 50% slower |

### 4.2 Infrastructure (Conveyors/Sorters)

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Conveyor Belt | Moves items in a line | Takes grid space |
| Auto-Sorter | Routes items to correct zone | Requires conveyors |
| Vertical Lift | Connects non-adjacent areas | High power cost |

### 4.3 Zones

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Zone Slot | +1 paintable zone | — |
| Zone Boost | Items in zone = +50% robot speed | Smaller zone radius |
| Quick-Paint | Spacebar paints zone instantly | Cooldown |

### 4.4 Player

| Upgrade | Effect | Tradeoff |
|---------|--------|----------|
| Speed Boots | Move faster | — |
| Longer Arms | Pickup radius +1 | — |
| Magnetic | XP auto-collected nearby | — |
| Bulk Carry | Hold 2 items | Slower movement |

### 4.5 Power System (Constraint)

- Total power budget: starts at 100
- Each automation draws power
- Over budget → everything slows down
- Upgrades to increase budget are rare/costly

---

## 5. Conflict & Tradeoffs

### 5.1 Robot Collision

Multiple robots in same area:
- Path around each other
- Wait for clearance
- 3 robots in one zone < 2 robots in separate zones

Forces spatial thinking, not just "more robots = better"

### 5.2 Conveyor Jams

Conveyors can back up if:
- Destination zone is full
- Sorter routes wrong
- Two conveyors merge badly

Player can manually clear jams (walk over and grab)

### 5.3 Zone Conflicts

Overlapping zones with different rules:
- Robots get confused
- Priority conflicts cause oscillation
- Intentional chaos for advanced strategies?

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
- [x] Power budget system
- [x] Basic zone painting
- [x] Robot collision/slowdown

**Test question:** Do different upgrade paths feel different?

### 6.3 Phase 3: Scaling & Spectacle (Complete)

- [x] Order rate ramps over time
- [x] 10+ robots possible
- [x] Screen-clearing late game
- [x] Run timer (15 min)
- [x] Win condition (survive the shift)

**Test question:** Is the late-game power fantasy real?

---

## 7. What We're NOT Building (Yet)

- Backend / auth / persistence
- Meta progression unlocks
- Multiple maps
- Sound / polish
- Conveyors (phase 2 feature)
- Leaderboards

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
| Power budget visibility | Prominent UI element (bar or number) |
| Player death by robot | No — robots pass through player |
| Item variety | Colors only (red, blue, green) |

---

## Tech Stack

Same as original (React + Vite + Zustand + Tailwind). Reuse grid/robot rendering code.