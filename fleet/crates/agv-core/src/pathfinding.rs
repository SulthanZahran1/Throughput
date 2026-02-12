use std::collections::{BinaryHeap, HashMap, HashSet};
use std::cmp::Ordering;

#[derive(Debug, Clone, PartialEq)]
struct PathNode {
    id: String,
    cost: f64,
    heuristic: f64,
}

impl Eq for PathNode {}

impl Ord for PathNode {
    fn cmp(&self, other: &Self) -> Ordering {
        other.total_cost().partial_cmp(&self.total_cost()).unwrap()
    }
}

impl PartialOrd for PathNode {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PathNode {
    fn total_cost(&self) -> f64 {
        self.cost + self.heuristic
    }
}

pub fn astar(
    start: String,
    goal: String,
    neighbors: &HashMap<String, Vec<(String, f64)>>,
    heuristic: impl Fn(&str, &str) -> f64,
) -> Option<Vec<String>> {
    let mut open_set = BinaryHeap::new();
    let mut came_from: HashMap<String, String> = HashMap::new();
    let mut g_score: HashMap<String, f64> = HashMap::new();
    let mut closed_set: HashSet<String> = HashSet::new();

    g_score.insert(start.clone(), 0.0);
    open_set.push(PathNode {
        id: start.clone(),
        cost: 0.0,
        heuristic: heuristic(&start, &goal),
    });

    while let Some(current) = open_set.pop() {
        if current.id == goal {
            return Some(reconstruct_path(&came_from, &goal));
        }

        closed_set.insert(current.id.clone());

        if let Some(edges) = neighbors.get(&current.id) {
            for (neighbor, edge_cost) in edges {
                if closed_set.contains(neighbor) {
                    continue;
                }

                let tentative_g = g_score[&current.id] + edge_cost;

                if tentative_g < *g_score.get(neighbor).unwrap_or(&f64::INFINITY) {
                    came_from.insert(neighbor.clone(), current.id.clone());
                    g_score.insert(neighbor.clone(), tentative_g);
                    open_set.push(PathNode {
                        id: neighbor.clone(),
                        cost: tentative_g,
                        heuristic: heuristic(neighbor, &goal),
                    });
                }
            }
        }
    }

    None
}

fn reconstruct_path(came_from: &HashMap<String, String>, goal: &str) -> Vec<String> {
    let mut path = vec![goal.to_string()];
    let mut current = goal;

    while let Some(prev) = came_from.get(current) {
        path.push(prev.clone());
        current = prev;
    }

    path.reverse();
    path
}
