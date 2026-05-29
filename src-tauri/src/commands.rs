use tauri::{AppHandle, Emitter, State, Window};

use crate::paths::{format_path_for_display, resolve_video_dir};
use crate::recorder::RecorderConfig;
use crate::tray::update_tray_tooltip;
use crate::windows_list::WindowInfo;
use crate::{overlay, AppState};

/// 开始录屏
#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    window: Window,
    state: State<'_, AppState>,
    source: String,
    window_id: Option<isize>,
) -> Result<String, String> {
    log::info!("开始录屏: source={}, window_id={:?}", source, window_id);

    {
        let recorder_guard = state
            .recorder
            .lock()
            .map_err(|e| format!("锁错误: {}", e))?;
        if recorder_guard.is_some() {
            return Err("已在录制中".to_string());
        }
    }

    if source == "window" && window_id.is_none() {
        return Err("选择窗口录制时必须指定 window_id".to_string());
    }

    let config = RecorderConfig {
        source: source.clone(),
        window_id,
        fps: 30,
        output_dir: resolve_video_dir()?,
    };

    let mut recorder =
        crate::recorder::Recorder::new(config).map_err(|e| format!("创建录屏器失败: {}", e))?;

    let session_id = recorder
        .start()
        .map_err(|e| format!("开始录制失败: {}", e))?;

    {
        let mut recorder_guard = state
            .recorder
            .lock()
            .map_err(|e| format!("锁错误: {}", e))?;
        *recorder_guard = Some(recorder);
    }

    overlay::show_recording_overlay(&app)?;
    update_tray_tooltip(&app, true);

    // 最小化主窗口，避免挡住桌面，便于操作其他应用
    if let Err(e) = window.minimize() {
        log::warn!("最小化主窗口失败: {}", e);
    }

    let _ = window.emit("recording-started", &session_id);
    log::info!("录屏已开始: {}", session_id);
    Ok(session_id)
}

/// 停止录屏
#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    window: Window,
    state: State<'_, AppState>,
) -> Result<String, String> {
    log::info!("停止录屏请求");

    let recorder = {
        let mut recorder_guard = state
            .recorder
            .lock()
            .map_err(|e| format!("锁错误: {}", e))?;
        recorder_guard.take()
    };

    match recorder {
        Some(mut rec) => {
            let output_path = rec.stop().map_err(|e| format!("停止录制失败: {}", e))?;
            let path_str = format_path_for_display(&output_path);

            overlay::hide_recording_overlay(&app)?;
            update_tray_tooltip(&app, false);

            // 停止后恢复主窗口
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();

            let _ = window.emit("recording-stopped", &path_str);
            log::info!("录屏已停止: {}", path_str);
            Ok(path_str)
        }
        None => Err("没有正在进行的录制".to_string()),
    }
}

/// 获取录制状态
#[tauri::command]
pub fn get_recording_state(state: State<'_, AppState>) -> Result<bool, String> {
    let recorder_guard = state
        .recorder
        .lock()
        .map_err(|e| format!("锁错误: {}", e))?;
    Ok(recorder_guard.is_some())
}

/// 获取视频存储目录
#[tauri::command]
pub fn get_video_dir() -> Result<String, String> {
    let dir = resolve_video_dir()?;
    Ok(format_path_for_display(&dir))
}

/// 在资源管理器中打开视频存储目录
#[tauri::command]
pub fn open_video_dir() -> Result<(), String> {
    let dir = resolve_video_dir()?;

    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }

    #[cfg(not(windows))]
    {
        let _ = dir;
        return Err("仅支持 Windows".to_string());
    }

    Ok(())
}

/// 枚举可录制窗口
#[tauri::command]
pub fn list_windows() -> Result<Vec<WindowInfo>, String> {
    Ok(crate::windows_list::list_capture_windows())
}

#[cfg(test)]
mod tests {
    use crate::windows_list::WindowInfo;

    #[test]
    fn test_window_info_serialization() {
        let info = WindowInfo {
            id: 12345,
            title: "Test Window".to_string(),
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("12345"));
        assert!(json.contains("Test Window"));
    }
}
