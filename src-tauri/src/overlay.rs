use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

static OVERLAY_VISIBLE: AtomicBool = AtomicBool::new(false);

const OVERLAY_LABEL: &str = "recording-overlay";

const OVERLAY_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100vw; height: 100vh;
    background: transparent;
    overflow: hidden;
    pointer-events: none;
  }
  #border {
    position: fixed; inset: 0;
    border: 3px solid #EF4444;
    animation: pulse 1s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
</style>
</head>
<body><div id="border"></div></body>
</html>"#;

/// 使 overlay 窗口鼠标穿透，不阻挡操作其他应用
fn enable_click_through(window: &tauri::WebviewWindow) -> Result<(), String> {
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| format!("设置鼠标穿透失败: {}", e))
}

fn ensure_overlay_window_inline(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let temp_dir = std::env::temp_dir().join("lite-record-overlay");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("创建临时目录失败: {}", e))?;
    let html_path = temp_dir.join("overlay.html");
    std::fs::write(&html_path, OVERLAY_HTML)
        .map_err(|e| format!("写入 overlay HTML 失败: {}", e))?;

    let window = WebviewWindowBuilder::new(
        app,
        OVERLAY_LABEL,
        WebviewUrl::External(
            format!(
                "file:///{}",
                html_path.display().to_string().replace('\\', "/")
            )
            .parse()
            .map_err(|e| format!("URL 解析失败: {}", e))?,
        ),
    )
    .title("Recording Overlay")
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .fullscreen(true)
    .resizable(false)
    .skip_taskbar(true)
    .focused(false)
    .visible(false)
    .build()
    .map_err(|e| format!("创建录制边框窗口失败: {}", e))?;

    enable_click_through(&window)?;

    Ok(())
}

pub fn show_recording_overlay(app: &AppHandle) -> Result<(), String> {
    ensure_overlay_window_inline(app)?;
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        enable_click_through(&window)?;
        window.show().map_err(|e| format!("显示边框失败: {}", e))?;
        OVERLAY_VISIBLE.store(true, Ordering::SeqCst);
    }
    Ok(())
}

pub fn hide_recording_overlay(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        window.hide().map_err(|e| format!("隐藏边框失败: {}", e))?;
    }
    OVERLAY_VISIBLE.store(false, Ordering::SeqCst);
    Ok(())
}
