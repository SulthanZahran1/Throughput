# Throughput: Roguelite Redesign

> ⚠️ **This document is superseded by [THROUGHPUT-DESIGN.md](./THROUGHPUT-DESIGN.md).**
> The new design moves from pure auto-battler to a hybrid operations-manager model with emergency abilities, exact ETA, policy switching, and a mobile-first operations board.
>
> Kept for reference; all active decisions now live in `THROUGHPUT-DESIGN.md`.

## The Problem with the Current Game

Throughput has a solid simulation engine but a hollow player experience. The crane is autonomous — it stores, retrieves, and delivers on its own. The player sets retrieval modes, crane modes, and paints zones, then watches. The 10 linear levels have no replay value. There's no sound, no celebration, no visible consequence of player decisions, and no reason to come back after clearing the levels once.

The game has the structure of a puzzle game but the soul of a screensaver.

---

## Why Roguelite

The core strength of Throughput is that **the player is the strategist, not the operator**. You don't drive the crane — you design the system the crane runs on. That's the fantasy of every good roguelite: **build a machine, watch it succeed or fail, then build a better one**.

The model is an **auto-battler deckbuilder**: the planning phase (upgrade picks) is the game, the combat phase (shifts) is the payoff. Think TFT's carousel rounds, Balatro's hand-building, or Slay the Spire's map navigation — the decisions between fights matter more than the fights themselves.

---

## Design Decisions (Locked In)

These are not open questions. They are the game.

| Decision | Answer | Rationale |
|----------|--------|-----------|
| Core player action | **Deckbuilder** — pick upgrades, watch the build play out | The crane is autonomous. The game is in the choices, not the clicking. |
| Shift interactivity | **Zero during shifts** — pure spectator | Shifts are the test, not the game. Player watches their build succeed or break. |
| Crane control | **Always autonomous** | The player is the warehouse architect, not the crane operator. |
| Run length | **5-10 minutes** (coffee break) | Short runs, fast restarts, many runs per session. Mobile-friendly. |
| Shifts per run | **8 shifts to win** (6-8 upgrade picks) | Enough to build an identity. Win at shift 8 with a victory screen. |
| Shift duration | **45-60 seconds each** | Long enough to see the build working, short enough to keep pace. |
| Failure mode | **10 HP, each failed order = -1 HP** across the whole run | Simple, readable. Creates tension management over multiple shifts. |
| Upgrade picks | **Pick 1 of 3 cards** after each shift | Standard roguelite choice depth. |
| Info timing | **See next modifier before picking** | Strategic, informed decisions. Like Slay the Spire showing the next boss. |
| Card pool | **~25 cards** at launch | Room for 3-4 build archetypes. ~15 runs to see everything. |
| Meta-progression | **Light power boosts + card unlocks** | New cards add variety. Small permanent bonuses. Not a grind wall. |
| Win condition | **Survive shift 8 = victory screen** | Clean ending. Score from HP remaining + total orders. Difficulty tiers for replay. |
| Sandbox | **Removed for now** — ship one mode | Focus. Sandbox can return later. |
| First shift | **Easy but losable** | A new player could lose 1-2 HP. Stakes are real from the start. |
| First priority | **Core loop** — run + upgrades + escalation | Prove the loop is fun with placeholder UI. Polish after. |

---

## Core Fantasy

> "Every shift the warehouse gets busier. Every upgrade makes my system smarter. How far can I push it before it breaks?"

---

## The Run

### Structure

A run is 8 shifts. You start with 10 HP, zero upgrades, and a basic warehouse. Each shift, orders arrive and the crane works autonomously. Failed orders cost HP. Survive all 8 shifts and you win. Lose all HP and the run is over.

Between every shift (except the last), you pick 1 of 3 upgrade cards. You see the next shift's modifier before picking, so you can plan.

```
START (10 HP, 0 upgrades)
  │
  ▼
SHIFT 1 (easy, 45s)
  │ -1 HP per failed order
  ▼
UPGRADE PICK (1 of 3 cards, see Shift 2 modifier)
  │
  ▼
SHIFT 2 (harder, 50s)
  │
  ▼
UPGRADE PICK (1 of 3 cards, see Shift 3 modifier)
  │
  ...repeats...
  │
  ▼
SHIFT 8 (hardest, 60s)
  │
  ▼
VICTORY (or RUN OVER if HP hit 0)
```

