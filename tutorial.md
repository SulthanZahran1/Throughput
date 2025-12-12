# Throughput - Tutorial & Onboarding Design

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Tutorial Levels (1-5)](#3-tutorial-levels-1-5)
4. [UI Hints System](#4-ui-hints-system)
5. [Contextual Help](#5-contextual-help)
6. [First-Time User Experience](#6-first-time-user-experience)

---

## 1. Design Philosophy

### 1.1 Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Show, don't tell** | Demonstrate mechanics through constrained levels, not text walls |
| **Fail forward** | Let players make mistakes, then show why it failed |
| **Earned complexity** | Introduce one concept per level, never two |
| **Skippable for veterans** | "Skip tutorial" option after Level 1 |
| **Contextual, not modal** | Hints appear near relevant UI, not in popups |

### 1.2 Anti-Patterns to Avoid

- ❌ Forced popups that block gameplay
- ❌ Walls of text explaining mechanics
- ❌ Unlocking everything at once
- ❌ Hand-holding that removes player agency
- ❌ Unskippable cutscenes

### 1.3 Learning Curve

```
Skill
  │
  │                                    ┌─── Mastery
  │                              ┌─────┘
  │                        ┌─────┘
  │                  ┌─────┘
  │            ┌─────┘
  │      ┌─────┘
  │ ┌────┘
  │─┘
  └────────────────────────────────────────────► Time
    L1   L2   L3   L4   L5   L6  ...  L15  L20
    
    Tutorial      Automation      Pressure   Mastery
```

---

## 2. Onboarding Flow

### 2.1 First Launch Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      THROUGHPUT                             │
│              The Warehouse Optimization Game                │
│                                                             │
│                                                             │
│                    [Start Shift]                            │
│                                                             │
│                    [Continue]  (if returning user)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     First-time user?
                      /           \
                    Yes            No
                    /               \
                   ▼                 ▼
            Level 1 (forced)    Level Select
```

### 2.2 Account Creation (Deferred)

- **First session:** No login required. Progress stored in localStorage.
- **After Level 3:** Soft prompt: "Create an account to save progress across devices"
- **After Level 5:** Slightly more prominent prompt
- **Never:** Forced login gate

---

## 3. Tutorial Levels (1-5)

### Level 1: "First Day"

**Learning Goal:** Understand the core loop (order → retrieve → deliver)

**Constraints:**
- 6×6 grid (tiny)
- 1 item type (Red only)
- Pre-placed inventory (no storing needed)
- 5 orders total, generous timers (60s each)
- No zones (feature locked)
- No automation (manual clicking)

**Flow:**

```
[Shift Start]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  HINT (inline, bottom of screen):                           │
│  "An order arrived! Click the red item to retrieve it."     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player clicks red item
    │
    ▼
Crane moves to item, picks it up
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  HINT: "Now click the I/O Port to deliver."                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player clicks I/O port
    │
    ▼
Order completed, +1 score, celebration micro-animation
    │
    ▼
[Repeat 4 more times, hints fade after 2nd order]
    │
    ▼
[Shift Complete]
```

**Success Criteria:**
- ⭐ Complete 3/5 orders
- ⭐⭐ Complete 5/5 orders
- ⭐⭐⭐ Complete 5/5 with avg cycle < 10s

**End Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                     SHIFT COMPLETE                          │
│                        ⭐ ⭐ ☆                               │
│                                                             │
│  "You've got the basics! But clicking each item won't      │
│   scale. Tomorrow, you'll learn to store items too."       │
│                                                             │
│                    [Next Level]                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Level 2: "Incoming Shipment"

**Learning Goal:** Understand storing items

**Constraints:**
- 8×8 grid
- 1 item type (Red)
- Empty grid at start
- Items arrive at I/O port, must be stored
- Then orders arrive to retrieve them
- No zones yet

**New Mechanic Introduced:**
- Incoming items appear at I/O port
- Click empty slot to store

**Flow:**

```
[Shift Start]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  HINT: "A shipment arrived! Click an empty slot to store." │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player clicks empty slot
    │
    ▼
Crane moves item from I/O port to slot
    │
    ▼
[3 more items arrive, player stores them]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  HINT: "Now orders are coming in. Retrieve and deliver!"   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[Mixed store/retrieve for rest of shift]
```

**Implicit Discovery:**
- If player stores items far from I/O port, retrieval takes longer
- No explicit "store near the port" hint—let them feel the pain

**Success Criteria:**
- ⭐ Complete shift
- ⭐⭐ < 3 failed orders
- ⭐⭐⭐ Avg cycle < 8s

---

### Level 3: "Color Coded"

**Learning Goal:** Multiple item types require organization

**Constraints:**
- 8×8 grid
- 2 item types (Red, Blue)
- Mixed incoming items
- Orders specify which color

**New Mechanic Introduced:**
- Item types matter
- Wrong item = order not fulfilled

**Flow:**

```
[Shift Start]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  HINT: "Now you have two item types. Keep them organized!" │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[No further hints—player figures out organization]
```

**Implicit Discovery:**
- Mixing colors = hard to find items quickly
- Players naturally start grouping by color
- This primes them for zones (next level)

**Fail State Insight:**
If player fails (5 expired orders), show:
```
┌─────────────────────────────────────────────────────────────┐
│                     SHIFT FAILED                            │
│                                                             │
│  "Too many orders expired. Finding items in a messy        │
│   warehouse is slow. What if you could designate areas     │
│   for each color?"                                          │
│                                                             │
│  🔓 ZONES unlock in the next level!                        │
│                                                             │
│                    [Retry]  [Next Level]                    │
└─────────────────────────────────────────────────────────────┘
```

---

### Level 4: "Zone Defense"

**Learning Goal:** Zones improve efficiency

**Constraints:**
- 10×10 grid
- 2 item types (Red, Blue)
- Higher order rate than Level 3
- **Zones unlocked!**

**New Mechanic Introduced:**
- Zone painting tool
- Zone rules (accepted items, priority)

**Flow:**

```
[Shift Start - PAUSED]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  TUTORIAL OVERLAY (one-time, dismissable):                  │
│                                                             │
│  "ZONES let you automate storage decisions."               │
│                                                             │
│  1. Click the Zone Tool 🎨                                  │
│  2. Paint an area on the grid                               │
│  3. Assign which items go there                             │
│                                                             │
│  The crane will follow your rules automatically.            │
│                                                             │
│                    [Got it]                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[Zone Editor opens automatically]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  GUIDED TASK: "Create a RED zone near the I/O port"        │
│  [Pulsing highlight on cells near I/O port]                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player paints zone
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  GUIDED TASK: "Set this zone to accept RED items"          │
│  [Pulsing highlight on item selector]                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player configures zone
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  "Great! Now create a BLUE zone further back."             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Player creates second zone
    │
    ▼
[Done Editing] → Shift begins
    │
    ▼
[Crane now auto-stores based on zones]
```

**Aha Moment:**
- Player sees crane automatically putting red items near port
- Retrieval is much faster than Level 3
- "Oh, *that's* why zones matter"

**Success Criteria:**
- ⭐ Complete shift
- ⭐⭐ 90% of red items in red zone
- ⭐⭐⭐ Avg cycle < 5s

---

### Level 5: "The System"

**Learning Goal:** Zone priority matters; introduce Dual Command

**Constraints:**
- 10×10 grid
- 2 item types with unequal demand (Red = 70%, Blue = 30%)
- Zone priority becomes important
- **Dual Command unlocked!**

**New Mechanic Introduced:**
- Zone priority slider (1-10)
- Dual Command crane mode

**Flow:**

```
[Shift Start - PAUSED]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  NEW FEATURE: "DUAL COMMAND MODE"                          │
│                                                             │
│  Your crane can now STORE and RETRIEVE in one trip!        │
│                                                             │
│  Before: Store → Return → Retrieve → Return                │
│  After:  Store → Retrieve → Return                          │
│                                                             │
│  Enable it in the Crane Mode panel.                         │
│                                                             │
│                    [Got it]                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[Player sets up zones, enables Dual Command]
    │
    ▼
[Shift runs—noticeably smoother with Dual Command]
```

**Priority Discovery:**
- Red items are 70% of demand
- If player gives Red zone higher priority + closer location, throughput jumps
- If player puts Blue zone near port by mistake, they'll feel the inefficiency

**Success Criteria:**
- ⭐ Complete shift
- ⭐⭐ Throughput > 280 JPH
- ⭐⭐⭐ Throughput > 350 JPH

**End Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                     SHIFT COMPLETE                          │
│                        ⭐ ⭐ ⭐                               │
│                                                             │
│  "You've built a system. From here, the challenges         │
│   get harder—but you have the tools."                      │
│                                                             │
│  🎓 TUTORIAL COMPLETE                                       │
│                                                             │
│                    [Continue to Act 2]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. UI Hints System

### 4.1 Hint Types

| Type | Appearance | Trigger | Dismissal |
|------|------------|---------|-----------|
| **Inline** | Text bar at bottom of game area | Event-based | Auto after action |
| **Pointer** | Arrow pointing to UI element | First encounter | Click target |
| **Overlay** | Semi-transparent modal | Major unlock | Click "Got it" |
| **Toast** | Small popup, top-right | Achievement/tip | Auto-fade 3s |

### 4.2 Hint Frequency Rules

- Max 1 inline hint visible at a time
- Hints don't repeat once dismissed
- "Hint seen" state stored in localStorage
- Hints disabled after Level 5 (unless new mechanic introduced)

### 4.3 Implementation

```typescript
interface Hint {
  id: string;
  type: 'inline' | 'pointer' | 'overlay' | 'toast';
  text: string;
  targetElement?: string; // CSS selector for pointer type
  triggerCondition: () => boolean;
  dismissCondition: () => boolean;
  level?: number; // Only show on this level
}

const hints: Hint[] = [
  {
    id: 'first-order',
    type: 'inline',
    text: 'An order arrived! Click the red item to retrieve it.',
    triggerCondition: () => orders.length === 1 && level === 1,
    dismissCondition: () => crane.state === 'retrieving',
    level: 1,
  },
  {
    id: 'zone-tool-intro',
    type: 'pointer',
    text: 'Click here to open the Zone Editor',
    targetElement: '#zone-tool-button',
    triggerCondition: () => level === 4 && !hasSeenHint('zone-tool-intro'),
    dismissCondition: () => zoneEditorOpen,
    level: 4,
  },
  // ...
];
```

---

## 5. Contextual Help

### 5.1 Help Button (?)

Every major UI panel has a `?` icon that opens contextual help:

**Zone Editor Help:**
```
┌─────────────────────────────────────────────────────────────┐
│  ZONES                                                  [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Zones tell the crane where to store items.                │
│                                                             │
│  • Paint cells to create a zone                             │
│  • Assign item types the zone accepts                       │
│  • Set priority (higher = preferred)                        │
│                                                             │
│  TIPS:                                                      │
│  • Put high-demand items near the I/O port                  │
│  • Zones can overlap—highest priority wins                  │
│  • You can edit zones mid-shift                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Helper Text & Tooltips

| Element | Helper Text / Tooltip |
|---------|-----------------------|
| Cycle Time stat | "Average time from order received to delivered" |
| JPH stat | "Jobs Per Hour—your throughput rate" |
| Priority slider | "Higher priority zones are filled first" |
| Dual Command toggle | "Combined trips for efficiency" |
| Retrieval Mode | "FIFO: Oldest First", "Deadline: Urgent First", "Nearest: Closest Item" |

### 5.3 Pause Menu Help

```
┌─────────────────────────────────────────────────────────────┐
│  PAUSED                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Resume]                                                   │
│  [Restart Shift]                                            │
│  [How to Play]  ←── Opens full tutorial recap               │
│  [Settings]                                                 │
│  [Quit to Menu]                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. First-Time User Experience

### 6.1 Loading Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      THROUGHPUT                             │
│                                                             │
│                    ████████████░░░░                         │
│                                                             │
│         "Every warehouse has a rhythm.                      │
│          Find yours."                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Main Menu (First Visit)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      THROUGHPUT                             │
│              The Warehouse Optimization Game                │
│                                                             │
│          ┌─────────────────────────────────────┐            │
│          │  You run an automated warehouse.   │            │
│          │  Orders come in. Items go out.     │            │
│          │  The faster you move, the better.  │            │
│          │                                     │            │
│          │  But clicking each item won't      │            │
│          │  scale. You'll need to build       │            │
│          │  a system.                          │            │
│          └─────────────────────────────────────┘            │
│                                                             │
│                    [Start Your First Shift]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Skip Tutorial Option

After completing Level 1:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  "Looks like you've got the basics."                       │
│                                                             │
│  Want to skip ahead? You'll miss learning about            │
│  ZONES and DUAL COMMAND, but you can figure them out.      │
│                                                             │
│      [Continue Tutorial]     [Skip to Level 6]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Skipping unlocks all tutorial features but may result in harder time on Level 6+.

### 6.5 Sandbox Mode Access

After completing Level 1, sandbox mode appears in the main menu:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      THROUGHPUT                             │
│                                                             │
│                    [Continue]                               │
│                    [Level Select]                           │
│                    [Sandbox Mode]  ← NEW                    │
│                    [Settings]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sandbox unlocks all features regardless of campaign progress.** This allows players to experiment freely without spoiling the campaign's progression-based unlocks.

See `plan.md` Section 4.6 for full sandbox specification.

### 6.4 Return Visit (Incomplete Tutorial)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Welcome back!                            │
│                                                             │
│        [Continue Level 3: "Color Coded"]                   │
│                                                             │
│        [Restart Tutorial]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix: Hint Text Reference

### Level 1

| Trigger | Hint |
|---------|------|
| First order appears | "An order arrived! Click the red item to retrieve it." |
| Item picked up | "Now click the I/O Port to deliver." |
| First order completed | "Nice! Keep fulfilling orders before they expire." |
| Order about to expire | "⚠️ That order is running out of time!" |

### Level 2

| Trigger | Hint |
|---------|------|
| First incoming item | "A shipment arrived! Click an empty slot to store it." |
| First store complete | "Item stored. More will arrive—find a spot for each." |
| First retrieve after storing | "Now an order came in. Find and retrieve the item." |

### Level 3

| Trigger | Hint |
|---------|------|
| Shift start | "Now you have two item types. Keep them organized!" |
| 2 failed orders | "Tip: Grouping items by color makes them easier to find." |

### Level 4

| Trigger | Hint |
|---------|------|
| Zone editor opened | "Paint cells to define a zone, then set its rules." |
| Zone created | "Now assign which items this zone accepts." |
| Zone configured | "Create another zone for the other item type." |
| Both zones done | "Perfect! Click 'Done Editing' to start the shift." |
| First auto-store | "The crane is following your rules now." |

### Level 5

| Trigger | Hint |
|---------|------|
| Shift start | "Red items are in high demand today. Prioritize them!" |
| Dual command explanation | (Overlay modal—see Level 5 flow above) |
| Dual command first use | "Nice! Dual Command saves a lot of travel time." |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2024-12-12 | Initial draft |
| 0.2 | 2024-12-12 | Updated UI references for Phase 2 UX Polish |
```