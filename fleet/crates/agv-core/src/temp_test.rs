#[cfg(test)]
mod tests {
    use crate::plant::PlantModel;
    use std::fs;

    #[test]
    fn test_load_demo_warehouse() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../plants/demo-warehouse.json");
        let json = fs::read_to_string(path).expect("Failed to read demo-warehouse.json");
        let plant = PlantModel::from_json(&json).expect("Failed to parse JSON");
        assert_eq!(plant.name, "Demo Warehouse");
        assert_eq!(plant.nodes.len(), 6);
        assert_eq!(plant.edges.len(), 12); // Bidirectional edges count twice
        println!("Successfully loaded plant: {}", plant.name);
    }
}
