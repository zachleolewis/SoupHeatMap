// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod json_processor;

use models::{MatchSummary, MatchDetail};
use tauri::Manager;

/// Select a folder using native file picker
#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let folder = app.dialog()
        .file()
        .blocking_pick_folder();
    
    match folder {
        Some(path) => Ok(path.to_string()),
        None => Err("No folder selected".to_string()),
    }
}

/// Load all JSON match files from a folder
#[tauri::command]
fn load_matches(folder_path: String) -> Result<Vec<MatchSummary>, String> {
    json_processor::load_json_files(&folder_path)
}

/// Load all JSON match files
#[tauri::command]
fn load_matches_with_progress(folder_path: String) -> Result<Vec<MatchSummary>, String> {
    json_processor::load_json_files_with_progress(&folder_path, |_, _| {
        // Progress callback - could be used for logging or other purposes
    })
}

/// Get detailed match information by ID
#[tauri::command]
fn get_match_detail(folder_path: String, match_id: String) -> Result<MatchDetail, String> {
    json_processor::get_match_by_id(&folder_path, &match_id)
}

/// Get multiple match details in parallel for better performance
#[tauri::command]
fn get_multiple_match_details(folder_path: String, match_ids: Vec<String>) -> Result<Vec<MatchDetail>, String> {
    json_processor::get_multiple_match_details(&folder_path, &match_ids)
}

/// Get multiple match details with progress updates (controlled batching)
#[tauri::command]
fn get_multiple_match_details_with_progress(
    folder_path: String,
    match_ids: Vec<String>
) -> Result<Vec<MatchDetail>, String> {
    // For now, just use the regular batch loading without events
    // This avoids permission issues while still providing controlled loading
    json_processor::get_multiple_match_details(&folder_path, &match_ids)
}

/// Save file using native file picker
#[tauri::command]
async fn save_file(app: tauri::AppHandle, extensions: Vec<String>, default_name: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    // Add file extensions if provided
    if !extensions.is_empty() {
        let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter("Supported Files", &ext_refs);
    }

    // Set default file name if provided
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    match dialog.blocking_save_file() {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None), // User cancelled
    }
}

/// Write binary data to file
#[tauri::command]
async fn write_binary_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    fs::write(Path::new(&path), contents)
        .map_err(|e| format!("Failed to write file: {}", e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            select_folder,
            load_matches,
            load_matches_with_progress,
            get_match_detail,
            get_multiple_match_details,
            get_multiple_match_details_with_progress,
            save_file,
            write_binary_file
        ])
        .setup(|app| {
            // Ensure a window is created if none exists
            let window = app.get_webview_window("main");
            if window.is_none() {
                use tauri::WebviewWindowBuilder;
                WebviewWindowBuilder::new(
                    app,
                    "main",
                    tauri::WebviewUrl::App("index.html".into())
                )
                .title("SoupHeatMap")
                .inner_size(1600.0, 1000.0)
                .resizable(true)
                .center()
                .build()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}