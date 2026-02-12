# PLAN.md

## Project Goal

Build a browser-based AGV fleet simulator that demonstrates:
- Real-time multi-vehicle coordination
- FSM-based state management (Vehicle, Order, Traffic)
- Traffic control and deadlock prevention

Target: Portfolio piece for robotics/automation grad school applications.

## Milestones

### Phase 1: Foundation (Week 1-2)

**Goal:** Static plant renders, single vehicle moves manually.

- [x] Project scaffolding (Rust workspace, React app, WASM build pipeline)
- [x] Plant model: nodes, edges, stations (Rust structs)
- [x] JSON plant loader
- [x] Canvas rendering: nodes as circles, edges as lines
- [x] Single vehicle rendered at a node
- [x] Click node → vehicle teleports there (no pathfinding yet)
- [x] Basic logging to VPS working

**Exit criteria:** Can load `demo-warehouse.json`, see plant, click to move vehicle.

---

### Phase 2: Vehicle FSM + Movement (Week 3-4)

**Goal:** Vehicle moves along paths with proper FSM.

- [x] A* pathfinding on plant graph
- [x] Vehicle FSM: IDLE, MOVING_TO_PICKUP, LOADING, MOVING_TO_DROP, UNLOADING, ERROR
- [x] Tick loop: advance vehicle position along path each tick
- [x] WASM → React state streaming (60fps)
- [x] Vehicle animates smoothly along edges
- [x] FSM Inspector shows current vehicle state
- [ ] Speed control (pause, 1x, 2x, 5x)

**Exit criteria:** Vehicle pathfinds and moves, FSM visible in UI. ✅ DONE

---

### Phase 3: Orders + Dispatch (Week 5-6)

**Goal:** Create transport orders, dispatch to vehicles.

- [ ] Order FSM: CREATED → DISPATCHED → PICKUP → IN_TRANSIT → DROPOFF → COMPLETED
- [ ] Order data structure (source station, dest station, payload)
- [ ] Simple dispatcher: assign to nearest idle vehicle
- [ ] Vehicle FSM extended: MOVING_TO_PICKUP, LOADING, MOVING_TO_DROP, UNLOADING
- [ ] Loading/unloading takes N ticks
- [ ] UI: Create order panel, order list, order status
- [ ] Order lifecycle visible in FSM Inspector

**Exit criteria:** Can create order, watch vehicle pickup and deliver.

---

### Phase 4: Traffic Control (Week 7-8)

**Goal:** Zone reservation prevents collisions and deadlocks.

- [ ] Zone/Segment FSM: FREE, RESERVED, OCCUPIED
- [ ] Vehicle requests zone before entering
- [ ] If zone occupied → vehicle waits (WAITING state)
- [ ] Visualize zone states (color: green/yellow/red)
- [ ] Basic deadlock detection (cycle in wait-graph)
- [ ] Deadlock resolution: one vehicle backs off
- [ ] Multi-vehicle stress test (5+ orders simultaneously)

**Exit criteria:** 10 vehicles, no collisions, deadlocks detected/resolved.

---

### Phase 5: Polish + Demo (Week 9-10)

**Goal:** Portfolio-ready demo.

- [ ] Scenario presets (load pre-defined order sequences)
- [ ] Event log panel (human-readable history)
- [ ] Statistics: orders completed, avg delivery time, vehicle utilization
- [ ] README with architecture diagrams
- [ ] Demo video / GIF for portfolio
- [ ] Deploy to VPS (static hosting)

**Exit criteria:** Shareable link, impressive demo, clean code.

---

## Future (Post-MVP)

- Plant editor (draw nodes/edges in UI)
- Multiple dispatch algorithms (nearest, round-robin, optimization)
- Real AGV driver integration (TCP/Modbus mock)
- openTCS XML import
- Multi-floor / elevator support