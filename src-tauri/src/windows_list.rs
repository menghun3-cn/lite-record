use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: isize,
    pub title: String,
}

#[cfg(windows)]
pub fn list_capture_windows() -> Vec<WindowInfo> {
    use windows_capture::window::Window;

    Window::enumerate()
        .unwrap_or_default()
        .into_iter()
        .filter(|w| w.is_valid())
        .filter_map(|w| {
            let title = w.title().ok()?;
            if title.trim().is_empty() {
                return None;
            }
            Some(WindowInfo {
                id: w.as_raw_hwnd() as isize,
                title,
            })
        })
        .collect()
}

#[cfg(not(windows))]
pub fn list_capture_windows() -> Vec<WindowInfo> {
    Vec::new()
}
