# AGENTS.md (Fleet)

## Project Overview

**Fleet** is the supporting engine for the **Throughput** game. It contains the Rust-based simulation core (WASM) and the telemetry persistence layer.

## Tech Stack

- **Simulation core:** Rust → WASM (wasm-pack, wasm-bindgen)
- **Frontend:** React + TypeScript + Vite
- **Canvas:** Konva.js or raw Canvas API
- **State management:** Zustand
- **Styling:** Tailwind CSS
- **Backend (logging only):** Axum on VPS

## Directory Structure

```
fleet/
├── crates/
│   ├── agv-core/          # Pure Rust simulation logic (no WASM deps)
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── vehicle.rs      # Vehicle FSM
│   │   │   ├── order.rs        # Order FSM
│   │   │   ├── traffic.rs      # Zone/segment FSM
│   │   │   ├── plant.rs        # Plant graph model
│   │   │   ├── pathfinding.rs  # A* implementation
│   │   │   └── simulation.rs   # Main simulation loop
│   │   └── Cargo.toml
│   │
│   ├── agv-wasm/          # WASM bindings (thin wrapper)
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   │
│   └── agv-logger/        # VPS logging server
│       ├── src/main.rs
│       └── Cargo.toml
│
├── web/                   # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── PlantView.tsx       # Main canvas
│   │   │   ├── VehicleRenderer.tsx
│   │   │   ├── FSMInspector.tsx    # Debug panel
│   │   │   ├── ControlPanel.tsx    # Orders, dispatch
│   │   │   └── LogPanel.tsx
│   │   ├── hooks/
│   │   │   └── useSimulation.ts
│   │   ├── stores/
│   │   │   └── simulationStore.ts
│   │   └── wasm/                   # WASM bindings
│   │       └── index.ts
│   ├── package.json
│   └── vite.config.ts
│
├── plants/                # JSON plant definitions
│   └── demo-warehouse.json
│
├── docs/
│   ├── PLAN.md
│   ├── ARCHITECTURE.md
│   ├── FSM.md
│   └── API.md
│
└── AGENTS.md              # This file
```

## Key Constraints

1. **No backend for simulation** — all sim logic runs client-side in WASM
2. **Tick-based simulation** — 60 ticks/sec, no discrete-event
3. **Exact rendering** — React renders exactly what Rust says, no interpolation
4. **10 AGV scale** — optimize for 10 vehicles, not 1000
5. **Server logging** — POST logs to VPS for AI agent debugging

## Commands

```bash
# Build WASM
cd crates/agv-wasm && wasm-pack build --target web --out-dir ../../web/src/wasm/pkg

# Run frontend
cd web && npm run dev

# Run log server (on VPS)
cd crates/agv-logger && cargo run --release

# Run core tests
cd crates/agv-core && cargo test
```

## Agent Guidelines

### When modifying Rust FSM code:
- Keep FSM transitions explicit — use `match` exhaustively
- Every state transition should emit a log event
- Write unit tests for FSM transitions in `agv-core`

### When modifying React:
- Don't add interpolation/smoothing — render exact WASM state
- Keep re-renders minimal — use Zustand selectors
- FSMInspector must stay in sync with Rust types

### When debugging:
- Logs go to `POST /log` on VPS
- Use `dump_debug_state()` for full simulation snapshot
- Check `/var/log/agv-sim/{session_id}.log` on server

### Common Pitfalls:
- WASM serialization is expensive — don't call `get_state()` more than once per frame
- `wasm-bindgen` doesn't support nested enums well — flatten for JS boundary
- Konva re-renders entire layer by default — use `listening={false}` on static shapes