**7 upgrade picks** across the run (after shifts 1-7). By shift 8 you have a 7-card build.

### Timing

| Shift | ~Duration | Cumulative |
|-------|-----------|------------|
| 1 | 45s | 0:45 |
| 2 | 45s | 1:30 |
| 3 | 50s | 2:20 |
| 4 | 50s | 3:10 |
| 5 | 55s | 4:05 |
| 6 | 55s | 5:00 |
| 7 | 60s | 6:00 |
| 8 | 60s | 7:00 |

Plus ~15-20s per upgrade pick screen = **~9 minutes for a full winning run**. A failed run on shift 4 is ~3 minutes.

---

## Shift Escalation

### Baseline Parameters

| Shift | Grid | Item Types | Order Rate | Deadline | Modifier? |
|-------|------|------------|------------|----------|-----------|
| 1 | 6x6 | 1 (red) | 2/min | 45s | No |
| 2 | 6x6 | 1 | 3/min | 40s | No |
| 3 | 8x8 | 2 | 4/min | 35s | Yes |
| 4 | 8x8 | 2 | 6/min | 30s | Yes |
| 5 | 10x10 | 3 | 8/min | 28s | Yes |
| 6 | 10x10 | 3 | 10/min | 25s | Yes |
| 7 | 12x12 | 4 | 13/min | 22s | Yes |
| 8 | 12x12 | 5 | 16/min | 20s | Yes |

Shifts 1-2 have no modifier (let the player learn). Shifts 3-8 each have a random modifier.

### Shift Modifiers

Each modifier has a name, one-sentence description, and a category. The player sees the modifier for the *next* shift on the upgrade pick screen.

**Pressure Modifiers** (make the shift harder):

| Name | Description |
|------|-------------|
| Rush Hour | Order rate doubles for the first 20 seconds |
| Fragile Goods | Crane moves 25% slower |
| Tight Deadlines | All order timers -30% |
| Gridlock | 15% of random cells are blocked |
| Monotone | All orders request the same random item type |
| Skeleton Crew | Crane transfer time doubled |

**Opportunity Modifiers** (risk/reward twists):

| Name | Description |
|------|-------------|
| Overtime | Shift is 15s longer, but order rate is 50% higher |
| VIP Orders | Some orders deal 2 HP on failure but give +1 HP on completion |
| Clearance Sale | Grid starts half-full of random items |

**Distribution**: 70% Pressure, 30% Opportunity. No duplicate modifiers within a single run.

---

## Upgrades (The Card Pool)

### Starting State

