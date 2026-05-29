use std::path::{Path, PathBuf};

/// 去掉 Windows 扩展路径前缀 `\\?\`，便于界面展示
pub fn format_path_for_display(path: &Path) -> String {
    let raw = path.to_string_lossy();
    raw.strip_prefix(r"\\?\")
        .unwrap_or(&raw)
        .to_string()
}

/// 视频输出目录：`%USERPROFILE%\.lite-record\video`
pub fn resolve_video_dir() -> Result<PathBuf, String> {
    let user_profile = std::env::var("USERPROFILE")
        .map_err(|_| "无法读取 USERPROFILE 环境变量".to_string())?;

    let dir = PathBuf::from(user_profile)
        .join(".lite-record")
        .join("video");

    std::fs::create_dir_all(&dir).map_err(|e| format!("创建视频目录失败: {}", e))?;

    dir.canonicalize()
        .map_err(|e| format!("解析视频目录路径失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_path_for_display_strips_extended_prefix() {
        let path = PathBuf::from(r"\\?\C:\Users\admin\.lite-record\video");
        assert_eq!(
            format_path_for_display(&path),
            r"C:\Users\admin\.lite-record\video"
        );
    }

    #[test]
    fn test_resolve_video_dir_under_user_profile() {
        let dir = resolve_video_dir().expect("应能解析 video 目录");
        assert!(dir.ends_with("video"), "路径应以 video 结尾: {:?}", dir);
        assert!(dir.exists(), "video 目录应存在: {:?}", dir);

        let user_profile = std::env::var("USERPROFILE").expect("USERPROFILE 应存在");
        let expected = PathBuf::from(user_profile)
            .join(".lite-record")
            .join("video");
        let expected = expected.canonicalize().expect("应能规范化期望路径");
        assert_eq!(dir, expected, "应解析到用户目录下的 .lite-record\\video");
    }
}
