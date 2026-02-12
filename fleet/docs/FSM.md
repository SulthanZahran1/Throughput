# FSM.md

## Vehicle FSM

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
               ┌────────┐                                      │
        ┌─────►│  IDLE  │◄─────────────────────────────────┐   │
        │      └───┬────┘                                  │   │
        │          │ dispatch(order)                       │   │
        │          ▼                                       │   │
        │   ┌──────────────────┐                           │   │
        │   │ MOVING_TO_PICKUP │───► WAITING_FOR_ZONE ─────┤   │
        │   └────────┬─────────┘     (zone occupied)       │   │
        │            │ arrived                             │   │
        │            ▼                                     │   │
        │      ┌──────────┐                                │   │
        │      │ LOADING  │ (N ticks)                      │   │
        │      └────┬─────┘                                │   │
        │           │ load_complete                        │   │
        │           ▼                                      │   │
        │   ┌────────────────┐                             │   │
        │   │ MOVING_TO_DROP │───► WAITING_FOR_ZONE ───────┤   │
        │   └───────┬────────┘                             │   │
        │           │ arrived                              │   │
        │           ▼                                      │   │
        │     ┌───────────┐                                │   │
        │     │ UNLOADING │ (N ticks)                      │   │
        │     └─────┬─────┘                                │   │
        │           │ unload_complete                      │   │
        │           │                                      │   │
        └───────────┴──────────────────────────────────────┘
                    │
                    │ (error / abort)
                    ▼
               ┌─────────┐
               │  ERROR  │
               └─────────┘
```

### Rust Definition

```rust
#[derive(Clone, Debug, Serialize)]
pub enum VehicleState {
    Idle,
    
    MovingToPickup {
        order_id: OrderId,
        path: Vec<NodeId>,
        path_index: usize,      // current edge
        edge_progress: f32,     // 0.0 to 1.0
    },
    
    WaitingForZone {
        blocked_zone: ZoneId,
        next_state: Box<VehicleState>,  // resume after zone free
    },
    
    Loading {
        order_id: OrderId,
        station: NodeId,
        remaining_ticks: u32,
    },
    
    MovingToDrop {
        order_id: OrderId,
        path: Vec<NodeId>,
        path_index: usize,
        edge_progress: f32,
    },
    
    Unloading {
        order_id: OrderId,
        station: NodeId,
        remaining_ticks: u32,
    },
    
    Error {
        message: String,
    },
}
```

### Transition Table

| From | Event | To | Side Effects |
|------|-------|-----|--------------|
| Idle | dispatch(order) | MovingToPickup | Reserve first zone, compute path |
| MovingToPickup | tick | MovingToPickup | Advance edge_progress |
| MovingToPickup | arrived_at_node | MovingToPickup | Increment path_index, reserve next zone |
| MovingToPickup | zone_blocked | WaitingForZone | Log wait event |
| MovingToPickup | arrived_at_pickup | Loading | Release travel zones |
| WaitingForZone | zone_freed | (next_state) | Reserve zone, continue |
| Loading | tick | Loading | Decrement remaining_ticks |
| Loading | remaining=0 | MovingToDrop | Compute path to drop, reserve zone |
| MovingToDrop | (same as MovingToPickup) | ... | ... |
| Unloading | remaining=0 | Idle | Complete order, release zones |
| Any | abort | Idle | Release zones, cancel order |
| Any | fatal_error | Error | Log error |

---

## Order FSM

```
  ┌──────────┐
  │ CREATED  │
  └────┬─────┘
       │ assign_vehicle(v)
       ▼
  ┌──────────────┐
  │  DISPATCHED  │
  └──────┬───────┘
         │ vehicle_arrived_at_pickup
         ▼
  ┌─────────────────────┐
  │ PICKUP_IN_PROGRESS  │
  └──────────┬──────────┘
             │ loading_complete
             ▼
  ┌─────────────────┐
  │   IN_TRANSIT    │
  └────────┬────────┘
           │ vehicle_arrived_at_drop
           ▼
  ┌──────────────────────┐
  │ DROPOFF_IN_PROGRESS  │
  └──────────┬───────────┘
             │ unloading_complete
             ▼
       ┌───────────┐
       │ COMPLETED │
       └───────────┘

       (any state)
           │ cancel / timeout
           ▼
       ┌───────────┐
       │ CANCELLED │
       └───────────┘
```

### Rust Definition

```rust
#[derive(Clone, Debug, Serialize)]
pub enum OrderState {
    Created,
    Dispatched { vehicle_id: VehicleId },
    PickupInProgress { vehicle_id: VehicleId },
    InTransit { vehicle_id: VehicleId },
    DropoffInProgress { vehicle_id: VehicleId },
    Completed { completed_at_tick: u64 },
    Cancelled { reason: String },
}

#[derive(Clone, Debug, Serialize)]
pub struct Order {
    pub id: OrderId,
    pub source: NodeId,       // pickup station
    pub destination: NodeId,  // drop station
    pub state: OrderState,
    pub created_at_tick: u64,
}
```

---

## Zone/Segment FSM

```
       ┌────────┐
  ┌───►│  FREE  │◄──────────────────┐
  │    └───┬────┘                   │
  │        │ vehicle_requests(v)    │
  │        ▼                        │
  │   ┌──────────┐                  │
  │   │ RESERVED │ (by vehicle v)   │
  │   └────┬─────┘                  │
  │        │ vehicle_enters(v)      │
  │        ▼                        │
  │   ┌──────────┐                  │
  │   │ OCCUPIED │ (by vehicle v)   │
  │   └────┬─────┘                  │
  │        │ vehicle_exits(v)       │
  └────────┴────────────────────────┘
```

### Rust Definition

```rust
#[derive(Clone, Debug, Serialize)]
pub enum ZoneState {
    Free,
    Reserved { by_vehicle: VehicleId },
    Occupied { by_vehicle: VehicleId },
}

#[derive(Clone, Debug, Serialize)]
pub struct Zone {
    pub id: ZoneId,
    pub state: ZoneState,
    pub edge: EdgeId,  // which edge this zone covers
}
```

### Zone Rules

1. Vehicle must reserve zone before entering
2. Only one vehicle can reserve/occupy a zone
3. Vehicle releases zone after exiting
4. If zone is Reserved/Occupied → requesting vehicle enters WAITING_FOR_ZONE
5. Deadlock = cycle in wait-for graph

---

## Deadlock Detection

Wait-for graph:
```
Vehicle A waiting for Zone X (held by Vehicle B)
Vehicle B waiting for Zone Y (held by Vehicle A)
→ Cycle detected → Deadlock
```

Resolution strategy (simple):
1. Detect cycle
2. Pick vehicle with lowest ID
3. Force it to back off (return to previous node)
4. Retry after N ticks