# AGV Fleet Simulation & Telemetry

This project provides the core simulation engine and telemetry persistence for the **Throughput** roguelike game.

- **Telemetery**: Persists routefinding data from the main game via `agv-logger`.
- **Simulation**: Provides a high-fidelity Rust simulation core (WASM) for the visualizer.

## Prerequisites

**Status:** ✅ All installed and verified

- **Rust** 1.70+ with `wasm32-unknown-unknown` target
- **wasm-pack** (`cargo install wasm-pack`) - v0.13.1 ✅
- **Node.js** 18+ and npm - v24.12.0 ✅

## Quick Start

**Current Status:** ✅ Phase 2 (Vehicle FSM + Movement) complete. Moving to Phase 3.

The simulation is set up with:
- ✅ Rust workspace (agv-core, agv-wasm, agv-logger)
- ✅ React + TypeScript frontend
- ✅ WASM bindings with real-time state sync
- ✅ Interactive Plant Visualization (Pan/Zoom/Teleport)
- ✅ Log Server & Client-side Emitter
- ✅ Manual Plant JSON Loading
- ✅ Vehicle FSM (Idle, MovingToPickup, Loading, MovingToDrop, Unloading)
- ✅ A* Pathfinding with Euclidean heuristic
- ✅ Smooth vehicle movement along paths

```bash
# Run the frontend (WASM already built)
cd web
npm run dev
```

Open http://localhost:3000

**To rebuild WASM after Rust changes:**
```bash
cd web
npm run wasm:build  # or manually: cd ../crates/agv-wasm && wasm-pack build --target web --out-dir ../../web/src/wasm/pkg
```

**To run the log server (optional):**
```bash
cd crates/agv-logger
cargo run --release  # Runs on http://0.0.0.0:3001
```

## Documentation

| Document | Purpose |
|----------|---------|
| [AGENTS.md](./AGENTS.md) | AI agent guidelines, directory structure, commands |
| [PLAN.md](./docs/PLAN.md) | Milestones and timeline |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design and data flow |
| [FSM.md](./docs/FSM.md) | State machine specifications |
| [api.md](./docs/api.md) | Interface contracts |
| [TASKS.md](./TASKS.md) | Granular implementation tasks |

## Routefinding Telemetry 

The `agv-logger` service now supports persisting routefinding telemetry from the `Throughput` simulation. 
- **Endpoint**: `POST /telemetry` 
- **Storage**: `logs/telemetry.jsonl` 
- **Data**: session ID, algorithm, start/target positions, nodes visited, execution time, and success status. 

## Features

### Implemented ✅
- **Project Foundation**: Rust workspace + React frontend + WASM bindings
- **Plant Model**: Graph-based warehouse layout with nodes and bidirectional edges
- **Visualization**: Interactive Konva canvas with pan/zoom
- **Vehicle Rendering**: AGVs displayed with state-based coloring (idle=gray, moving=blue)
- **Manual Control**: Click-to-teleport for vehicle testing
- **JSON Loading**: Automatic and manual loading of plant layouts
- **Logging**: Rust log server (Axum) + Browser error/event capture
- **Vehicle FSM**: Full state machine (Idle, MovingToPickup, Loading, MovingToDrop, Unloading, Error)
- **A* Pathfinding**: Shortest path calculation on plant graph with Euclidean heuristic
- **Vehicle Movement**: Smooth interpolation along edges with path tracking

### Planned 🚧
- **Dispatcher**: Order assignment to nearest idle vehicle
- **Traffic Control**: Zone reservation with deadlock detection/resolution
- **Statistics**: Delivery time, vehicle utilization metrics
- **Scenario Presets**: Pre-configured test scenarios
- **Speed Controls**: Pause/resume and speed multiplier

## Tech Stack

- Rust (simulation core)
- WebAssembly (browser execution)
- React + TypeScript (frontend)
- Konva.js (2D canvas visualization via react-konva)
- Axum (optional log server)

## Architecture

```
┌─────────────────┐       ┌──────────────────────┐
│  React Frontend │◄─────►│   WASM Module (Rust) │
│    (Konva.js)   │       └──────────┬───────────┘
└─────────────────┘                  │
                                     ▼
                        ┌──────────────────────┐
                        │   Simulation Engine  │
                        │  ├─ Vehicle FSM      │
                        │  ├─ Order FSM        │
                        │  ├─ Zone FSM         │
                        │  └─ Pathfinding      │
                        └──────────┬───────────┘
                                   │ (logs)
                                   ▼
                        ┌──────────────────────┐
                        │  Log Server (Axum)   │
                        │     [Optional]       │
                        └──────────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [AGENTS.md](./AGENTS.md) for coding guidelines and directory structure.

## License

[MIT](./LICENSE)