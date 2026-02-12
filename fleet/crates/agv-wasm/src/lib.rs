use wasm_bindgen::prelude::*;
use agv_core::{
    simulation::Simulation,
    plant::PlantModel,
    vehicle::Vehicle,
    order::TransportOrder,
};

#[wasm_bindgen]
pub struct WasmSimulation {
    sim: Simulation,
}

#[wasm_bindgen]
impl WasmSimulation {
    #[wasm_bindgen(constructor)]
    pub fn new(plant_json: String) -> Self {
        // Enable panic messages in browser console
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();

        web_sys::console::log_1(&format!("WASM: Received JSON length: {}", plant_json.len()).into());

        let plant = PlantModel::from_json(&plant_json).expect("Failed to parse plant JSON");
        web_sys::console::log_1(&format!("WASM: Parsed plant: {}, Nodes: {}, Edges: {}", plant.name, plant.nodes.len(), plant.edges.len()).into());
        
        Self {
            sim: Simulation::new(plant),
        }
    }

    #[wasm_bindgen(js_name = addVehicle)]
    pub fn add_vehicle(&mut self, id: String, x: f64, y: f64) {
        let vehicle = Vehicle::new(id, (x, y));
        self.sim.add_vehicle(vehicle);
    }

    #[wasm_bindgen(js_name = addOrder)]
    pub fn add_order(&mut self, id: String, pickup: String, delivery: String) {
        let order = TransportOrder::new(id, pickup, delivery);
        self.sim.add_order(order);
    }

    #[wasm_bindgen(js_name = teleportVehicle)]
    pub fn teleport_vehicle(&mut self, vehicle_id: String, x: f64, y: f64) {
        self.sim.teleport_vehicle(&vehicle_id, (x, y));
    }

    #[wasm_bindgen]
    pub fn tick(&mut self, dt: f64) {
        self.sim.tick(dt);
    }

    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.sim).unwrap()
    }

    #[wasm_bindgen(js_name = dumpDebugState)]
    pub fn dump_debug_state(&self) -> String {
        self.sim.dump_debug_state()
    }

    /// Dispatch a vehicle to pick up an order (computes path via A*)
    #[wasm_bindgen(js_name = dispatchToPickup)]
    pub fn dispatch_to_pickup(&mut self, vehicle_id: String, order_id: String) -> bool {
        self.sim.dispatch_to_pickup(&vehicle_id, &order_id)
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    web_sys::console::log_1(&"AGV WASM module loaded".into());
}
