# ARCHITECTURE.md

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PlantView   │  │ FSMInspector│  │ ControlPanel        │ │
│  │ (Canvas)    │  │             │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         └────────────────┴──────────┬──────────┘            │
│                          ┌──────────▼──────────┐            │
│                          │  useSimulation()    │            │
│                          │  Zustand store      │            │
│                          └──────────┬──────────┘            │
│                                     │                       │
│                          ┌──────────▼──────────┐            │
│                          │   WASM Module       │            │
│                          │   (agv-wasm)        │            │
│                          └──────────┬──────────┘            │
└─────────────────────────────────────┼───────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────┐
│                 Rust WASM (agv-core)                        │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │                  Simulation                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            ││
│  │  │ Vehicles │  │  Orders  │  │  Zones   │            ││
│  │  │ Vec<V>   │  │ Vec<O>   │  │ HashMap  │            ││
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            ││
│  │       │             │             │                   ││
│  │       ▼             ▼             ▼                   ││
│  │  ┌──────────────────────────────────────────────────┐││
│  │  │              tick() loop                         │││
│  │  │  1. Process vehicle FSMs                         │││
│  │  │  2. Process order FSMs                           │││
│  │  │  3. Update zone reservations                     │││
│  │  │  4. Check deadlocks                              │││
│  │  │  5. Emit events to log                           │││
│  │  └──────────────────────────────────────────────────┘││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ Plant (graph)       │  │ Pathfinder (A*)              │ │
│  │ - nodes: Vec<Node>  │  │ - find_path(from, to)        │ │
│  │ - edges: Vec<Edge>  │  │ - returns Vec<NodeId>        │ │
│  │ - stations          │  │                              │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ POST /log (fire-and-forget)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Log Server (agv-logger)                  │
│  - Receives log entries via POST /log                       │
│  - Writes to logs/{session}.log                             │
│  - Runs on port 3001                                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User clicks "Create Order"
         │
         ▼
React ──► simulation.create_order(src, dst) ──► Rust
                                                  │
                                                  ▼
                                          Order created
                                          Dispatcher assigns vehicle
                                          Vehicle FSM: IDLE → MOVING_TO_PICKUP
                                                  │
                                                  ▼
         ┌────────────────────────────────────────┘
         │
         ▼
    tick() called 60x/sec
         │
         ├──► Vehicle moves along path
         ├──► Zone reservations updated
         ├──► Events logged
         │
         ▼
    getState() ──► SimulationState { vehicles, plant }
         │
         ▼
    React re-renders canvas
```

## Key Design Decisions

### 1. Rust crate separation

`agv-core` has no WASM dependencies — pure Rust, fully testable.
`agv-wasm` is a thin wrapper that exposes `agv-core` to JavaScript.

This allows:
- Unit testing FSM logic without browser
- Potential reuse for native server later
- Cleaner dependency graph

### 2. State boundary

Rust owns all simulation state. React is a dumb renderer.

Every frame:
1. React calls `simulation.tick()`
2. React calls `simulation.get_state()`
3. React renders the returned state

No state duplication. No synchronization bugs.

### 3. Tick-based timing

Fixed 60 ticks/sec (16.67ms per tick).

Simulation advances deterministically. Same inputs = same outputs.
Enables replay/debugging by recording inputs.

### 4. Flat state for JS boundary

Nested Rust enums don't serialize well to JS. State is flattened:

```rust
// Internal (rich types)
enum VehicleState {
    Moving { path: Vec<NodeId>, progress: f32 },
    Loading { station: NodeId, remaining: u32 },
}

// For JS (flat)
struct VehicleStateJS {
    state_type: String,        // "moving", "loading", etc.
    target_node: Option<u32>,
    progress: Option<f32>,
    remaining_ticks: Option<u32>,
}
```

### 5. Logging strategy

Logs are fire-and-forget POST to VPS. Never block simulation.

```
[tick=1042] [INFO] Vehicle 3: IDLE → MOVING_TO_PICKUP (order=7)
[tick=1042] [INFO] Zone A3: FREE → RESERVED (vehicle=3)
[tick=1098] [WARN] Vehicle 3: waiting for zone B2 (occupied by vehicle=1)
[tick=1200] [ERROR] Deadlock detected: vehicles=[1,3], zones=[A3,B2]
```

Session ID generated on page load. AI agent fetches logs by session.