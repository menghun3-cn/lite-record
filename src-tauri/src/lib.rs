use std::sync::Mutex;

use tauri::Manager;

mod commands;
mod overlay;
mod paths;
mod recorder;
mod tray;
mod windows_list;

#[cfg(windows)]
mod capture_session;

pub use commands::{
    get_recording_state, get_video_dir, list_windows, open_video_dir, start_recording,
    stop_recording,
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

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }));
    }

    builder
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
            get_video_dir,
            open_video_dir,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
