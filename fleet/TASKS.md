# TASKS.md

Granular tasks for AI agents. Each task should be completable in one session.

---

## 📊 Project Status Summary

**Last Updated:** 2025-12-19  
**Current Phase:** Phase 2 - Vehicle FSM + Movement (core complete)

### ✅ Completed
- TASK-001: Project scaffolding
- TASK-002: Plant Data Structures
- TASK-003: Demo plant JSON
- TASK-004: Canvas Plant Renderer
- TASK-005: Vehicle Renderer
- TASK-006: WASM Integration Hook
- TASK-007: Log Server Setup
- TASK-008: Client-side Log Emitter
- TASK-009: Vehicle FSM Implementation
- TASK-010: A* Pathfinding
- TASK-011: Vehicle Movement Along Path
- TASK-012: FSM Inspector Panel
- TASK-013: Speed Controls

### Next Priority Tasks
1. **TASK-014:** Order FSM Implementation
2. **TASK-015:** Dispatcher (Nearest Vehicle)
3. **TASK-016:** Order Creation UI

### 🎯 To Run Current State
```bash
cd web && npm run dev  # Opens at http://localhost:3000
```

**Note for Agents:** The foundation is complete. WASM builds successfully. Focus next on implementing plant data loading (TASK-002) and visualization (TASK-004).

---

## Phase 1: Foundation

### TASK-001: Project Scaffolding
**Status:** ✅ DONE (2025-12-18)  
**Files:** Root directory  
**Description:**
1. Create Rust workspace with three crates: `agv-core`, `agv-wasm`, `agv-logger`
2. Initialize React app with Vite in `web/`
3. Configure wasm-pack build script
4. Add basic Cargo.toml dependencies (serde, wasm-bindgen)
5. Verify "hello world" WASM compiles and loads in browser

**Acceptance:**
- ✅ `cargo build` succeeds for all crates
- ✅ `npm run dev` starts React app
- ✅ Console shows "WASM loaded" message

**Verification Results:**
- Cargo tests: 3/3 passed (`agv-core`)
- WASM build: Successful (20.86s)
- npm install: 141 packages, 0 vulnerabilities
- Full walkthrough: See `.gemini/antigravity/brain/*/walkthrough.md`

---

### TASK-002: Plant Data Structures
**Status:** ✅ DONE (2025-12-18)  
**Files:** `crates/agv-core/src/plant.rs`  
**Description:**
1. Define `Node`, `Edge`, `Station` structs
2. Define `Plant` struct with adjacency list
3. Implement `Plant::from_json()`
4. Write unit tests for loading demo plant

**Acceptance:**
- ✅ `cargo test -p agv-core` passes
- ✅ Can load `plants/demo-warehouse.json`

