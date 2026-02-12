# API.md

## WASM ↔ JavaScript Interface

### Simulation Class

```typescript
// Exposed from Rust via wasm-bindgen

class Simulation {
  // Lifecycle
  constructor(plantJson: string): Simulation;
  free(): void;  // cleanup WASM memory
  
  // Core loop
  tick(dt: number): void;
  getState(): SimulationState;
  
  // Commands
  addVehicle(id: string, x: number, y: number): void;
  addOrder(id: string, pickup: string, delivery: string): void;
  teleportVehicle(vehicleId: string, x: number, y: number): void;
  
  // Debug
  dumpDebugState(): string;  // JSON snapshot
}
```

### State Types (JS side)

```typescript
interface SimulationState {
  tick: number;
  vehicles: VehicleState[];
  orders: OrderState[];
  zones: ZoneState[];
}

interface VehicleState {
  id: number;
  state_type: 'idle' | 'moving_to_pickup' | 'waiting' | 'loading' | 
              'moving_to_drop' | 'unloading' | 'error';
  position: { x: number; y: number };
  current_node: number | null;
  target_node: number | null;
  order_id: number | null;
  blocked_by_zone: number | null;  // if waiting
  remaining_ticks: number | null;  // if loading/unloading
}

interface OrderState {
  id: number;
  source: number;
  destination: number;
  state_type: 'created' | 'dispatched' | 'pickup' | 'transit' | 
              'dropoff' | 'completed' | 'cancelled';
  vehicle_id: number | null;
  created_at_tick: number;
  completed_at_tick: number | null;
}

interface ZoneState {
  id: number;
  edge_id: number;
  state_type: 'free' | 'reserved' | 'occupied';
  vehicle_id: number | null;
}
```

---

## Plant JSON Schema

```typescript
interface PlantDefinition {
  name: string;
  nodes: NodeDef[];
  edges: EdgeDef[];
  stations: StationDef[];
}

interface NodeDef {
  id: string;
  position: [number, number];
  type?: 'waypoint' | 'station' | 'charger';
}

interface EdgeDef {
  from: string;      // node id
  to: string;        // node id
  cost: number;
  bidirectional?: boolean;
}

interface StationDef {
  id: string;
  node_id: string;
  type: 'pickup' | 'dropoff' | 'both';
  name: string;
}
```

### Example Plant JSON

```json
{
  "name": "Demo Warehouse",
  "nodes": [
    { "id": 0, "x": 100, "y": 100, "type": "station" },
    { "id": 1, "x": 200, "y": 100, "type": "waypoint" },
    { "id": 2, "x": 300, "y": 100, "type": "waypoint" },
    { "id": 3, "x": 300, "y": 200, "type": "station" },
    { "id": 4, "x": 200, "y": 200, "type": "waypoint" },
    { "id": 5, "x": 100, "y": 200, "type": "station" }
  ],
  "edges": [
    { "id": 0, "from": 0, "to": 1, "bidirectional": true, "max_speed": 1.0 },
    { "id": 1, "from": 1, "to": 2, "bidirectional": true, "max_speed": 1.0 },
    { "id": 2, "from": 2, "to": 3, "bidirectional": true, "max_speed": 1.0 },
    { "id": 3, "from": 3, "to": 4, "bidirectional": true, "max_speed": 1.0 },
    { "id": 4, "from": 4, "to": 5, "bidirectional": true, "max_speed": 1.0 },
    { "id": 5, "from": 5, "to": 0, "bidirectional": true, "max_speed": 1.0 },
    { "id": 6, "from": 1, "to": 4, "bidirectional": true, "max_speed": 1.0 }
  ],
  "stations": [
    { "id": 0, "node_id": 0, "type": "pickup", "name": "Inbound A" },
    { "id": 1, "node_id": 3, "type": "dropoff", "name": "Outbound B" },
    { "id": 2, "node_id": 5, "type": "both", "name": "Station C" }
  ],
  "vehicles": [
    { "id": 0, "start_node": 1, "name": "AGV-001" },
    { "id": 1, "start_node": 4, "name": "AGV-002" }
  ]
}
```

---

## Log Server API

### POST /log

```typescript
// Request
interface LogEntry {
  session_id: string;
  timestamp: number;    // unix ms
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'vehicle' | 'order' | 'zone' | 'system';
  message: string;
}

// Response: 204 No Content
```

### GET /logs/:session_id

```typescript
// Query params
interface LogQuery {
  since_tick?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
  limit?: number;  // default 1000
}

// Response
interface LogResponse {
  session_id: string;
  entries: LogEntry[];
  has_more: boolean;
}
```

### GET /snapshot/:session_id

```typescript
// Response: Latest debug snapshot (if POST /snapshot was called)
interface SnapshotResponse {
  session_id: string;
  timestamp: number;
  tick: number;
  state: SimulationState;
  event_log: LogEntry[];  // last 100 events
}
```

### POST /snapshot

```typescript
// Request
interface SnapshotRequest {
  session_id: string;
  tick: number;
  state: SimulationState;
  event_log: LogEntry[];
}

// Response: 204 No Content
```

---

## React Component Props

```typescript
// PlantView
interface PlantViewProps {
  plant: PlantDefinition;
  vehicles: VehicleState[];
  zones: ZoneState[];
  selectedVehicle: number | null;
  onNodeClick: (nodeId: number) => void;
}

// FSMInspector
interface FSMInspectorProps {
  vehicles: VehicleState[];
  orders: OrderState[];
  zones: ZoneState[];
  selectedVehicle: number | null;
  onSelectVehicle: (id: number) => void;
}

// ControlPanel
interface ControlPanelProps {
  stations: StationDef[];
  isPaused: boolean;
  speed: number;
  onCreateOrder: (source: number, dest: number) => void;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: number) => void;
}

// LogPanel
interface LogPanelProps {
  maxEntries?: number;  // default 100
  filter?: LogEntry['level'];
}
```