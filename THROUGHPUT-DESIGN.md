# Throughput: Design Specification

> *Generated from design grilling session (2026-05-30)*
> *This supersedes the earlier `ROGUELITE_DESIGN.md` — the hybrid operations-manager model is the new direction.*

---

## Identity

**Throughput is a hybrid logistics roguelite.**

Automation runs the warehouse. The player is the operations manager who intervenes with emergency abilities, policy decisions, and upgrades. The game is a blend of:

- **Auto-battler** — automation handles baseline flow
- **Tactical crisis game** — emergency abilities are the primary skill expression
- **Roguelite** — upgrade picks between shifts shape the run
- **Operations simulation** — policy switching tunes automation behavior

---

## Core Player Skill

Reading system state → choosing the right emergency ability at the right time.

Policy switching is secondary support. Upgrades shape the emergency kit over a run. The player's best moments come from clutch interventions, not from picking the right background policy.

---

## Game Structure

| Component | Detail |
|---|---|
| Run length | 8 shifts to win |
| Shift duration | ~90–140s, escalating |
| Total run time | ~9 minutes (winning), ~3–5 minutes (failed) |
| Upgrade picks | 7 per run (after shifts 1–7) |
| Win condition | Survive shift 8 with HP > 0 |

---

## Loss Condition

**Breached orders only.** Each failed order costs System Integrity.

| Order Class | Breach Damage |
|---|---|
| Normal Store/Retrieve | -1 Integrity |
| VIP Order | -2 Integrity |
| Batch Order | -2 Integrity |
| Contract Order | Variable, shown on card |

Reach 0 Integrity → run ends immediately.

---

## Order Taxonomy

All order types exist in the design, phased by shift/difficulty.

| Type | Introduced | Notes |
|---|---|---|
| Store | Shift 1 | Input → storage, single item |
| Retrieve | Shift 1 | Storage → output, single item |
| VIP | Shift 2 (Normal) | Higher reward, shorter deadline, -2 breach |
| Same-type Batch | Shift 3 (Normal) | Linked child jobs, e.g. 3x RED |
| Mixed-type Batch | Shift 5 (Normal) | e.g. RED + BLUE + GREEN |
| Contract Order | Upgrade-driven | Only if player took a contract upgrade |

### Batch Order Model

Batch orders are a **linked single-order bundle**. Internally, the simulation creates child store/retrieve jobs. The parent order tracks progress (e.g. 2/3) and breaches when the parent timer expires.

- One deadline shared by all children
- Multiple cranes can work on separate children in parallel
- Progress displayed on the order card: `[■■□] 2/3`

### Contract Order Model

Contract Orders appear **only after the player selects a contract/debt upgrade** that explicitly creates them. The card shows:
- Special condition
- Breach damage
- Completion reward

Later: optional accept/decline contract events during shifts.

---

## Economy

### Emergency Power (EP)

| Property | Value |
|---|---|
| Max | 100 |
| Start per shift | 100 |
| Passive regen | None |
| Hard cap | 100 |

**Performance recovery:**

| Trigger | EP Gain |
|---|---|
| 4 orders completed without breach | +10 |
| VIP order completed | +5 |
| Queue cleared from 5+ orders | +10 |

### System Integrity

| Property | Value |
|---|---|
| Starting HP | 5 |
| Max HP | Upgradable |
| Loss | Breached orders (see above) |
| Spendable | Some abilities cost Integrity directly |

---

## Emergency Abilities (Core 5)

### 1. Priority Override

| Property | Value |
|---|---|
| Cost | 35 Emergency Power |
| Target | Order card |
| Effect | Hard replan. Interrupts safe cranes (no held item, not depositing). Assigns minimum cranes to service selected order immediately. |
| Input | Tap ability → tap order → fires instantly |
| Preview | Shows projected ETA: `24s → 11s · SAVES` |

### 2. Turbo Crane

| Property | Value |
|---|---|
| Cost | 35 Emergency Power |
| Target | Global |
| Effect | All cranes move/transfer faster for 6–8 seconds |
| Input | Tap ability → tap ability again to activate |
| Preview | Shows EP cost and projected effect on critical orders |

MVP is global all-crane boost. A future upgrade can convert to targeted/precision turbo.

### 3. Deadline Freeze

| Property | Value |
|---|---|
| Cost | 60 Emergency Power |
| Target | Global |
| Effect | All order timers pause for 4 seconds. Cranes continue moving. |
| Input | Tap ability → tap ability again to activate |
| Preview | Shows effective deadline extension |

### 4. Reject Contract

| Property | Value |
|---|---|
| Cost | 1 System Integrity |
| Target | Order card |
| Effect | Remove selected order from queue |
| Input | Tap ability → tap order → confirmation sheet appears |
| Confirmation | `REJECT? Cost: -1 HP. Avoids breach: -2 HP. Net: +1 HP.` |

