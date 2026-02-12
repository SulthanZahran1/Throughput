use serde::{Deserialize, Serialize};

/// Default number of ticks for loading/unloading operations (2 seconds at 60fps)
const DEFAULT_LOAD_TICKS: u32 = 120;

/// Vehicle movement speed (units per tick)
const VEHICLE_SPEED: f64 = 2.0;

/// FSM state for a vehicle, matching FSM.md specification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "state_type", rename_all = "snake_case")]
pub enum VehicleState {
    Idle,
    
    MovingToPickup {
        order_id: String,
        path: Vec<String>,
        path_index: usize,
        edge_progress: f64,
    },
    
    WaitingForZone {
        blocked_zone: String,
        #[serde(skip)]
        next_state: Option<Box<VehicleState>>,
    },
    
    Loading {
        order_id: String,
        station: String,
        remaining_ticks: u32,
    },
    
    MovingToDrop {
        order_id: String,
        path: Vec<String>,
        path_index: usize,
        edge_progress: f64,
    },
    
    Unloading {
        order_id: String,
        station: String,
        remaining_ticks: u32,
    },
    
    Error {
        message: String,
    },
}

impl Default for VehicleState {
    fn default() -> Self {
        Self::Idle
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vehicle {
    pub id: String,
    pub state: VehicleState,
    pub position: (f64, f64),
    pub current_node: Option<String>,
    pub target_node: Option<String>,
    pub battery: f64,
}

impl Vehicle {
    pub fn new(id: String, position: (f64, f64)) -> Self {
        Self {
            id,
            state: VehicleState::Idle,
            position,
            current_node: None,
            target_node: None,
            battery: 100.0,
        }
    }

    /// Dispatch this vehicle to pick up an order
    pub fn dispatch(&mut self, order_id: String, path: Vec<String>) {
        if path.len() < 2 {
            self.state = VehicleState::Error {
                message: "Invalid path: must have at least 2 nodes".to_string(),
            };
            return;
        }
        
        self.target_node = Some(path.last().unwrap().clone());
        self.state = VehicleState::MovingToPickup {
            order_id,
            path,
            path_index: 0,
            edge_progress: 0.0,
        };
    }

    /// Main FSM tick function - advances state machine
    pub fn tick(&mut self, dt: f64, get_node_position: impl Fn(&str) -> Option<(f64, f64)>) -> Option<VehicleEvent> {
        self.battery -= dt * 0.01; // Slow battery drain
        
        // Clone state data to avoid borrow checker issues
        let state_snapshot = self.state.clone();
        
        match state_snapshot {
            VehicleState::Idle => None,
            
            VehicleState::MovingToPickup { order_id, path, path_index, edge_progress } => {
                self.process_movement(dt, order_id, path, path_index, edge_progress, true, &get_node_position)
            }
            
            VehicleState::MovingToDrop { order_id, path, path_index, edge_progress } => {
                self.process_movement(dt, order_id, path, path_index, edge_progress, false, &get_node_position)
            }
            
            VehicleState::Loading { order_id, station: _, remaining_ticks } => {
                if remaining_ticks == 0 {
                    self.state = VehicleState::Idle;
                    Some(VehicleEvent::LoadingComplete { order_id })
                } else {
                    if let VehicleState::Loading { remaining_ticks: ref mut ticks, .. } = self.state {
                        *ticks -= 1;
                    }
                    None
                }
            }
            
            VehicleState::Unloading { order_id, station: _, remaining_ticks } => {
                if remaining_ticks == 0 {
                    self.state = VehicleState::Idle;
                    self.target_node = None;
                    Some(VehicleEvent::UnloadingComplete { order_id })
                } else {
                    if let VehicleState::Unloading { remaining_ticks: ref mut ticks, .. } = self.state {
                        *ticks -= 1;
                    }
                    None
                }
            }
            
            VehicleState::WaitingForZone { .. } => None,
            VehicleState::Error { .. } => None,
        }
    }

    /// Process movement along path (extracted to avoid borrow issues)
    fn process_movement(
        &mut self,
        dt: f64,
        order_id: String,
        path: Vec<String>,
        mut path_index: usize,
        mut edge_progress: f64,
        is_pickup: bool,
        get_node_position: &impl Fn(&str) -> Option<(f64, f64)>,
    ) -> Option<VehicleEvent> {
        if path_index >= path.len() - 1 {
            // Arrived at destination
            let station = path.last().unwrap().clone();
            self.current_node = Some(station.clone());
            
            if is_pickup {
                self.state = VehicleState::Loading {
                    order_id: order_id.clone(),
                    station,
                    remaining_ticks: DEFAULT_LOAD_TICKS,
                };
                return Some(VehicleEvent::ArrivedAtPickup { order_id });
            } else {
                self.state = VehicleState::Unloading {
                    order_id: order_id.clone(),
                    station,
                    remaining_ticks: DEFAULT_LOAD_TICKS,
                };
                return Some(VehicleEvent::ArrivedAtDrop { order_id });
            }
        }

        // Advance progress along current edge
        edge_progress += VEHICLE_SPEED * dt;

        // Get current and next node positions for interpolation
        let from_node = &path[path_index];
        let to_node = &path[path_index + 1];
        
        if let (Some(from_pos), Some(to_pos)) = (get_node_position(from_node), get_node_position(to_node)) {
            let edge_length = ((to_pos.0 - from_pos.0).powi(2) + (to_pos.1 - from_pos.1).powi(2)).sqrt();
            let normalized_progress = (edge_progress * VEHICLE_SPEED) / edge_length.max(1.0);
            
            if normalized_progress >= 1.0 {
                path_index += 1;
                edge_progress = 0.0;
                self.current_node = Some(to_node.clone());
                self.position = to_pos;
                
                if path_index < path.len() - 1 {
                    self.target_node = Some(path[path_index + 1].clone());
                }
            } else {
                self.position = (
                    from_pos.0 + (to_pos.0 - from_pos.0) * normalized_progress,
                    from_pos.1 + (to_pos.1 - from_pos.1) * normalized_progress,
                );
            }
        }

        // Update state with new progress
        if is_pickup {
            self.state = VehicleState::MovingToPickup {
                order_id,
                path,
                path_index,
                edge_progress,
            };
        } else {
            self.state = VehicleState::MovingToDrop {
                order_id,
                path,
                path_index,
                edge_progress,
            };
        }

        None
    }

    /// Advance vehicle along its current path
    fn advance_along_path(
        &mut self,
        dt: f64,
        order_id: String,
        path: Vec<String>,
        path_index: &mut usize,
        edge_progress: &mut f64,
        is_pickup: bool,
        get_node_position: &impl Fn(&str) -> Option<(f64, f64)>,
    ) -> Option<VehicleEvent> {
        if *path_index >= path.len() - 1 {
            // Arrived at destination
            let station = path.last().unwrap().clone();
            self.current_node = Some(station.clone());
            
            if is_pickup {
                self.state = VehicleState::Loading {
                    order_id: order_id.clone(),
                    station,
                    remaining_ticks: DEFAULT_LOAD_TICKS,
                };
                return Some(VehicleEvent::ArrivedAtPickup { order_id });
            } else {
                self.state = VehicleState::Unloading {
                    order_id: order_id.clone(),
                    station,
                    remaining_ticks: DEFAULT_LOAD_TICKS,
                };
                return Some(VehicleEvent::ArrivedAtDrop { order_id });
            }
        }

        // Advance progress along current edge
        *edge_progress += VEHICLE_SPEED * dt;

        // Get current and next node positions for interpolation
        let from_node = &path[*path_index];
        let to_node = &path[*path_index + 1];
        
        if let (Some(from_pos), Some(to_pos)) = (get_node_position(from_node), get_node_position(to_node)) {
            // Calculate edge length for proper speed normalization
            let edge_length = ((to_pos.0 - from_pos.0).powi(2) + (to_pos.1 - from_pos.1).powi(2)).sqrt();
            let normalized_progress = (*edge_progress * VEHICLE_SPEED) / edge_length.max(1.0);
            
            if normalized_progress >= 1.0 {
                // Move to next edge
                *path_index += 1;
                *edge_progress = 0.0;
                self.current_node = Some(to_node.clone());
                self.position = to_pos;
                
                if *path_index < path.len() - 1 {
                    self.target_node = Some(path[*path_index + 1].clone());
                }
            } else {
                // Interpolate position
                self.position = (
                    from_pos.0 + (to_pos.0 - from_pos.0) * normalized_progress,
                    from_pos.1 + (to_pos.1 - from_pos.1) * normalized_progress,
                );
            }
        }

        None
    }

    /// Start delivery phase after loading
    pub fn start_delivery(&mut self, path: Vec<String>) {
        if let VehicleState::Idle = &self.state {
            // This is called after LoadingComplete when simulation provides delivery path
        }
        
        if let VehicleState::Loading { order_id, .. } = &self.state {
            if path.len() < 2 {
                self.state = VehicleState::Error {
                    message: "Invalid delivery path".to_string(),
                };
                return;
            }
            
            self.target_node = Some(path.last().unwrap().clone());
            self.state = VehicleState::MovingToDrop {
                order_id: order_id.clone(),
                path,
                path_index: 0,
                edge_progress: 0.0,
            };
        }
    }

    /// Get the simple state type string for JS serialization
    pub fn state_type(&self) -> &'static str {
        match &self.state {
            VehicleState::Idle => "idle",
            VehicleState::MovingToPickup { .. } => "moving_to_pickup",
            VehicleState::WaitingForZone { .. } => "waiting",
            VehicleState::Loading { .. } => "loading",
            VehicleState::MovingToDrop { .. } => "moving_to_drop",
            VehicleState::Unloading { .. } => "unloading",
            VehicleState::Error { .. } => "error",
        }
    }

    /// Check if vehicle is idle and available for dispatch
    pub fn is_idle(&self) -> bool {
        matches!(self.state, VehicleState::Idle)
    }
}

/// Events emitted by vehicle FSM transitions
#[derive(Debug, Clone)]
pub enum VehicleEvent {
    ArrivedAtPickup { order_id: String },
    ArrivedAtDrop { order_id: String },
    LoadingComplete { order_id: String },
    UnloadingComplete { order_id: String },
    ZoneBlocked { zone_id: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vehicle_creation() {
        let vehicle = Vehicle::new("AGV-001".to_string(), (100.0, 200.0));
        assert_eq!(vehicle.id, "AGV-001");
        assert!(matches!(vehicle.state, VehicleState::Idle));
        assert_eq!(vehicle.position, (100.0, 200.0));
    }

    #[test]
    fn test_vehicle_dispatch() {
        let mut vehicle = Vehicle::new("AGV-001".to_string(), (0.0, 0.0));
        let path = vec!["A".to_string(), "B".to_string(), "C".to_string()];
        
        vehicle.dispatch("ORD-001".to_string(), path);
        
        match &vehicle.state {
            VehicleState::MovingToPickup { order_id, path, path_index, edge_progress } => {
                assert_eq!(order_id, "ORD-001");
                assert_eq!(path.len(), 3);
                assert_eq!(*path_index, 0);
                assert_eq!(*edge_progress, 0.0);
            }
            _ => panic!("Expected MovingToPickup state"),
        }
    }

    #[test]
    fn test_vehicle_state_type() {
        let mut vehicle = Vehicle::new("AGV-001".to_string(), (0.0, 0.0));
        assert_eq!(vehicle.state_type(), "idle");
        
        vehicle.state = VehicleState::Loading {
            order_id: "ORD-001".to_string(),
            station: "S1".to_string(),
            remaining_ticks: 60,
        };
        assert_eq!(vehicle.state_type(), "loading");
    }

    #[test]
    fn test_loading_countdown() {
        let mut vehicle = Vehicle::new("AGV-001".to_string(), (0.0, 0.0));
        vehicle.state = VehicleState::Loading {
            order_id: "ORD-001".to_string(),
            station: "S1".to_string(),
            remaining_ticks: 2,
        };

        // Mock position lookup
        let get_pos = |_: &str| Some((0.0, 0.0));

        // First tick: 2 -> 1
        let event = vehicle.tick(1.0, get_pos);
        assert!(event.is_none());
        
        // Second tick: 1 -> 0
        let event = vehicle.tick(1.0, get_pos);
        assert!(event.is_none());
        
        // Third tick: complete
        let event = vehicle.tick(1.0, get_pos);
        assert!(matches!(event, Some(VehicleEvent::LoadingComplete { .. })));
        assert!(matches!(vehicle.state, VehicleState::Idle));
    }

    #[test]
    fn test_invalid_dispatch_path() {
        let mut vehicle = Vehicle::new("AGV-001".to_string(), (0.0, 0.0));
        vehicle.dispatch("ORD-001".to_string(), vec!["A".to_string()]); // Too short
        
        assert!(matches!(vehicle.state, VehicleState::Error { .. }));
    }
}