The player starts every run with:
- FIFO retrieval mode (only mode)
- Single crane mode
- No zones
- Base crane speed (3 cells/sec)
- Base transfer time (0.5s)
- 10 HP
- 5 max failed orders per shift (before HP loss stops mattering — you lose all 10 HP in one shift if everything goes wrong, but individual shifts don't have a separate fail cap)

Everything else is earned through upgrade cards.

### Card Design

Each card has:
- **Name**
- **One-sentence effect description**
- **Rarity**: Common (60%), Uncommon (30%), Rare (10%)
- **Stackable?**: Can you get duplicates that stack?

### Full Card Pool (~25 cards)

#### Crane (7 cards)

| # | Name | Rarity | Effect | Stacks? |
|---|------|--------|--------|---------|
| 1 | Speed Boost | Common | Crane moves +1 cell/sec faster | Yes (max 3) |
| 2 | Quick Hands | Common | Transfer time -0.15s | Yes (max 2) |
| 3 | Dual Command | Uncommon | Crane combines store + retrieve into one trip | No |
| 4 | Predictive Pathing | Uncommon | Crane begins moving toward next task during transfer | No |
| 5 | Afterburner | Uncommon | Crane is 40% faster when not carrying an item | No |
| 6 | Second Crane | Rare | Adds a second independent crane to the grid | No |
| 7 | Turbo Transfer | Rare | Transfer time reduced to 0.1s (overrides Quick Hands) | No |

#### Storage (6 cards)

| # | Name | Rarity | Effect | Stacks? |
|---|------|--------|--------|---------|
| 8 | Auto-Zone | Common | Automatically creates an optimized zone for one random item type | Yes |
| 9 | Grid Expansion | Common | Grid gains +1 row and +1 column | Yes (max 3) |
| 10 | Express Port | Uncommon | I/O port transfer time halved | No |
| 11 | Deep Storage | Uncommon | 3 random blocked cells become usable | Yes (max 2) |
| 12 | Conveyor Belt | Rare | Items in the I/O column auto-slide one cell inward per second | No |
| 13 | Smart Sorting | Rare | Items are automatically stored in the optimal zone (ignores unzoned fallback) | No |

#### Orders (6 cards)

| # | Name | Rarity | Effect | Stacks? |
|---|------|--------|--------|---------|
| 14 | Deadline Extension | Common | All order timers +8s | Yes (max 3) |
| 15 | Thick Skin | Common | +2 max HP (run-wide) | Yes (max 2) |
| 16 | Order Preview | Uncommon | See the next 3 upcoming orders before they spawn | No |
| 17 | Bulk Fulfillment | Uncommon | Every 5th completed order heals 1 HP | No |
| 18 | Forgiveness | Rare | First failed order each shift costs 0 HP | No |
| 19 | Early Bird | Rare | Orders completed within 5s of arrival heal 0.5 HP | No |

#### System (6 cards)

| # | Name | Rarity | Effect | Stacks? |
|---|------|--------|--------|---------|
| 20 | Retrieval Modes | Common | Unlocks Deadline and Nearest retrieval modes | No |
| 21 | Zone Mastery | Uncommon | Items in a matching zone get +5s deadline bonus | No |
| 22 | Efficiency Bonus | Uncommon | Completing a shift with 0 failed orders heals 2 HP | No |
| 23 | Time Warp | Uncommon | First 5s of each shift, orders don't spawn (setup time) | No |
| 24 | Overclocked | Rare | Simulation runs 20% faster — crane AND order generation | No |
| 25 | Emergency Brake | Rare | When HP drops to 1, the current shift's order rate halves | No |

### Starter Cards vs Locked Cards

**Available from run 1** (no unlock required): cards 1, 2, 8, 9, 14, 15, 20 (7 cards — all Common)

**Must be unlocked with crates**: remaining 18 cards

This means early runs have a small, simple pool. As you unlock more cards, runs get more varied and builds get more interesting.

### Card Offering Rules

- 3 cards offered, all different
- Can't be offered a non-stackable card you already have
- Rarity weights: 60% Common, 30% Uncommon, 10% Rare
- After shift 5: weights shift to 40% Common, 35% Uncommon, 25% Rare
- Cards are drawn from your **unlocked** pool only

---

## HP System

### Rules

- Start with **10 HP** (upgradeable via Thick Skin)
- Each **failed order** during any shift costs **1 HP**
- HP does **not** reset between shifts — it's a run-wide resource
- HP can be **healed** by specific upgrades (Bulk Fulfillment, Efficiency Bonus, Early Bird, VIP Orders)
- When HP reaches **0**, the run ends immediately (mid-shift)

### Why This Works

HP creates a **tension arc** across the run. A rough early shift (lose 3 HP on shift 2) means you play the rest of the run on a knife's edge. A clean early game gives you a cushion. Healing upgrades become more valuable when you're low. The player constantly weighs "do I pick the offensive upgrade to clear orders faster, or the defensive one to survive?"

### HP Display

Always visible during shifts — a heart counter or health bar at the top of the screen. When HP drops, the UI should pulse red briefly. When HP heals, green flash.

---

## Meta-Progression

### Currency: Crates

Each run earns crates:
- **1 crate** per shift survived
- **+1 bonus** for winning the run (surviving shift 8)
- **+1 bonus** for winning with 5+ HP remaining
- **+1 bonus** for first time reaching a new highest shift

A winning run earns ~10 crates. A failed run on shift 4 earns ~4. Unlocking all 18 locked cards costs ~60-80 crates total (roughly 10-15 runs).

### Unlock Shop

Accessed from the main menu. Browse cards by category, see their effects, spend crates to permanently add them to the offering pool.

| Card Rarity | Unlock Cost |
|-------------|-------------|
| Common | 2 crates |
| Uncommon | 4 crates |
| Rare | 7 crates |

### Milestone Rewards (Permanent Bonuses)

| Milestone | Reward |
|-----------|--------|
| Win your first run | Permanent +0.5 crane speed on all future runs |
| Win a run with 8+ HP | Start future runs with 11 HP instead of 10 |
| Unlock 15 cards | 1 free reroll per run on the upgrade pick screen |
| Unlock all 25 cards | Unlock **Endless Mode** — shifts continue past 8, no victory screen, chase high scores |
| Reach shift 8 five times | Unlock **Hard Mode** — start at 8 HP, modifiers start on shift 1 |

### Difficulty Tiers (Post-Win Replay)

After winning your first run, new difficulty tiers unlock:

| Tier | Change |
|------|--------|
| Normal | Default (10 HP, modifiers from shift 3) |
| Hard | 8 HP, modifiers from shift 1, order rates +20% |
| Brutal | 6 HP, modifiers from shift 1, deadlines -25%, no healing |

Each tier has its own best-score tracking. This gives veterans replay goals after mastering Normal.

---

## Screens & Flow

### Main Menu

```
┌─────────────────────────────────────────────┐
│                                             │
│               THROUGHPUT                    │
│                                             │
│            [ Start Run ]                    │
│            [ Upgrades  ]   (unlock shop)    │
│                                             │
│     Best: Shift 7  |  Crates: 23           │
│     Runs: 14  |  Wins: 3                   │
│                                             │
└─────────────────────────────────────────────┘
```

Two buttons. Clean. Stats at the bottom for returning players.

### Pre-Shift Screen

Shown before every shift. Displays what's coming.

```
┌─────────────────────────────────────────────┐
│  SHIFT 4                          HP: ♥♥♥♥♥♥♥♥ (8/10)
│  ────────────────────────────────────────   │
│                                             │
│  Grid: 8x8       Items: Red, Blue          │
│  Duration: 50s    Orders: ~6/min            │
│  Deadline: 30s                              │
│                                             │
│  ⚠ MODIFIER: Rush Hour                     │
│  "Order rate doubles for the first 20s"     │
│                                             │
│  YOUR BUILD:                                │
│  [Speed Boost] [Auto-Zone] [Thick Skin]    │
│                                             │
│              [ Begin Shift ]                │
│                                             │
└─────────────────────────────────────────────┘
```

### During Shift

The current game screen, but simplified:
- **No controls panel** — no retrieval mode buttons, no crane mode toggle (those are upgrades now)
- **HP counter** always visible at top
- **Shift number** and **timer** at top
- **Modifier banner** (small, top) reminding what's active
- **Build icons** (small row) showing current upgrades
- **Order list** on the left (same as now)
- **Grid + crane** in the center (same as now)
- **Stats** (orders completed/failed) on the right (simplified)

No pause button. No zone editor. No settings. The shift is a spectacle — you watch.

### Post-Shift / Upgrade Pick Screen

The most important screen. Shown after surviving a shift (shifts 1-7).

```
┌─────────────────────────────────────────────┐
│  SHIFT 4 SURVIVED              HP: ♥♥♥♥♥♥♥ (7/10)
│  ────────────────────────────────────────   │
│  Orders: 12 completed, 1 failed  (-1 HP)   │
│  JPH: 480  |  Avg Cycle: 6.2s              │
│                                             │
│  CHOOSE AN UPGRADE                          │
│                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  │ ⚡ Quick   │  │ 📦 Grid   │  │ 👁 Order  │
│  │   Hands   │  │  Expand   │  │  Preview  │
│  │           │  │           │  │           │
│  │ -0.15s    │  │ +1 row/col│  │ See next 3│
│  │ transfer  │  │ to grid   │  │ orders    │
│  │           │  │           │  │           │
│  │  Common   │  │  Common   │  │ Uncommon  │
│  └───────────┘  └───────────┘  └───────────┘
│                                             │
│  NEXT SHIFT: 5 — 10x10, 3 items, 55s       │
│  Modifier: Gridlock — "15% of cells blocked"│
│                                             │
└─────────────────────────────────────────────┘
```

The player sees:
1. How the shift went (orders, HP lost)
2. Three upgrade cards to choose from
3. What's coming next (shift params + modifier)

This lets them make informed picks: "Gridlock is next and I'm on a 8x8 grid, so Grid Expansion is the smart pick."

### Victory Screen

Shown after surviving shift 8.

```
┌─────────────────────────────────────────────┐
│                                             │
│          ✦ WAREHOUSE OPTIMIZED ✦            │
│             All 8 shifts survived           │
│                                             │
│  HP Remaining: 6/10                         │
│  Total Orders: 64                           │
│  Total Failed: 4                            │
│  Run Score: 5,840                           │
│                                             │
│  YOUR BUILD:                                │
│  Speed Boost x2 · Quick Hands · Auto-Zone   │
│  Dual Command · Thick Skin · Retrieval Modes│
│  Zone Mastery                               │
│                                             │
│  CRATES EARNED: 10                          │
│  ✓ 8 shifts survived        (+8)           │
│  ✓ Run won                  (+1)           │
│  ✓ Won with 5+ HP           (+1)           │
│                                             │
│     [ New Run ]       [ Main Menu ]         │
│                                             │
└─────────────────────────────────────────────┘
```

### Run Over Screen (Death)

```
┌─────────────────────────────────────────────┐
│                                             │
│              RUN OVER                       │
│          Failed on Shift 5                  │
│                                             │
│  Total Orders: 31                           │
│  Total Failed: 10                           │
│  Run Score: 2,180                           │
│                                             │
│  YOUR BUILD:                                │
│  Speed Boost · Grid Expansion · Auto-Zone   │
│  Deadline Extension                         │
│                                             │
│  CRATES EARNED: 5                           │
│  ✓ 4 shifts survived        (+4)           │
│  ✓ New best! (prev: Shift 3) (+1)          │
│                                             │
│     [ Try Again ]     [ Main Menu ]         │
│                                             │
└─────────────────────────────────────────────┘
```

### Unlock Shop

```
┌─────────────────────────────────────────────┐
│  UPGRADE SHOP                   Crates: 23  │
│  ────────────────────────────────────────   │
│                                             │
│  CRANE                                      │
│  [x] Speed Boost (starter)                  │
│  [x] Quick Hands (starter)                  │
│  [ ] Dual Command — 4 crates    [Unlock]    │
│  [ ] Predictive Pathing — 4 cr  [Unlock]    │
│  [ ] Afterburner — 4 crates     [Unlock]    │
│  [ ] Second Crane — 7 crates       🔒      │
│  [ ] Turbo Transfer — 7 crates     🔒      │
│                                             │
│  STORAGE                                    │
│  [x] Auto-Zone (starter)                    │
│  [x] Grid Expansion (starter)               │
│  [ ] Express Port — 4 crates    [Unlock]    │
│  ...                                        │
│                                             │
│              [ Back ]                        │
└─────────────────────────────────────────────┘
```

---

## Score Calculation

Run score is used for personal bests and future leaderboards.

```
score = (total_orders_completed × 100)
      + (hp_remaining × 200)
      + (shifts_survived × 500)
      + (win_bonus: 2000 if survived shift 8)
```

Examples:
- Win with 64 orders, 6 HP remaining: 64×100 + 6×200 + 8×500 + 2000 = **13,600**
- Die on shift 5 with 31 orders: 31×100 + 0×200 + 4×500 + 0 = **5,100**

---

## What Happens to the Existing Codebase

### Engine (No Changes)

The simulation engine (`engine/`) is untouched. `tickSimulation()`, crane FSM, storage/retrieval algorithms, order generation — all stay as-is. The engine is already pure and framework-agnostic. It doesn't know about runs, upgrades, or HP.

### Shift Generation (New)

Instead of loading a static `LevelDefinition`, the run system generates shift parameters procedurally:
- Grid size, item types, order rate, deadline from the escalation table
- Modifier applied on top
- Upgrades modify the base parameters (Speed Boost increases crane speed, Grid Expansion changes grid size, etc.)

The existing `LevelDefinition` interface works for this — it's just generated at runtime instead of loaded from a file.

### Stores (Major Changes)

- **`gameStore`** — stays, but `loadLevel()` is called with a generated shift definition
- **`progressStore`** — gutted and replaced with `runStore` (tracks current run state: shift number, HP, upgrades, crates) and `metaStore` (tracks crate balance, unlocked cards, milestones, best scores)
- **`uiStore`** — updated for new screens (pre_shift, upgrade_pick, victory, run_over, unlock_shop)

### Components (Major Changes)

- **Remove**: `LevelSelectScreen`, `ShiftSummaryScreen` (replaced by new screens)
- **Remove**: `MainMenu` level select and sandbox buttons
- **Simplify**: `GameScreen` — remove controls panel, zone editor toggle, how-to-play section
- **Add**: `PreShiftScreen`, `UpgradePickScreen`, `VictoryScreen`, `RunOverScreen`, `UnlockShopScreen`, `UpgradeCard` component

### Data (Replaced)

- `data/levels/` files become reference material for the escalation table, not directly loaded
- New `data/upgrades.ts` — all 25 card definitions
- New `data/modifiers.ts` — all modifier definitions
- New `data/escalation.ts` — shift parameter table

### Backend

- **Progress API** changes to track: crate balance, unlocked cards, milestone flags, best scores per difficulty
- **Level API** becomes irrelevant (shifts are generated client-side)
- **Run submission API** — POST the full run result for leaderboard/validation

---

## Build Order (Implementation Priority)

### Phase 1: Core Loop (Must Have)

1. **Run state** — `runStore.ts`: current shift, HP, upgrades held, crate counter
2. **Shift generation** — `engine/shiftGenerator.ts`: produces a `LevelDefinition` from escalation table + modifiers
3. **Upgrade system** — `data/upgrades.ts`: card definitions + logic to apply upgrades to shift parameters
4. **Modifier system** — `data/modifiers.ts`: modifier definitions + logic to apply to shift parameters
5. **Pre-shift screen** — shows shift info + modifier
6. **Upgrade pick screen** — shows results + 3 cards + next shift preview
7. **Victory / run over screens** — end-of-run summary
8. **Updated main menu** — Start Run + Upgrades
9. **HP display** — visible during shifts, flashes on damage/heal
10. **Updated game screen** — remove controls, add build icons + HP + shift counter

### Phase 2: Meta Layer (Should Have)

11. **Meta store** — `metaStore.ts`: crate balance, unlocked cards, milestones
12. **Unlock shop screen** — browse and unlock cards
13. **Milestone system** — check conditions, grant rewards
14. **Difficulty tiers** — Hard, Brutal modes after first win

### Phase 3: Polish (Nice to Have)

15. **Card animations** — flip, glow, satisfying pick
16. **HP feedback** — red pulse on damage, green on heal
17. **Shift transition animations** — fade between screens
18. **Sound effects** — order complete/fail, card pick, shift start/end, HP damage/heal
19. **Run history** — see last 5 runs with build + score
20. **Seeded runs** — share a seed for competitive comparison

---

## Open Questions (Remaining)

1. **Second Crane complexity** — two cranes on one grid need either collision avoidance or distinct territories. This card might be too complex for launch. Consider cutting it to a post-launch addition.

2. **Conveyor Belt visualization** — how does this look in the current grid? Items sliding automatically needs animation support the engine doesn't have yet. May need to simplify to "items in the I/O row are stored automatically."

3. **Overclocked risk** — speeding up the simulation speeds up order generation too. This might be a trap card that feels bad. Needs playtesting. Alternative: "crane is 20% faster, orders unchanged."

4. **Daily challenge / seeded runs** — great for retention but needs backend support for seed validation and leaderboards. Defer to post-launch.

5. **Mobile layout** — zero-interaction shifts are perfect for mobile, but the grid + order list need responsive layout work. Worth doing after the core loop is proven fun.