**Verification Results:**
- Unit tests: 4/4 passed (JSON loading, adjacency list, bidirectional edges)
- Integration: Successfully loaded `demo-warehouse.json` in test environment.
- Walkthrough: [walkthrough.md](file:///home/dev/.gemini/antigravity/brain/fa4579b5-c285-44a3-b9f1-b4809c626c25/walkthrough.md)

---

### TASK-003: Demo Plant JSON
**Status:** ✅ DONE (2025-12-18)  
**Files:** `plants/demo-warehouse.json`  
**Description:**
1. Create warehouse layout: 6 nodes, 7 edges (as per API.md example)
2. 3 stations (pickup, dropoff, both)
3. 2 initial vehicles

**Acceptance:**
- ✅ Valid JSON matching PlantDefinition schema
- ✅ Nodes form connected graph

**Notes:** Created with 6 nodes (START, A1, A2, B1, B2, CHARGE) and 6 edges forming a connected warehouse layout.

---

### TASK-004: Canvas Plant Renderer
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/PlantView.tsx`  
**Description:**
1. Set up canvas (Konva)
2. Render nodes as circles (blue for stations, gray for waypoints)
3. Render edges as lines
4. Pan and zoom support
5. **TASK-027**: Click-to-teleport interaction

**Acceptance:**
- ✅ Plant visible on screen
- ✅ Can pan/zoom
- ✅ Node types visually distinct
- ✅ Click-to-teleport works for selected vehicles

---

### TASK-005: Vehicle Renderer
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/VehicleRenderer.tsx`  
**Description:**
1. Render vehicle as triangle shape
2. Position based on `position: {x, y}`
3. Color based on state (idle=gray, moving=blue, waiting=yellow, error=red)
4. Show vehicle ID label
5. Visual highlight for selected vehicle

**Acceptance:**
- ✅ Vehicle appears at correct position
- ✅ Color changes with state
- ✅ Selection highlight works

---

### TASK-006: WASM Integration Hook
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/hooks/useSimulation.ts`, `crates/agv-wasm/src/lib.rs`  
**Description:**
1. Export `Simulation` class from Rust
2. Implement `new()`, `tick()`, `get_state()`
3. Create React hook that initializes WASM and runs tick loop
4. Connect to Zustand store

**Acceptance:**
- ✅ `useSimulation()` returns current state
- ✅ State updates 60fps
- ✅ Re-initialization with new plant JSON works

---

### TASK-007: Log Server Setup
**Status:** ✅ DONE (2025-12-19)  
**Files:** `crates/agv-logger/src/main.rs`  
**Description:**
1. Axum server with POST /log endpoint
2. Write to file `logs/{session}.log`
3. CORS configuration
4. Session-based log separation

**Acceptance:**
- ✅ Can POST log entry from browser
- ✅ Logs persisted to files in `logs/`
- ✅ CORS allows requests from frontend

---

### TASK-008: Client-side Log Emitter
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/utils/logger.ts`  
**Description:**
1. JS utility `logger.info()`, `logger.error()`, etc.
2. Global error handlers for uncaught exceptions and promise rejections
3. Dynamic URL based on hostname
4. Generate session ID on page load

**Acceptance:**
- ✅ Browser errors appear in server log files
- ✅ Custom logs sent correctly
- ✅ No blocking on network errors

---

## Phase 2: Vehicle FSM + Movement

### TASK-009: Vehicle FSM Implementation
**Status:** ✅ DONE (2025-12-19)  
**Files:** `crates/agv-core/src/vehicle.rs`  
**Description:**
1. Define `VehicleState` enum (as per FSM.md)
2. Implement `Vehicle::tick()` state machine
3. Log all state transitions
4. Unit tests for each transition

**Acceptance:**
- All FSM transitions covered by tests
- Transitions emit log events

---

### TASK-010: A* Pathfinding
**Status:** ✅ DONE (2025-12-19)  
**Files:** `crates/agv-core/src/pathfinding.rs`, `crates/agv-core/src/plant.rs`  
**Description:**
1. Implement A* on plant graph
2. Heuristic: Euclidean distance
3. Return `Vec<NodeId>` path
4. Handle unreachable destinations

**Acceptance:**
- Finds shortest path on demo plant
- Returns empty vec for unreachable

---

### TASK-011: Vehicle Movement Along Path
**Status:** ✅ DONE (2025-12-19)  
**Files:** `crates/agv-core/src/vehicle.rs`, `crates/agv-core/src/simulation.rs`  
**Description:**
1. In `MovingToPickup`/`MovingToDrop` states
2. Each tick: advance `edge_progress` by speed
3. When progress >= 1.0: move to next edge
4. Calculate `position: (x, y)` by interpolating edge

**Acceptance:**
- Vehicle smoothly moves along edges
- Position correctly interpolated

---

### TASK-012: FSM Inspector Panel
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/FSMInspector.tsx`  
**Description:**
1. Collapsible panel showing all vehicles
2. For each: ID, state_type, current details
3. Click to select vehicle (highlight on map)
4. Show orders and zones tabs

**Acceptance:**
- ✅ Real-time FSM state visible
- ✅ Selection syncs with map
- ✅ Collapsible sections for Vehicles/Orders/Zones
- ✅ Vehicle details (position, node, order, battery)

---

### TASK-013: Speed Controls
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/ControlPanel.tsx`, `web/src/hooks/useSimulation.ts`, `web/src/stores/simulationStore.ts`  
**Description:**
1. Pause/Resume button
2. Speed selector: 0.5x, 1x, 2x, 5x, 10x
3. Tick counter display
4. JS-side tick loop management (no WASM changes needed)

**Acceptance:**
- ✅ Simulation pauses/resumes
- ✅ Speed multiplier affects tick rate
- ✅ Tick counter visible and reactive

---

## Phase 3: Orders + Dispatch

### TASK-014: Order FSM Implementation
**Status:** TODO  
**Files:** `crates/agv-core/src/order.rs`  
**Description:**
1. Define `OrderState` enum
2. Define `Order` struct
3. Implement state transitions
4. Link order FSM to vehicle FSM events

**Acceptance:**
- Order progresses through lifecycle
- State changes logged

---

### TASK-015: Dispatcher (Nearest Vehicle)
**Status:** TODO  
**Files:** `crates/agv-core/src/dispatcher.rs`  
**Description:**
1. When order created: find nearest IDLE vehicle
2. Compute distance using pathfinding
3. Assign order to vehicle
4. Handle no available vehicle (order stays CREATED)

**Acceptance:**
- Orders get assigned to nearest vehicle
- Queue works when all vehicles busy

---

### TASK-016: Order Creation UI
**Status:** TODO  
**Files:** `web/src/components/ControlPanel.tsx`  
**Description:**
1. Source station dropdown
2. Destination station dropdown
3. "Create Order" button
4. Order list with status

**Acceptance:**
- Can create orders from UI
- Order list updates in real-time

---

### TASK-017: Loading/Unloading Timing
**Status:** TODO  
**Files:** `crates/agv-core/src/vehicle.rs`  
**Description:**
1. LOADING state: countdown `remaining_ticks` (e.g., 120 = 2 seconds)
2. UNLOADING state: same
3. Visual indicator in UI (progress bar or countdown)

**Acceptance:**
- Vehicle waits at station
- Countdown visible in FSM Inspector

---

## Phase 4: Traffic Control

### TASK-018: Zone Data Structure
**Status:** TODO  
**Files:** `crates/agv-core/src/traffic.rs`  
**Description:**
1. Define `Zone` struct (one per edge)
2. Define `ZoneState` enum
3. Zone manager: `HashMap<EdgeId, Zone>`
4. Methods: `request()`, `enter()`, `exit()`

**Acceptance:**
- Zones track state correctly
- Unit tests pass

---

### TASK-019: Zone Reservation Logic
**Status:** TODO  
**Files:** `crates/agv-core/src/vehicle.rs`, `traffic.rs`  
**Description:**
1. Before entering edge: request zone
2. If zone free: reserve it
3. If zone occupied: enter WAITING_FOR_ZONE
4. On zone freed: check waiting vehicles, grant reservation

**Acceptance:**
- Two vehicles don't occupy same zone
- Waiting vehicles resume when zone frees

---

### TASK-020: Zone Visualization
**Status:** TODO  
**Files:** `web/src/components/PlantView.tsx`  
**Description:**
1. Color edges by zone state
2. FREE = default, RESERVED = yellow, OCCUPIED = red
3. Show which vehicle holds zone on hover

**Acceptance:**
- Zone colors update in real-time
- Clear visual distinction

---

### TASK-021: Deadlock Detection
**Status:** TODO  
**Files:** `crates/agv-core/src/traffic.rs`  
**Description:**
1. Build wait-for graph each tick
2. Detect cycles using DFS
3. Log deadlock with involved vehicles/zones
4. Emit event for UI

**Acceptance:**
- Deadlock detected in test scenario
- Clear log message

---

### TASK-022: Deadlock Resolution
**Status:** TODO  
**Files:** `crates/agv-core/src/traffic.rs`  
**Description:**
1. When deadlock detected: pick lowest ID vehicle
2. Force vehicle to release reservation and back off
3. Vehicle retries after N ticks
4. Log resolution

**Acceptance:**
- Deadlock resolves automatically
- Simulation continues

---

## Phase 5: Polish

### TASK-023: Event Log Panel
**Status:** TODO  
**Files:** `web/src/components/LogPanel.tsx`  
**Description:**
1. Scrollable log view in UI
2. Filter by level (info/warn/error)
3. Filter by category (vehicle/order/zone)
4. Copy all button

**Acceptance:**
- Logs visible in app
- Filters work

---

### TASK-024: Statistics Dashboard
**Status:** TODO  
**Files:** `web/src/components/StatsPanel.tsx`  
**Description:**
1. Orders completed count
2. Average delivery time
3. Vehicle utilization (% time not idle)
4. Real-time updating

**Acceptance:**
- Stats accurate
- Updates as simulation runs

---

### TASK-025: Scenario Presets
**Status:** TODO  
**Files:** `plants/scenarios/`, `web/src/`  
**Description:**
1. JSON format for order sequences with timing
2. "Load Scenario" dropdown
3. Auto-create orders at specified ticks
4. At least 3 presets: simple, busy, deadlock-prone

**Acceptance:**
- Can load and run scenarios
- Scenarios demonstrate different behaviors
---

### TASK-026: Manual JSON Loading UI
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/ControlPanel.tsx`, `web/src/hooks/useSimulation.ts`  
**Description:**
1. Add file input to Control Panel
2. Implement FileReader to read JSON content
3. Call `reinit(json)` on simulation hook
4. Clear input after successful load

**Acceptance:**
- ✅ User can select a local JSON file
- ✅ Simulation reloads with new plant layout
- ✅ UI remains responsive during load

---

### TASK-027: Click-to-Teleport Interaction
**Status:** ✅ DONE (2025-12-19)  
**Files:** `web/src/components/PlantView.tsx`, `web/src/components/VehicleRenderer.tsx`, `crates/agv-wasm/src/lib.rs`  
**Description:**
1. Implement vehicle selection in store
2. Add highlight effect to selected vehicle
3. Make nodes clickable in PlantView
4. Call WASM `teleportVehicle` on node click
5. Deselect on background click

**Acceptance:**
- ✅ Clicking vehicle selects it (blue highlight)
- ✅ Clicking node teleports selected vehicle
- ✅ Clicking background deselects
