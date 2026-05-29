use std::path::{Path, PathBuf};

/// 项目根目录标识文件（任一存在即视为根目录）
const ROOT_MARKERS: &[&str] = &["package.json", "src-tauri/tauri.conf.json"];

/// 从起始路径向上查找项目根目录
fn find_project_root_from(start: &Path) -> Option<PathBuf> {
    let mut dir = start.to_path_buf();
    for _ in 0..12 {
        for marker in ROOT_MARKERS {
            if dir.join(marker).exists() {
                return Some(dir);
            }
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

/// 解析项目根目录
pub fn find_project_root() -> Option<PathBuf> {
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(root) = find_project_root_from(&cwd) {
            return Some(root);
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(root) = find_project_root_from(parent) {
                return Some(root);
            }
        }
    }

    // 编译时：src-tauri 的上一级即项目根
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(parent) = manifest_dir.parent() {
        if parent.join("package.json").exists() || parent.join("video").exists() {
            return Some(parent.to_path_buf());
        }
    }

    None
}

/// 视频输出目录：固定为项目根目录下的 `video/`，不使用用户 AppData。
pub fn resolve_video_dir() -> Result<PathBuf, String> {
    let root = find_project_root().ok_or(
        "无法定位项目根目录，请从 ai-capture 项目内启动应用".to_string(),
    )?;

    let dir = root.join("video");
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建视频目录失败: {}", e))?;

    dir.canonicalize()
        .map_err(|e| format!("解析视频目录路径失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_video_dir_under_project() {
        let dir = resolve_video_dir().expect("应能解析 video 目录");
        assert!(dir.ends_with("video"), "路径应以 video 结尾: {:?}", dir);
        assert!(dir.exists(), "video 目录应存在: {:?}", dir);
        // 不应落在 AppData
        let path_str = dir.to_string_lossy().to_lowercase();
        assert!(
            !path_str.contains("appdata"),
            "不应使用用户 AppData: {:?}",
            dir
        );
    }
}
