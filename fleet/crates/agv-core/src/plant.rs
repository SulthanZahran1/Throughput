use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Waypoint,
    Station,
    Charger,
}

impl Default for NodeType {
    fn default() -> Self {
        Self::Waypoint
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StationType {
    Pickup,
    Dropoff,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Station {
    pub id: String,
    pub node_id: String,
    #[serde(rename = "type")]
    pub station_type: StationType,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub position: (f64, f64),
    #[serde(default)]
    pub node_type: NodeType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlantModel {
    pub name: String,
    pub nodes: HashMap<String, Node>,
    pub edges: Vec<Edge>,
    pub adjacency: HashMap<String, Vec<(String, f64)>>,
    pub stations: Vec<Station>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PlantDefinition {
    name: String,
    nodes: Vec<NodeDef>,
    edges: Vec<EdgeDef>,
    #[serde(default)]
    stations: Vec<Station>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NodeDef {
    id: String,
    position: [f64; 2],
    #[serde(rename = "type")]
    node_type: Option<NodeType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EdgeDef {
    from: String,
    to: String,
    #[serde(default = "default_cost")]
    cost: f64,
    #[serde(default)]
    bidirectional: bool,
}

fn default_cost() -> f64 {
    1.0
}

impl PlantModel {
    pub fn new() -> Self {
        Self {
            name: "New Plant".to_string(),
            nodes: HashMap::new(),
            edges: Vec::new(),
            adjacency: HashMap::new(),
            stations: Vec::new(),
        }
    }

    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        let def: PlantDefinition = serde_json::from_str(json)?;
        let mut model = Self::new();
        model.name = def.name;

        for node_def in def.nodes {
            model.add_node(
                node_def.id,
                (node_def.position[0], node_def.position[1]),
                node_def.node_type.unwrap_or(NodeType::Waypoint),
            );
        }

        for edge_def in def.edges {
            model.add_edge(
                edge_def.from.clone(),
                edge_def.to.clone(),
                edge_def.cost,
            );
            if edge_def.bidirectional {
                model.add_edge(
                    edge_def.to,
                    edge_def.from,
                    edge_def.cost,
                );
            }
        }

        model.stations = def.stations;

        Ok(model)
    }

    pub fn add_node(&mut self, id: String, position: (f64, f64), node_type: NodeType) {
        self.nodes.insert(
            id.clone(),
            Node {
                id,
                position,
                node_type,
            },
        );
    }

    pub fn add_edge(&mut self, from: String, to: String, cost: f64) {
        self.edges.push(Edge {
            from: from.clone(),
            to: to.clone(),
            cost,
        });
        self.adjacency
            .entry(from)
            .or_default()
            .push((to, cost));
    }

    /// Get a node's position by ID
    pub fn get_node_position(&self, id: &str) -> Option<(f64, f64)> {
        self.nodes.get(id).map(|n| n.position)
    }

    /// Calculate Euclidean distance between two nodes
    pub fn euclidean_distance(&self, a: &str, b: &str) -> f64 {
        match (self.get_node_position(a), self.get_node_position(b)) {
            (Some((ax, ay)), Some((bx, by))) => {
                ((bx - ax).powi(2) + (by - ay).powi(2)).sqrt()
            }
            _ => f64::INFINITY,
        }
    }

    /// Find shortest path between two nodes using A*
    pub fn find_path(&self, from: &str, to: &str) -> Option<Vec<String>> {
        use crate::pathfinding::astar;
        
        astar(
            from.to_string(),
            to.to_string(),
            &self.adjacency,
            |a, b| self.euclidean_distance(a, b),
        )
    }
}

impl Default for PlantModel {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_demo_plant() {
        let json = r#"{
            "name": "Test Warehouse",
            "nodes": [
                { "id": "START", "position": [100, 100] },
                { "id": "A1", "position": [300, 100], "type": "station" }
            ],
            "edges": [
                { "from": "START", "to": "A1", "cost": 1.0, "bidirectional": true }
            ],
            "stations": [
                { "id": "S1", "node_id": "A1", "type": "pickup", "name": "Pickup 1" }
            ]
        }"#;

        let model = PlantModel::from_json(json).unwrap();
        assert_eq!(model.name, "Test Warehouse");
        assert_eq!(model.nodes.len(), 2);
        assert_eq!(model.edges.len(), 2); // Bidirectional
        assert_eq!(model.stations.len(), 1);
        assert_eq!(model.nodes["A1"].node_type, NodeType::Station);
    }

    #[test]
    fn test_adjacency_list() {
        let mut model = PlantModel::new();
        model.add_node("A".to_string(), (0.0, 0.0), NodeType::Waypoint);
        model.add_node("B".to_string(), (1.0, 0.0), NodeType::Waypoint);
        model.add_edge("A".to_string(), "B".to_string(), 5.0);

        let neighbors = &model.adjacency["A"];
        assert_eq!(neighbors.len(), 1);
        assert_eq!(neighbors[0].0, "B");
        assert_eq!(neighbors[0].1, 5.0);
    }

    #[test]
    fn test_invalid_json() {
        let json = r#"{ "invalid": "json" }"#;
        let result = PlantModel::from_json(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_load_actual_demo_plant() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../plants/demo-warehouse.json");
        println!("Testing path: {:?}", path);
        let json = std::fs::read_to_string(path).expect("Failed to read demo-warehouse.json");
        let model = PlantModel::from_json(&json).unwrap();
        
        assert_eq!(model.name, "Demo Warehouse");
        assert_eq!(model.nodes.len(), 6);
        assert_eq!(model.edges.len(), 12); // Bidirectional edges count twice
    }

    #[test]
    fn test_find_path_simple() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../plants/demo-warehouse.json");
        let json = std::fs::read_to_string(path).expect("Failed to read demo-warehouse.json");
        let model = PlantModel::from_json(&json).unwrap();
        
        // Path from START to CHARGE should exist
        let found_path = model.find_path("START", "CHARGE");
        assert!(found_path.is_some());
        
        let path = found_path.unwrap();
        assert_eq!(path.first().unwrap(), "START");
        assert_eq!(path.last().unwrap(), "CHARGE");
        assert!(path.len() >= 2); // At least start and end
    }

    #[test]
    fn test_find_path_unreachable() {
        let mut model = PlantModel::new();
        model.add_node("A".to_string(), (0.0, 0.0), NodeType::Waypoint);
        model.add_node("B".to_string(), (100.0, 0.0), NodeType::Waypoint);
        // No edge between A and B
        
        let path = model.find_path("A", "B");
        assert!(path.is_none());
    }

    #[test]
    fn test_euclidean_distance() {
        let mut model = PlantModel::new();
        model.add_node("A".to_string(), (0.0, 0.0), NodeType::Waypoint);
        model.add_node("B".to_string(), (3.0, 4.0), NodeType::Waypoint);
        
        let dist = model.euclidean_distance("A", "B");
        assert!((dist - 5.0).abs() < 0.001); // 3-4-5 triangle
    }
}

