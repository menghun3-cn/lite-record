use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, Runtime,
};

pub struct TrayRecordingState {
    pub is_recording: Mutex<bool>,
}

impl TrayRecordingState {
    pub fn new() -> Self {
        Self {
            is_recording: Mutex::new(false),
        }
    }

    pub fn set_recording(&self, recording: bool) {
        if let Ok(mut flag) = self.is_recording.lock() {
            *flag = recording;
        }
    }
}

pub fn setup_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "tray_show", "显示主窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "tray_quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let Some(icon) = app.default_window_icon().cloned() else {
        log::warn!("未找到托盘图标，跳过系统托盘初始化");
        app.manage(TrayRecordingState::new());
        return Ok(());
    };

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("lite-record - 就绪")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray_show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "tray_quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    app.manage(TrayRecordingState::new());
    Ok(())
}

pub fn update_tray_tooltip(app: &AppHandle, recording: bool) {
    if let Some(state) = app.try_state::<TrayRecordingState>() {
        state.set_recording(recording);
    }
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if recording {
            "lite-record - 录制中"
        } else {
            "lite-record - 就绪"
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}
