use std::sync::Mutex;

mod commands;
mod overlay;
mod paths;
mod recorder;
mod tray;
mod windows_list;

#[cfg(windows)]
mod capture_session;

pub use commands::{
    get_recording_state, list_windows, start_recording, stop_recording,
};

pub struct AppState {
    recorder: Mutex<Option<recorder::Recorder>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            recorder: Mutex::new(None),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .build(),
        )
        .manage(AppState::new())
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            get_recording_state,
            list_windows,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
