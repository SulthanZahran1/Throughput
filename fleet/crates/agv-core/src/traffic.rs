use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ZoneState {
    Free,
    Occupied,
    Reserved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zone {
    pub id: String,
    pub state: ZoneState,
    pub occupied_by: Option<String>,
}

impl Zone {
    pub fn new(id: String) -> Self {
        Self {
            id,
            state: ZoneState::Free,
            occupied_by: None,
        }
    }

    pub fn reserve(&mut self, vehicle_id: String) -> bool {
        if self.state == ZoneState::Free {
            self.state = ZoneState::Reserved;
            self.occupied_by = Some(vehicle_id);
            true
        } else {
            false
        }
    }

    pub fn release(&mut self) {
        self.state = ZoneState::Free;
        self.occupied_by = None;
    }
}