### 5. Core Surge

| Property | Value |
|---|---|
| Cost | 1 System Integrity |
| Target | Global |
| Effect | Stronger all-crane boost for 6 seconds (stronger than Turbo) |
| Input | Tap ability → confirmation sheet |
| Confirmation | `CORE SURGE? Cost: -1 HP. Effect: all cranes boosted.` |

---

## Ability Preview / ETA System

### Exact ETA

Every order card shows exact ETA in seconds:

```
VIP RED
ETA 24s / Deadline 18s
LIKELY BREACH
```

ETA is deterministic — computed from current crane state, queue, and policy.

**Designations:**

- `ON TRACK` — ETA ≤ deadline
- `LIKELY BREACH` — ETA > deadline
- `BLOCKED` — impossible to complete (e.g., no matching item)

### Ability Preview

When the player selects an ability, compact order cards update with projected outcome:

**No ability selected:**
```
VIP RED · ETA 24/DL 18 · RISK
```

**Priority Override selected:**
```
VIP RED · 24→11 · SAVES
BATCH BLUE · 31→24 · RISK
```

**Outcome tags:**
- `SAVES` — ability prevents breach
- `RISK` — still likely to breach
- `NO EFFECT` — ability has no impact
- `NET +1 HP` — for Reject, shows net integrity gain

**Expanded queue** shows full detail:
```
VIP RETRIEVE RED
Deadline: 18s
Current ETA: 24s
With Priority Override: 11s
Outcome: SAVES ORDER
Cost: 35 EP
Reason: interrupts Crane 2 pickup
```

Ability preview **does not** recommend actions. It shows projections, not coaching.

---

## Policy System

Six policies available from the start.

| Policy | Behavior |
|---|---|
| Balanced / FIFO | Default. Fair, predictable baseline. |
| Deadline First | Prioritize shortest remaining deadline. |
| Nearest First | Minimize crane travel distance. |
| Storage First | Favor store orders to prevent input buildup. |
| Retrieval First | Favor retrieve orders to clear storage/output. |
| VIP First | Favor high-value VIP orders. |

### Policy Behavior

- Free to switch during a shift
- Cooldown: 6–8 seconds between switches
- New policy affects idle/future job assignment only
- Does not interrupt active crane jobs (unless upgraded)
- Policy cooldown is visible in the UI

---

## Mobile UI (Primary Design Constraint)

### Layout

```
┌──────────────────────────────┐
│        TOP HUD               │
│ Shift | Time | HP | EP       │
├──────────────────────────────┤
│                              │
│   MOBILE OPERATIONS BOARD    │
│                              │
│   Flow Status                │
│   Zone Summaries             │
│   Crane Task Board           │
│   Bottleneck Labels          │
│                              │
├──────────────────────────────┤
│   CRITICAL ORDER STRIP       │
│   [RED VIP 12s -2] [BATCH]   │
├──────────────────────────────┤
│   BOTTOM ACTION BAR          │
│ Policy|Prio|Turbo|Freeze|... │
└──────────────────────────────┘
```

### Mobile Operations Board

The mobile warehouse view is an **abstracted operations board**, not a miniature desktop grid.

| Section | Content |
|---|---|
| Flow Status | Input: OK / Storage: 82% / Output: Clear / Bottleneck |
| Zone Summaries | Zone A: Red-heavy 75%, Zone B: Blue/Green 43%, Zone C: Congested 92% |
| Crane Task Board | C1: VIP RED · ETA 5s / C2: STORE BLUE / C3: IDLE |
| Critical Order Strip | Top 2–3 highest-risk orders, always visible |

### Expandable Queue

- Tap/swipe the critical order strip upward to see full queue
- Full queue shows all orders with diagnostics, batch progress, contract metadata
- When ability targeting is active, valid targets are highlighted

### Desktop

- Detailed grid/side panels remain as the primary desktop experience
- Keyboard shortcuts: none in MVP (mouse/touch only)

### Input Model

| Ability Type | Input Flow |
|---|---|
| EP abilities (Priority, Turbo, Freeze) | Tap ability → preview → tap target/activate → fires immediately |
| Integrity abilities (Reject, Surge) | Tap ability → preview → target → confirmation sheet → confirm |

---

## Upgrades

### Structure

- After every completed shift (1–7): pick 1 of 3 upgrade cards
- Categories may be mixed within a single offering

| Category | Examples |
|---|---|
| Safe Automation | Motor Tuning I, Hydraulics I, Second Crane |
| Ability Mutations | Long Freeze, Efficient Turbo, Command Authority |
| EP Economy | Backup Battery, Rapid Recovery, VIP Bonus Power |
| Contract/Debt Upgrades | Hostile SLA, Debt Financing, Union Rules |

