use crate::vehicle::{Vehicle, VehicleEvent};
use crate::order::TransportOrder;
use crate::plant::PlantModel;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Simulation {
    pub vehicles: Vec<Vehicle>,
    pub orders: Vec<TransportOrder>,
    pub plant: PlantModel,
    pub tick_count: u64,
}

impl Simulation {
    pub fn new(plant: PlantModel) -> Self {
        Self {
            vehicles: Vec::new(),
            orders: Vec::new(),
            plant,
            tick_count: 0,
        }
    }

    pub fn add_vehicle(&mut self, vehicle: Vehicle) {
        self.vehicles.push(vehicle);
    }

    pub fn add_order(&mut self, order: TransportOrder) {
        self.orders.push(order);
    }

    pub fn teleport_vehicle(&mut self, vehicle_id: &str, position: (f64, f64)) {
        if let Some(vehicle) = self.vehicles.iter_mut().find(|v| v.id == vehicle_id) {
            vehicle.position = position;
        }
    }

    /// Dispatch a vehicle to pick up an order
    pub fn dispatch_to_pickup(&mut self, vehicle_id: &str, order_id: &str) -> bool {
        // Get order pickup location first
        let pickup = match self.orders.iter().find(|o| o.id == order_id) {
            Some(order) => order.pickup_location.clone(),
            None => return false,
        };
        
        // Get vehicle position to find nearest node
        let vehicle_info = self.vehicles
            .iter()
            .find(|v| v.id == vehicle_id)
            .map(|v| (v.current_node.clone(), v.position));
        
        let (current_node, position) = match vehicle_info {
            Some(info) => info,
            None => return false,
        };
        
        // Find starting node
        let from = current_node.unwrap_or_else(|| {
            self.plant.nodes
                .iter()
                .min_by(|a, b| {
                    let dist_a = (a.1.position.0 - position.0).powi(2) + (a.1.position.1 - position.1).powi(2);
                    let dist_b = (b.1.position.0 - position.0).powi(2) + (b.1.position.1 - position.1).powi(2);
                    dist_a.partial_cmp(&dist_b).unwrap()
                })
                .map(|(id, _)| id.clone())
                .unwrap_or_default()
        });
        
        // Find path
        if let Some(path) = self.plant.find_path(&from, &pickup) {
            // Now mutably borrow vehicle and dispatch
            if let Some(vehicle) = self.vehicles.iter_mut().find(|v| v.id == vehicle_id) {
                vehicle.dispatch(order_id.to_string(), path);
                return true;
            }
        }
        false
    }

    /// Find the nearest node to a position
    fn find_nearest_node(&self, position: (f64, f64)) -> String {
        self.plant.nodes
            .iter()
            .min_by(|a, b| {
                let dist_a = (a.1.position.0 - position.0).powi(2) + (a.1.position.1 - position.1).powi(2);
                let dist_b = (b.1.position.0 - position.0).powi(2) + (b.1.position.1 - position.1).powi(2);
                dist_a.partial_cmp(&dist_b).unwrap()
            })
            .map(|(id, _)| id.clone())
            .unwrap_or_default()
    }

    pub fn tick(&mut self, dt: f64) {
        self.tick_count += 1;

        // Collect events from vehicle ticks
        let mut events: Vec<(String, VehicleEvent)> = Vec::new();
        
        // Create a closure that captures plant for node position lookup
        let plant = &self.plant;
        
        for vehicle in &mut self.vehicles {
            let get_pos = |id: &str| plant.get_node_position(id);
            if let Some(event) = vehicle.tick(dt, get_pos) {
                events.push((vehicle.id.clone(), event));
            }
        }

        // Process events
        for (vehicle_id, event) in events {
            match event {
                VehicleEvent::LoadingComplete { order_id } => {
                    // Start delivery phase
                    if let Some(order) = self.orders.iter().find(|o| o.id == order_id) {
                        let pickup = order.pickup_location.clone();
                        let delivery = order.delivery_location.clone();
                        
                        if let Some(path) = self.plant.find_path(&pickup, &delivery) {
                            if let Some(vehicle) = self.vehicles.iter_mut().find(|v| v.id == vehicle_id) {
                                vehicle.start_delivery(path);
                            }
                        }
                    }
                }
                VehicleEvent::UnloadingComplete { order_id } => {
                    // Mark order as complete
                    if let Some(order) = self.orders.iter_mut().find(|o| o.id == order_id) {
                        order.state = crate::order::OrderState::Completed;
                    }
                }
                _ => {}
            }
        }
    }

    pub fn dump_debug_state(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_default()
    }
}

