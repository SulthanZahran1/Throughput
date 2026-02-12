use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderState {
    Pending,
    Assigned,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportOrder {
    pub id: String,
    pub state: OrderState,
    pub pickup_location: String,
    pub delivery_location: String,
    pub assigned_vehicle: Option<String>,
}

impl TransportOrder {
    pub fn new(id: String, pickup: String, delivery: String) -> Self {
        Self {
            id,
            state: OrderState::Pending,
            pickup_location: pickup,
            delivery_location: delivery,
            assigned_vehicle: None,
        }
    }

    pub fn assign_to(&mut self, vehicle_id: String) {
        self.assigned_vehicle = Some(vehicle_id);
        self.state = OrderState::Assigned;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_order_assignment() {
        let mut order = TransportOrder::new(
            "ORD-001".to_string(),
            "A1".to_string(),
            "B2".to_string(),
        );
        assert_eq!(order.state, OrderState::Pending);
        order.assign_to("AGV-001".to_string());
        assert_eq!(order.state, OrderState::Assigned);
        assert_eq!(order.assigned_vehicle, Some("AGV-001".to_string()));
    }
}