### Upgrade Design Principles

- Weirdness is allowed (controlled mutations, debt, temporary constraints, score penalties)
- **No run-killing hidden RNG** — no random failure, no random deletion, no random backfire
- Tradeoffs must be explicit before selection
- Contract orders only appear if the player selected a contract upgrade
- Every upgrade meaningfully changes how the player handles crisis

### Example Contract Upgrades

```
Hostile SLA
Orders expire 20% faster, but completed orders restore double EP.

Debt Financing
Core Surge costs 0 integrity this shift. Next shift starts with -50 EP.

Union Rules
Policy cooldown doubled, but cranes move 25% faster.

Corporate Insurance
First Reject Contract each shift costs 70 EP instead of 1 integrity.
```

---

## Difficulty Modes

| System | Normal | Hard | Brutal |
|---|---|---|---|
| Starting EP | 100 | 90 | 80 |
| EP recovery | baseline | -20% | -40% |
| VIP starts | Shift 2 | Shift 1–2 | Shift 1 |
| Same-type batch | Shift 3 | Shift 2 | Shift 2 |
| Mixed batch | Shift 5 | Shift 4 | Shift 3 |
| Spawn rate | baseline | +15–20% | +35–45% |
| Deadline length | baseline | -10–15% | -25–30% |
| Score multiplier | 1× | 1.5× | 2× |

Higher difficulty tightens resources and accelerates complexity timing. Controls remain equally responsive.

---

## Implementation Phases

### Phase 1 — Simulation Foundations

Goal: make the simulation capable of supporting the new design.

- `automationPolicy` enum with 6 policies
- Full order taxonomy: Store, Retrieve, VIP, Batch (parent/child), Contract
- Variable breach damage by order class
- Emergency Power resource
- Policy cooldown (6–8s, free to switch)
- Order diagnostics (bottleneck labels)
- Exact ETA prediction service
- Ability preview calculation hooks
- Safe interruption model for Priority Override

### Phase 2 — Core Abilities

Goal: make the hybrid gameplay real.

- Priority Override (hard replan, smart min cranes, safe interruption)
- Turbo (global all-crane boost)
- Deadline Freeze (global timer pause)
- Reject Contract (costs integrity, confirmation required)
- Core Surge (global strong boost, costs integrity, confirmation)
- ETA recalculation after every ability
- Preview outcome tags: SAVES / RISK / NO EFFECT / NET +HP

### Phase 3 — Mobile-First UI

Goal: make it playable on mobile.

- Top HUD: Shift, Time, Integrity, Queue, EP
- Mobile operations board: flow status, zone summaries, crane task board, bottleneck labels
- Critical order strip (always visible)
- Expandable full queue
- Bottom action bar: Policy, Priority, Turbo, Freeze, Reject, Surge
- Policy picker bottom sheet
- Integrity-action confirmation sheets
- Ability preview UI (compact: `24→11 · SAVES`, expanded: full detail)
- Desktop: detailed grid + operations panel

### Phase 4 — Upgrades and Contracts

Goal: make runs feel roguelite.

- After-shift 3-choice upgrade picks
- Upgrade pool: safe / ability / economy / contract categories
- Contract order spawning from contract upgrades
- Upgrade rarity distribution
- Controlled debt/weirdness upgrades

### Phase 5 — Balance and Tuning

Goal: make Normal/Hard/Brutal meaningfully different.

- Difficulty curves per table above
- Number tuning for all shift parameters
- EP economy tuning
- Upgrade cost/rarity balance
- Mobile visual verification

---

## First Vertical Slice (Phase 1 + Phase 2 + partial Phase 3)

A 3-shift run including:

- Shift 1: Store/Retrieve only, teach flow
- Shift 2: Introduce VIP orders and variable breach damage
- Shift 3: Introduce same-type Batch Orders
- All 5 core abilities
- Exact ETA + ability preview
- Mobile operations board (simplified)
- Bottom action bar
- One upgrade pick after Shift 1
- All 6 policies available

---

## Design Principles (Locked)

| Principle | Rule |
|---|---|
| Player skill | Reading system state → choosing the right emergency ability |
| Loss | Breached orders only. No queue overload drain. |
| Integrity | Spendable for desperation abilities. Confirm required. |
| RNG | No hidden run-killing randomness. All tradeoffs explicit. |
| Mobile | Mobile-first. Operations board, not miniature grid. |
| ETA | Exact ETA. Ability preview shows projections, not recommendations. |
| Upgrades | Controlled weirdness + debt. Player opts into risk. |
| Policy | Free to switch, cooldown-limited, affects idle/future only. |
| Input | EP abilities: fast. Integrity abilities: confirm. No keyboard shortcuts in MVP. |
