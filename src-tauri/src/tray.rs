use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, Runtime, WebviewWindow,
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

/// 在主窗口 Webview 上执行恢复：先取消最小化，再显示并聚焦。
pub fn restore_main_webview_window<R: Runtime>(window: &WebviewWindow<R>) {
    if let Err(e) = window.unminimize() {
        log::warn!("取消最小化主窗口失败: {}", e);
    }
    if let Err(e) = window.show() {
        log::warn!("显示主窗口失败: {}", e);
    }
    if let Err(e) = window.set_focus() {
        log::warn!("聚焦主窗口失败: {}", e);
    }
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    let app_for_thread = app.clone();
    if let Err(e) = app.clone().run_on_main_thread(move || {
        if let Some(window) = app_for_thread.get_webview_window("main") {
            restore_main_webview_window(&window);
        } else {
            log::warn!("未找到主窗口，无法从托盘恢复");
        }
    }) {
        log::error!("派发主窗口显示任务失败: {}", e);
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
            "tray_show" => show_main_window(app),
            "tray_quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
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