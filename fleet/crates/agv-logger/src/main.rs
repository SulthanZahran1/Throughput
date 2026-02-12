use axum::{
    routing::post,
    Router,
    Json,
    extract::State,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LogEntry {
    session_id: String,
    timestamp: u64,
    level: String,
    category: String,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RouteTelemetry {
    session_id: String,
    timestamp: u64,
    algorithm: String,
    start_pos: (f32, f32),
    target_pos: (f32, f32),
    nodes_visited: u32,
    execution_time_ms: f64,
    path_length: usize,
    success: bool,
}

#[derive(Clone)]
struct AppState {
    logs: Arc<Mutex<Vec<LogEntry>>>,
}

async fn log_handler(
    State(state): State<AppState>,
    Json(entry): Json<LogEntry>,
) -> Json<String> {
    let mut logs = state.logs.lock().await;
    logs.push(entry.clone());
    
    // Print to console
    println!("[{}] [{}] [{}] {}", entry.session_id, entry.level, entry.category, entry.message);
    
    // Write to file
    let log_dir = Path::new("logs");
    if !log_dir.exists() {
        std::fs::create_dir_all(log_dir).unwrap();
    }
    
    let file_path = log_dir.join(format!("{}.log", entry.session_id));
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .unwrap();
        
    let log_line = format!(
        "[{}] [{}] [{}] {}\n",
        entry.timestamp, entry.level, entry.category, entry.message
    );
    file.write_all(log_line.as_bytes()).unwrap();
    
    Json("OK".to_string())
}

async fn telemetry_handler(
    Json(telemetry): Json<RouteTelemetry>,
) -> Json<String> {
    println!("[TELEMETRY] [{}] {} path from {:?} to {:?} took {}ms (nodes: {})", 
        telemetry.session_id, telemetry.algorithm, telemetry.start_pos, telemetry.target_pos, 
        telemetry.execution_time_ms, telemetry.nodes_visited);

    let log_dir = Path::new("logs");
    if !log_dir.exists() {
        std::fs::create_dir_all(log_dir).unwrap();
    }

    let file_path = log_dir.join("telemetry.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .unwrap();

    let json = serde_json::to_string(&telemetry).unwrap();
    file.write_all(format!("{}\n", json).as_bytes()).unwrap();

    Json("OK".to_string())
}

#[tokio::main]
async fn main() {
    let state = AppState {
        logs: Arc::new(Mutex::new(Vec::new())),
    };

    let app = Router::new()
        .route("/log", post(log_handler))
        .route("/telemetry", post(telemetry_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .unwrap();
    
    println!("AGV Logger server running on http://0.0.0.0:3001");
    axum::serve(listener, app).await.unwrap();
}
