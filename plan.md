# Throughput
### *The Warehouse Optimization Game*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Development Roadmap](#3-development-roadmap)
4. [Game Design](#4-game-design)
5. [Automation Rules (MVP)](#5-automation-rules-mvp)
6. [Level Design](#6-level-design)
7. [UI/UX Design](#7-uiux-design)
8. [Data Structures](#8-data-structures)
9. [API Specification](#9-api-specification)
10. [File Structure](#10-file-structure)
11. [Asset Checklist](#11-asset-checklist)
12. [Feature List](#12-feature-list)
13. [Technical Specifications](#13-technical-specifications)
14. [Appendix A: Future Mechanics](#appendix-a-future-mechanics)
15. [Appendix B: Naming & Theming](#appendix-b-naming--theming)

**Related Documents:**
- [tutorial.md](./tutorial.md) — Onboarding flow, tutorial levels 1-5, hint system
- [AGENTS.md](../AGENTS.md) — Guidelines for AI coding agents

---

## 1. Project Overview

### 1.1 Concept

**Throughput** is a real-time warehouse optimization game where players design automation rules for an AS/RS (Automated Storage and Retrieval System). Players paint zones, assign rules, and watch their crane execute their logic—discovering industrial engineering principles through play.

### 1.2 Core Fantasy

"I am the brain behind the machine."

### 1.3 Target Audience

- Primary: Puzzle/optimization game enthusiasts (Factorio, Shapez, Mini Motorways fans)
- Secondary: Students/professionals curious about logistics and automation
- Tertiary: Casual players who enjoy satisfying "order from chaos" visuals

### 1.4 Platform

- **MVP:** Web (Desktop-first, responsive)
- **Future:** Mobile (PWA or React Native port)

### 1.5 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) + TypeScript |
| Animation | Framer Motion |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Backend | Go (Gin or Echo) |
| Database | PostgreSQL |
| Auth | OAuth 2.0 (Google, GitHub) |
| Deployment | Vercel (FE) + Railway/Fly.io (BE) |
| Real-time | WebSockets (gorilla/websocket) |

---

## 2. Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Game View  │  │  Zone Editor│  │  Stats Dashboard    │  │
│  │  (Canvas)   │  │  (Overlay)  │  │  (Sidebar)          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │  Game Store │ (Zustand)                  │
│                   │  - grid     │                            │
│                   │  - crane    │                            │
│                   │  - orders   │                            │
│                   │  - zones    │                            │
│                   │  - stats    │                            │
│                   └──────┬──────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │ REST / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Auth       │  │  Game State │  │  Leaderboards       │  │
│  │  Service    │  │  Service    │  │  Service            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │  PostgreSQL │                            │
│                   │  - users    │                            │
│                   │  - progress │                            │
│                   │  - scores   │                            │
│                   └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Frontend-Backend Split

| Concern | Where | Why |
|---------|-------|-----|
| Game simulation (physics, crane, orders) | Frontend | Real-time responsiveness, no latency |
| Zone/rule configuration | Frontend | Immediate feedback |
| Level definitions | Backend (fetched) | Easy updates without deploy |
| User auth & sessions | Backend | Security |
| Progress persistence | Backend | Cross-device sync |
| Leaderboards | Backend | Anti-cheat, aggregation |
| Shift results validation | Backend | Prevent score tampering |

### 2.3 Multiplayer Considerations (Future)

Architecture supports future modes:
- **Async Competition:** Same level seed, compare scores
- **Live Race:** Two players, same orders, side-by-side (WebSocket sync)
- **Co-op:** Shared warehouse, each controls one crane

---

## 3. Development Roadmap

### Phase 0: Foundation (Week 1-2)

- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Basic grid renderer (HTML Canvas or DOM)
- [x] Crane entity with position state
- [x] Crane movement animation (A → B with travel time)
- [x] Click-to-move prototype

### Phase 1: Core Loop (Week 3-5)

- [x] Slot state (empty, occupied, item type)
- [x] Item types (3 types: Red, Blue, Green)
- [x] I/O Port location
- [x] Order queue (incoming orders with timers)
- [x] Order fulfillment (retrieve item → deliver to port)
- [x] Store operation (receive from port → place in slot)
- [x] Basic win/lose detection (shift timer, failed orders)

### Phase 2: Automation System (Week 6-8)

- [x] Zone data structure
- [x] Zone painting UI (click-drag to paint)
- [x] Zone rule assignment (item types, priority)
- [x] Storage decision engine (evaluate zones → pick slot)
- [x] Retrieval mode toggle (FIFO / Deadline / Nearest)
- [x] Crane mode toggle (Single / Dual command)

### Phase 3: Progression (Week 9-10)

- [ ] Level definition schema
- [ ] 5 tutorial levels (Act 1)
- [ ] 5 intermediate levels (Act 2)
- [ ] Unlock system (complete level → unlock feature)
- [ ] Shift summary screen (stats, stars, next level)

### Phase 4: Backend Integration (Week 11-13)

- [x] Go backend scaffolding
- [ ] OAuth integration (Google)
- [ ] User model + progress storage
- [ ] Level fetching API
- [ ] Shift result submission API
- [ ] Basic anti-cheat (server validates plausibility)

### Phase 5: Polish (Week 14-16)

- [ ] Sound effects
- [ ] Visual feedback (order complete, order failed, zone highlight)
- [ ] Settings menu (volume, speed toggle)
- [ ] Responsive layout
- [ ] Loading states
- [ ] Error handling

### Phase 6: Launch Prep (Week 17-18)

- [ ] Landing page
- [ ] Analytics integration
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Soft launch (share with friends/communities)

---

## 4. Game Design

### 4.1 Core Loop

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│   │ Orders  │───▶│ Player  │───▶│ Crane   │            │
│   │ Arrive  │    │ Designs │    │Executes │            │
│   └─────────┘    │ Rules   │    │ Logic   │            │
│                  └─────────┘    └────┬────┘            │
│                                      │                  │
│        ┌─────────────────────────────┘                  │
│        ▼                                                │
│   ┌─────────┐    ┌─────────┐                           │
│   │ Player  │◀───│ Results │                           │
│   │ Adjusts │    │ Visible │                           │
│   └─────────┘    └─────────┘                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Session Structure

- **Shift:** One play session (~3-7 minutes real-time)
- **Shift Clock:** Countdown representing an 8-hour workday
- **Order Rate:** Increases throughout shift (morning slow, afternoon rush)
- **End Condition:** Shift clock expires OR 5 failed orders (game over)

### 4.3 Success Metrics (Player-Visible)

| Metric | Description | Target |
|--------|-------------|--------|
| Orders Completed | Total successful deliveries | Level-dependent |
| Orders Failed | Timers that expired | < 5 to survive |
| Average Cycle Time | Mean time from order → fulfill | Lower is better |
| Crane Efficiency | % time moving with purpose vs. empty travel | Higher is better |
| Throughput (JPH) | Jobs per hour | Star rating threshold |

### 4.4 Star Rating

Each level has 3 stars:
- ⭐ Complete the shift (survive)
- ⭐⭐ Achieve target throughput
- ⭐⭐⭐ Achieve stretch throughput

Stars unlock cosmetics (crane skins, color themes) and are required to unlock later levels.

### 4.5 Progression Arc

| Act | Levels | Grid Size | Features Unlocked | Theme |
|-----|--------|-----------|-------------------|-------|
| 1 - Tutorial | 1-5 | 8×8 | Manual mode, Zones, Basic rules | "Learn the basics" |
| 2 - Automation | 6-10 | 12×12 | Retrieval modes, Dual command | "You need a system" |
| 3 - Pressure | 11-15 | 16×16 | More item types, demand spikes | "Adapt or fail" |
| 4 - Mastery | 16-20 | 20×20 | All mechanics, challenge variants | "Optimize everything" |

### 4.6 Sandbox Mode

A free-play mode separate from the campaign.

**Purpose:**
- Practice mechanics without pressure
- Experimentation with zone layouts
- Content creators / streaming
- Development & testing

**Configuration Options:**

| Setting | Options | Default |
|---------|---------|---------|
| Grid size | 6×6 to 30×30 | 16×16 |
| Item types | 1-5 | 3 |
| Order rate | 0-30/min (or manual trigger) | 10/min |
| Order timers | 10s-∞ (or disabled) | 45s |
| Fail threshold | 1-∞ (or disabled) | Disabled |
| Time limit | 1min-∞ (or disabled) | Disabled |
| Starting inventory | Empty / Random / Custom | Empty |
| Unlocked features | All (sandbox ignores progression) | All |

**Sandbox-Specific Features:**
- Manual order injection button ("Send Order")
- Speed controls (0.5×, 1×, 2×, pause)
- Reset grid button
- Export/import zone layout (JSON)
- Stats display (same as campaign, but no star rating)

**Access:**
- Available from main menu after completing Level 1
- Does not affect campaign progress
- No account required

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  SANDBOX MODE                               [Back to Menu]      │
├───────────────────────────────────────┬─────────────────────────┤
│                                       │  CONTROLS               │
│                                       │  ┌─────────────────┐    │
│                                       │  │ Grid: 16×16     │    │
│                                       │  │ Items: 3 types  │    │
│                                       │  │ Rate: 10/min    │    │
│                                       │  │ Timers: 45s     │    │
│          [WAREHOUSE GRID]             │  └─────────────────┘    │
│                                       │                         │
│                                       │  [Send Order ▼]         │
│                                       │  [Reset Grid]           │
│                                       │                         │
│                                       │  Speed: [<] 1× [>]      │
│                                       │                         │
│   ┌─────────────────────────────┐     ├─────────────────────────┤
│   │  🎨 Zones   ⚡ Crane Mode   │     │  STATS                  │
│   └─────────────────────────────┘     │  (same as campaign)     │
└───────────────────────────────────────┴─────────────────────────┘
```

---

## 5. Automation Rules (MVP)

### 5.1 Zone System

**Zone:** A player-defined region of the grid.

```typescript
interface Zone {
  id: string;
  name: string;
  color: string; // Visual identifier
  cells: Set<string>; // "x,y" coordinate strings
  acceptedItems: ItemType[]; // Which items can be stored here
  priority: number; // 1-10, higher = prefer this zone
}
```

**Zone Rules:**

| Rule | Behavior |
|------|----------|
| **Overlap** | Zones CAN overlap. A cell can belong to multiple zones. |
| **Priority Resolution** | When zones overlap, highest priority zone wins for that cell. |
| **Unassigned Cells** | Items can be stored in unassigned cells as fallback (nearest-empty). |
| **Mid-Shift Editing** | Players CAN modify zones during a shift. Changes apply immediately. |

**Storage Decision Algorithm:**
1. When storing an item, find all zones that accept this item type
2. Filter to zones with empty slots
3. Select zone with highest priority
4. Within zone, select slot nearest to I/O port
5. **Fallback:** If no valid zone has empty slots, use nearest empty unassigned cell
6. **Fail:** If grid is completely full, item cannot be stored (edge case)

**Overlap Visualization:**
- Overlapping cells show blended colors or striped pattern
- Tooltip on hover shows: "Zone A (pri 10) + Zone B (pri 5)"

### 5.2 Retrieval Modes

| Mode | Logic | When Useful |
|------|-------|-------------|
| **FIFO** | Oldest order first | Fair, predictable |
| **Earliest Deadline** | Most urgent timer first | Minimize failures |
| **Nearest Item** | Item closest to crane | Minimize travel |

Player selects one active mode. Can change mid-shift (costs time).

### 5.3 Crane Modes

| Mode | Behavior | Efficiency |
|------|----------|------------|
| **Single Command** | Store OR retrieve, then return to I/O | Baseline |
| **Dual Command** | Store item A, retrieve item B, then return | ~40% faster |

Dual Command is **unlocked** after Level 5.

### 5.4 Decision Engine Pseudocode

```
function decideNextAction(crane, orders, grid, zones):
  if crane.carrying != null:
    # Need to store
    slot = findBestStorageSlot(crane.carrying, zones, grid)
    return StoreAction(slot)
  
  if orders.pending.length > 0:
    # Need to retrieve
    order = selectOrder(orders.pending, retrievalMode)
    slot = findItemSlot(order.itemType, grid)
    return RetrieveAction(slot, order)
  
  if crane.mode == DUAL_COMMAND and canCombine():
    # Optimize: combine store + retrieve
    return DualAction(storeSlot, retrieveSlot)
  
  return IdleAction()
```

---

## 6. Level Design

### 6.1 Level Schema

```typescript
interface LevelDefinition {
  id: string;
  name: string;
  description: string;
  act: number;
  
  // Grid
  gridWidth: number;
  gridHeight: number;
  ioPortPosition: { x: number; y: number };
  blockedCells: { x: number; y: number }[]; // Obstacles
  
  // Items
  itemTypes: ItemType[];
  initialInventory: { type: ItemType; slot: { x: number; y: number } }[];
  
  // Orders
  shiftDuration: number; // seconds (real-time)
  orderSchedule: OrderWave[];
  
  // Win conditions
  survivalThreshold: number; // Max failed orders
  starThresholds: {
    one: { metric: string; value: number };
    two: { metric: string; value: number };
    three: { metric: string; value: number };
  };
  
  // Unlocks
  unlocksFeature?: string; // Feature ID unlocked on completion
  requiresStars: number; // Stars needed to attempt this level
}

interface OrderWave {
  startTime: number; // Seconds into shift
  endTime: number;
  ordersPerMinute: number;
  itemDistribution: { type: ItemType; weight: number }[];
  timerRange: { min: number; max: number }; // Seconds to fulfill
}
```

### 6.2 Example Levels

**Level 1: "First Day"**
- 8×8 grid
- 1 item type (Red)
- Slow order rate, generous timers
- Goal: Complete 10 orders
- Teaches: Basic store/retrieve cycle

**Level 5: "The System"**
- 10×10 grid
- 2 item types (Red, Blue)
- Medium order rate
- Goal: Survive using zones
- Unlocks: Dual Command mode

**Level 10: "Rush Hour"**
- 12×12 grid
- 3 item types
- Demand spike in final 2 minutes
- Goal: Maintain throughput under pressure
- Teaches: Zone priority tuning

**Level 15: "The Reorganization"**
- 16×16 grid
- Pre-filled chaotic inventory
- Goal: Fulfill orders despite bad initial layout
- Teaches: Adapting zones to existing state

---

## 7. UI/UX Design

### 7.1 Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  THROUGHPUT                          ⚙️ Settings    👤 Profile   │
├───────────────────────────────────────┬─────────────────────────┤
│                                       │                         │
│                                       │   SHIFT CLOCK           │
│                                       │   ████████░░ 6:32       │
│                                       │                         │
│          ┌───────────────────┐        ├─────────────────────────┤
│          │                   │        │                         │
│          │                   │        │   ORDER QUEUE           │
│          │    WAREHOUSE      │        │   ┌─────┐ 0:45 ⏱️       │
│          │      GRID         │        │   │ 🔴  │ Red item      │
│          │                   │        │   └─────┘               │
│          │     [CRANE]       │        │   ┌─────┐ 1:22 ⏱️       │
│          │                   │        │   │ 🔵  │ Blue item     │
│          │                   │        │   └─────┘               │
│          └───────────────────┘        │                         │
│                                       ├─────────────────────────┤
│   ┌─────────────────────────────┐     │   STATS                 │
│   │  🎨 Zone Tool   📊 Stats    │     │   Completed: 24         │
│   │  ⚡ Crane Mode  📋 Rules    │     │   Failed: 1             │
│   └─────────────────────────────┘     │   Avg Cycle: 4.2s       │
│                                       │   JPH: 342              │
└───────────────────────────────────────┴─────────────────────────┘
```

### 7.2 Zone Editor (Overlay Mode)

When zone tool is active:
- Grid cells become clickable/draggable
- Sidebar shows zone list with color swatches
- Click zone to select → paint cells
- Right panel shows selected zone's rules

```
┌─────────────────────────────────────────────────────────────────┐
│  ZONE EDITOR                                    [Done Editing]  │
├───────────────────────────────────────┬─────────────────────────┤
│                                       │                         │
│   Click and drag to paint zones       │   ZONES                 │
│                                       │   ┌─────────────────┐   │
│          ┌───────────────────┐        │   │ 🟥 Zone A       │   │
│          │ 🟥🟥🟥🟥⬜⬜⬜⬜ │        │   │ Priority: 10    │   │
│          │ 🟥🟥🟥🟥⬜⬜⬜⬜ │        │   │ Items: Red      │   │
│          │ ⬜⬜⬜⬜🟦🟦🟦🟦 │        │   └─────────────────┘   │
│          │ ⬜⬜⬜⬜🟦🟦🟦🟦 │        │   ┌─────────────────┐   │
│          │ ⬜⬜⬜⬜⬜⬜⬜⬜ │        │   │ 🟦 Zone B       │   │
│          │ ⬜⬜⬜⬜⬜⬜⬜⬜ │        │   │ Priority: 5     │   │
│          │ ⬜⬜⬜⬜⬜⬜⬜⬜ │        │   │ Items: Blue     │   │
│          │ 📥⬜⬜⬜⬜⬜⬜⬜ │        │   └─────────────────┘   │
│          └───────────────────┘        │                         │
│                                       │   [+ New Zone]          │
│   🟥 Zone A  🟦 Zone B  ⬜ Unassigned │                         │
└───────────────────────────────────────┴─────────────────────────┘
```

### 7.3 Shift Summary Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      SHIFT COMPLETE                             │
│                                                                 │
│                        ⭐ ⭐ ⭐                                  │
│                                                                 │
│              ┌─────────────────────────────┐                    │
│              │  Orders Completed    47     │                    │
│              │  Orders Failed        2     │                    │
│              │  Average Cycle      3.8s    │                    │
│              │  Throughput        388 JPH  │                    │
│              │  Crane Efficiency    78%    │                    │
│              └─────────────────────────────┘                    │
│                                                                 │
│              ⭐ Survive             ✓                           │
│              ⭐ 300+ JPH            ✓                           │
│              ⭐ 380+ JPH            ✓                           │
│                                                                 │
│                    🔓 Unlocked: Dual Command                    │
│                                                                 │
│         [Retry]      [Next Level]      [Level Select]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark slate | `#0f172a` |
| Grid lines | Slate | `#334155` |
| Empty slot | Dark gray | `#1e293b` |
| Crane | Bright cyan | `#22d3ee` |
| I/O Port | Yellow | `#facc15` |
| Item Red | Red | `#ef4444` |
| Item Blue | Blue | `#3b82f6` |
| Item Green | Green | `#22c55e` |
| Zone A | Red (translucent) | `#ef444440` |
| Zone B | Blue (translucent) | `#3b82f640` |
| Success | Green | `#22c55e` |
| Warning | Amber | `#f59e0b` |
| Danger | Red | `#ef4444` |

### 7.5 Typography

- **Headings:** Inter (Bold)
- **Body:** Inter (Regular)
- **Monospace (stats):** JetBrains Mono

---

## 8. Data Structures

### 8.1 Core Types

```typescript
// === GRID ===
type SlotState = 'empty' | 'occupied' | 'blocked';

interface Slot {
  x: number;
  y: number;
  state: SlotState;
  item: Item | null;
  zoneId: string | null;
}

interface Grid {
  width: number;
  height: number;
  slots: Map<string, Slot>; // Key: "x,y"
  ioPort: { x: number; y: number };
}

// === ITEMS ===
type ItemType = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

interface Item {
  id: string;
  type: ItemType;
  storedAt: number; // Timestamp
}

// === CRANE ===
type CraneState = 'idle' | 'moving' | 'storing' | 'retrieving';

interface Crane {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: CraneState;
  carrying: Item | null;
  speed: number; // Cells per second
}

// === ORDERS ===
type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface Order {
  id: string;
  itemType: ItemType;
  createdAt: number;
  deadline: number;
  status: OrderStatus;
  completedAt?: number;
}

// === ZONES ===
interface Zone {
  id: string;
  name: string;
  color: string;
  cells: Set<string>;
  acceptedItems: ItemType[];
  priority: number;
}

// === GAME STATE ===
type RetrievalMode = 'fifo' | 'deadline' | 'nearest';
type CraneMode = 'single' | 'dual';

interface GameState {
  // Level
  levelId: string;
  
  // Time
  shiftTime: number; // Remaining seconds
  realTime: number; // Elapsed real seconds
  isPaused: boolean;
  
  // Entities
  grid: Grid;
  crane: Crane;
  orders: Order[];
  zones: Zone[];
  
  // Settings
  retrievalMode: RetrievalMode;
  craneMode: CraneMode;
  
  // Stats
  stats: ShiftStats;
}

interface ShiftStats {
  ordersCompleted: number;
  ordersFailed: number;
  totalCycleTime: number;
  totalTravelDistance: number;
}
```

### 8.2 Backend Models

```go
// User
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Provider  string    `json:"provider"` // "google", "github"
    CreatedAt time.Time `json:"created_at"`
}

// Progress
type Progress struct {
    UserID       string         `json:"user_id"`
    LevelID      string         `json:"level_id"`
    Stars        int            `json:"stars"`
    BestJPH      float64        `json:"best_jph"`
    BestCycle    float64        `json:"best_cycle_time"`
    Attempts     int            `json:"attempts"`
    Unlocks      []string       `json:"unlocks"`
    LastPlayed   time.Time      `json:"last_played"`
}

// ShiftResult (submitted after each shift)
type ShiftResult struct {
    UserID          string  `json:"user_id"`
    LevelID         string  `json:"level_id"`
    OrdersCompleted int     `json:"orders_completed"`
    OrdersFailed    int     `json:"orders_failed"`
    AvgCycleTime    float64 `json:"avg_cycle_time"`
    JPH             float64 `json:"jph"`
    Duration        float64 `json:"duration"`
    // NOTE: Anti-cheat validation deferred until leaderboards implemented
}
```

---

## 9. API Specification

### 9.1 Endpoints

#### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Clear session |

#### Levels

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/levels` | List all levels (metadata) |
| GET | `/api/levels/:id` | Get full level definition |

#### Progress

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/progress` | Get user's progress (all levels) |
| POST | `/api/progress/:levelId` | Submit shift result |

#### Leaderboards (Post-MVP)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboards/:levelId` | Get top scores for level |

### 9.2 Example Payloads

**GET /api/levels/5**
```json
{
  "id": "5",
  "name": "The System",
  "description": "Orders are piling up. You need automation.",
  "act": 2,
  "gridWidth": 10,
  "gridHeight": 10,
  "ioPortPosition": { "x": 0, "y": 9 },
  "itemTypes": ["red", "blue"],
  "shiftDuration": 300,
  "orderSchedule": [
    {
      "startTime": 0,
      "endTime": 180,
      "ordersPerMinute": 8,
      "itemDistribution": [
        { "type": "red", "weight": 0.7 },
        { "type": "blue", "weight": 0.3 }
      ],
      "timerRange": { "min": 30, "max": 60 }
    },
    {
      "startTime": 180,
      "endTime": 300,
      "ordersPerMinute": 15,
      "itemDistribution": [
        { "type": "red", "weight": 0.5 },
        { "type": "blue", "weight": 0.5 }
      ],
      "timerRange": { "min": 20, "max": 45 }
    }
  ],
  "starThresholds": {
    "one": { "metric": "survival", "value": 1 },
    "two": { "metric": "jph", "value": 280 },
    "three": { "metric": "jph", "value": 350 }
  },
  "unlocksFeature": "dual_command"
}
```

**POST /api/progress/5**
```json
{
  "ordersCompleted": 42,
  "ordersFailed": 3,
  "avgCycleTime": 4.2,
  "jph": 312,
  "duration": 300.5
}
```

---

## 10. File Structure

```
throughput/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   │   ├── sounds/
│   │   │   └── images/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── Grid.tsx
│   │   │   │   ├── Slot.tsx
│   │   │   │   ├── Crane.tsx
│   │   │   │   ├── Item.tsx
│   │   │   │   ├── IOPort.tsx
│   │   │   │   └── OrderQueue.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Slider.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── ProgressBar.tsx
│   │   │   ├── editor/
│   │   │   │   ├── ZoneEditor.tsx
│   │   │   │   ├── ZoneList.tsx
│   │   │   │   └── RulePanel.tsx
│   │   │   └── screens/
│   │   │       ├── MainMenu.tsx
│   │   │       ├── LevelSelect.tsx
│   │   │       ├── GameScreen.tsx
│   │   │       ├── ShiftSummary.tsx
│   │   │       └── Settings.tsx
│   │   ├── engine/
│   │   │   ├── simulation.ts
│   │   │   ├── crane.ts
│   │   │   ├── orders.ts
│   │   │   ├── storage.ts
│   │   │   └── retrieval.ts
│   │   ├── store/
│   │   │   ├── gameStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── userStore.ts
│   │   ├── hooks/
│   │   │   ├── useGameLoop.ts
│   │   │   ├── useZonePainting.ts
│   │   │   └── useKeyboard.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── levels.ts
│   │   │   └── progress.ts
│   │   ├── types/
│   │   │   ├── game.ts
│   │   │   ├── level.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── coordinates.ts
│   │   │   ├── pathfinding.ts
│   │   │   └── stats.ts
│   │   ├── constants/
│   │   │   ├── colors.ts
│   │   │   └── config.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── api/
│   │   │   ├── router.go
│   │   │   ├── middleware.go
│   │   │   ├── auth.go
│   │   │   ├── levels.go
│   │   │   └── progress.go
│   │   ├── models/
│   │   │   ├── user.go
│   │   │   ├── progress.go
│   │   │   └── level.go
│   │   ├── storage/
│   │   │   ├── postgres.go
│   │   │   └── queries.go
│   │   ├── auth/
│   │   │   ├── oauth.go
│   │   │   └── session.go
│   │   └── validation/
│   │       └── checksum.go
│   ├── migrations/
│   │   ├── 001_users.sql
│   │   └── 002_progress.sql
│   ├── levels/
│   │   ├── level_01.json
│   │   ├── level_02.json
│   │   └── ...
│   ├── go.mod
│   ├── go.sum
│   └── Makefile
│
├── docs/
│   ├── plan.md (this file)
│   ├── tutorial.md (onboarding design)
│   ├── api.md
│   └── design/
│       └── mockups/
│
├── .gitignore
├── README.md
├── AGENTS.md
└── docker-compose.yml
```

---

## 11. Asset Checklist

### 11.1 Visual

- [ ] Logo / wordmark
- [ ] Favicon (SVG)
- [ ] Crane sprite (idle, moving, carrying)
- [ ] Item sprites (per color)
- [ ] I/O Port sprite
- [ ] Slot states (empty, occupied, blocked)
- [ ] Zone overlays (per color, translucent)
- [ ] Star icons (empty, filled)
- [ ] UI icons (settings, profile, play, pause, retry)

### 11.2 Audio

- [ ] Background music (ambient, industrial)
- [ ] Crane move (loop)
- [ ] Item pickup
- [ ] Item place
- [ ] Order arrive
- [ ] Order complete
- [ ] Order fail
- [ ] Level complete (fanfare)
- [ ] Star earned
- [ ] Button click

### 11.3 Fonts

- [ ] Inter (Google Fonts)
- [ ] JetBrains Mono (Google Fonts)

---

## 12. Feature List

### 12.1 MVP Features

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F01 | Grid rendering | P0 | ⬜ |
| F02 | Crane movement | P0 | ⬜ |
| F03 | Item store/retrieve | P0 | ⬜ |
| F04 | Order queue | P0 | ⬜ |
| F05 | Order timers | P0 | ⬜ |
| F06 | Shift clock | P0 | ⬜ |
| F07 | Win/lose detection | P0 | ⬜ |
| F08 | Zone painting | P0 | ⬜ |
| F09 | Zone rules | P0 | ⬜ |
| F10 | Retrieval mode toggle | P0 | ⬜ |
| F11 | Crane mode toggle | P1 | ⬜ |
| F12 | Level loading | P0 | ⬜ |
| F13 | Level progression | P0 | ⬜ |
| F14 | Shift summary | P0 | ⬜ |
| F15 | Star rating | P1 | ⬜ |
| F16 | Feature unlock | P1 | ⬜ |
| F17 | OAuth login | P1 | ⬜ |
| F18 | Progress persistence | P1 | ⬜ |
| F19 | Sandbox mode | P1 | ⬜ |

### 12.2 Post-MVP Features

| ID | Feature | Priority |
|----|---------|----------|
| F20 | Leaderboards | P2 |
| F21 | Multiple cranes | P2 |
| F22 | Demand prediction display | P2 |
| F23 | Re-slotting mechanic | P2 |
| F24 | Challenge mutations | P2 |
| F25 | Custom level editor | P3 |
| F26 | Multiplayer race mode | P3 |
| F27 | Mobile port | P3 |
| F28 | Achievements | P3 |

---

## 13. Technical Specifications

### 13.1 Performance Targets

| Metric | Target |
|--------|--------|
| Frame rate | 60 FPS |
| Initial load | < 3s |
| Level load | < 500ms |
| Memory usage | < 100MB |
| Bundle size | < 500KB (gzipped) |

### 13.2 Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

### 13.3 Game Loop

```typescript
// Target: 60 FPS
const TICK_RATE = 1000 / 60; // ~16.67ms

function gameLoop(timestamp: number) {
  const delta = timestamp - lastTimestamp;
  
  if (!isPaused) {
    updateCrane(delta);
    updateOrders(delta);
    updateShiftClock(delta);
    checkWinLose();
  }
  
  render();
  
  lastTimestamp = timestamp;
  requestAnimationFrame(gameLoop);
}
```

### 13.4 State Sync (Multiplayer, Future)

- WebSocket connection for live games
- Server authoritative for order generation (same seed)
- Client authoritative for player actions (zone changes, mode toggles)
- End-of-shift validation on server

---

## Appendix A: Future Mechanics

### A.1 Storage Strategies (Not in MVP)

| Strategy | Description | Unlock Condition |
|----------|-------------|------------------|
| **Dedicated Storage** | Reserve specific slots for specific SKUs | Act 3 |
| **Velocity Ranking** | Auto-promote high-demand items forward | Act 4 |
| **Random Chaos** | Baseline mode for tutorial contrast | Tutorial |

### A.2 Retrieval Strategies (Not in MVP)

| Strategy | Description | Unlock Condition |
|----------|-------------|------------------|
| **Batching** | Group same-item orders, retrieve once | Act 3 |
| **Priority Class** | VIP orders jump queue | Act 3 |

### A.3 Crane Behaviors (Not in MVP)

| Behavior | Description | Unlock Condition |
|----------|-------------|------------------|
| **Interleaving** | Dynamic store/retrieve mix | Act 4 |
| **Look-ahead** | Pre-position for predicted demand | Act 4 |
| **Dwell Point** | Strategic idle position | Act 4 |

### A.4 Slot Maintenance (Not in MVP)

| Mechanic | Description | Unlock Condition |
|----------|-------------|------------------|
| **Re-slotting** | Move items during idle | Post-MVP |
| **Compaction** | Consolidate scattered items | Post-MVP |

### A.5 Multi-Crane (Not in MVP)

| Mechanic | Description |
|----------|-------------|
| **Zone Ownership** | Each crane owns a region |
| **Dynamic Dispatch** | Assign task to nearest crane |
| **Collision Avoidance** | Cranes can't share row/column |
| **Handoff Points** | Transfer items between cranes |

### A.6 Challenge Mutations (Not in MVP)

| Mutation | Effect |
|----------|--------|
| **Flash Sale** | One item gets 10× demand for 2 min |
| **Inventory Audit** | Retrieve all items in sequence |
| **Crane Maintenance** | One crane offline for 60s |
| **Power Outage** | All cranes pause for 30s |
| **New SKU** | Unknown item type appears mid-shift |

---

## Appendix B: Naming & Theming

### B.1 Name Alternatives (Archived)

| Category | Options |
|----------|---------|
| Professional | OptiFlow, SlotLogic, HighBay, RackOps |
| Playful | CraneBrain, GridGrind, Slot Jam, Box Mover Tycoon |
| Abstract | Throughput ✓, Cycle, Intra |
| Nerdy | AS/RS Idle, AMHS Sim, Stocker |

**Selected:** Throughput

### B.2 Tagline Options

- "The Warehouse Optimization Game"
- "Design the Logic. Watch it Work."
- "Every Second Counts."
- "Automate. Optimize. Repeat."

### B.3 Visual Theme

Industrial SCADA aesthetic:
- Dark mode default
- Minimal color palette (slate + accent colors)
- Grid-based layout
- Monospace fonts for metrics
- Subtle glow effects on active elements

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-12 | Initial release |
| 1.1 | 2025-12-12 | Phase 0 complete: Project scaffold, grid, crane, click-to-move |