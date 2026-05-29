use chrono::Local;
use std::path::PathBuf;

#[cfg(not(windows))]
use std::path::Path;
use thiserror::Error;

#[cfg(windows)]
use crate::capture_session::CaptureSession;

/// 录屏错误类型
#[derive(Error, Debug)]
pub enum RecorderError {
    #[error("录屏已在进行中")]
    AlreadyRecording,

    #[error("录屏未在进行中")]
    NotRecording,

    #[error("不支持的录屏源: {0}")]
    UnsupportedSource(String),

    #[error("初始化失败: {0}")]
    InitFailed(String),

    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("系统错误: {0}")]
    System(String),
}

/// 录屏配置
#[derive(Debug, Clone)]
pub struct RecorderConfig {
    pub source: String,
    pub window_id: Option<isize>,
    pub fps: u32,
    pub output_dir: PathBuf,
}

/// 录屏器
pub struct Recorder {
    config: RecorderConfig,
    session_id: Option<String>,
    output_path: Option<PathBuf>,
    #[cfg(windows)]
    capture: Option<CaptureSession>,
    #[cfg(not(windows))]
    is_recording: bool,
}

fn generate_session_id() -> String {
    format!("recording_{}", Local::now().format("%Y%m%d_%H%M%S_%3f"))
}

impl Recorder {
    pub fn new(config: RecorderConfig) -> Result<Self, RecorderError> {
        match config.source.as_str() {
            "desktop" | "window" => {}
            _ => return Err(RecorderError::UnsupportedSource(config.source.clone())),
        }

        if config.source == "window" && config.window_id.is_none() {
            return Err(RecorderError::InitFailed(
                "窗口录制需要 window_id".to_string(),
            ));
        }

        Ok(Self {
            config,
            session_id: None,
            output_path: None,
            #[cfg(windows)]
            capture: None,
            #[cfg(not(windows))]
            is_recording: false,
        })
    }

    pub fn start(&mut self) -> Result<String, RecorderError> {
        if self.is_active() {
            return Err(RecorderError::AlreadyRecording);
        }

        let session_id = generate_session_id();
        let output_path = self.config.output_dir.join(format!("{}.mp4", session_id));

        log::info!(
            "开始录制: source={}, window_id={:?}, fps={}, output={:?}",
            self.config.source,
            self.config.window_id,
            self.config.fps,
            output_path
        );

        #[cfg(windows)]
        {
            let session = crate::capture_session::start(&self.config, output_path.clone())
                .map_err(|e| RecorderError::InitFailed(e))?;
            self.capture = Some(session);
        }

        #[cfg(not(windows))]
        {
            finalize_output_file_stub(&output_path)?;
            self.is_recording = true;
        }

        self.session_id = Some(session_id.clone());
        self.output_path = Some(output_path);

        Ok(session_id)
    }

    pub fn stop(&mut self) -> Result<PathBuf, RecorderError> {
        if !self.is_active() {
            return Err(RecorderError::NotRecording);
        }

        log::info!("停止录制: {:?}", self.session_id);

        #[cfg(windows)]
        {
            let session = self.capture.take().ok_or(RecorderError::NotRecording)?;
            let output_path =
                crate::capture_session::stop(session).map_err(|e| RecorderError::System(e))?;
            self.session_id = None;
            self.output_path = None;
            return Ok(output_path);
        }

        #[cfg(not(windows))]
        {
            let output_path = self.output_path.take().ok_or(RecorderError::NotRecording)?;
            finalize_output_file_stub(&output_path)?;
            self.session_id = None;
            self.is_recording = false;
            return Ok(output_path);
        }
    }

    pub fn is_recording(&self) -> bool {
        self.is_active()
    }

    pub fn session_id(&self) -> Option<&String> {
        self.session_id.as_ref()
    }

    fn is_active(&self) -> bool {
        #[cfg(windows)]
        {
            self.capture.is_some()
        }
        #[cfg(not(windows))]
        {
            self.is_recording
        }
    }
}

#[cfg(not(windows))]
fn finalize_output_file_stub(path: &Path) -> Result<(), RecorderError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if !path.exists() {
        std::fs::File::create(path)?;
    }
    Ok(())
}

impl Drop for Recorder {
    fn drop(&mut self) {
        if self.is_active() {
            log::warn!("录屏器被丢弃时仍在录制中，尝试停止");
            let _ = self.stop();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_test_config() -> RecorderConfig {
        RecorderConfig {
            source: "desktop".to_string(),
            window_id: None,
            fps: 30,
            output_dir: PathBuf::from("./test_videos"),
        }
    }

    #[test]
    fn test_recorder_creation_with_valid_source() {
        let config = create_test_config();
        let recorder = Recorder::new(config);
        assert!(recorder.is_ok());
    }

    #[test]
    fn test_recorder_creation_with_invalid_source() {
        let mut config = create_test_config();
        config.source = "invalid".to_string();
        let recorder = Recorder::new(config);
        assert!(recorder.is_err());
    }

    #[test]
    fn test_recorder_window_requires_id() {
        let mut config = create_test_config();
        config.source = "window".to_string();
        config.window_id = None;
        let recorder = Recorder::new(config);
        assert!(recorder.is_err());
    }

    #[cfg(not(windows))]
    #[test]
    fn test_recorder_start() {
        let config = create_test_config();
        let mut recorder = Recorder::new(config).unwrap();
        let session_id = recorder.start().unwrap();
        assert!(!session_id.is_empty());
        assert!(session_id.starts_with("recording_"));
    }

    #[cfg(not(windows))]
    #[test]
    fn test_recorder_start_when_already_recording() {
        let config = create_test_config();
        let mut recorder = Recorder::new(config).unwrap();
        recorder.start().unwrap();
        let result = recorder.start();
        assert!(result.is_err());
    }

    #[cfg(not(windows))]
    #[test]
    fn test_recorder_stop_creates_file() {
        let dir = std::env::temp_dir().join("lite-record-test");
        let _ = std::fs::create_dir_all(&dir);
        let mut config = create_test_config();
        config.output_dir = dir.clone();

        let mut recorder = Recorder::new(config).unwrap();
        recorder.start().unwrap();
        let output_path = recorder.stop().unwrap();
        assert!(output_path.exists());
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_recorder_stop_when_not_recording() {
        let config = create_test_config();
        let mut recorder = Recorder::new(config).unwrap();
        let result = recorder.stop();
        assert!(result.is_err());
    }

    #[cfg(not(windows))]
    #[test]
    fn test_recorder_state() {
        let config = create_test_config();
        let mut recorder = Recorder::new(config).unwrap();

        assert!(!recorder.is_recording());

        recorder.start().unwrap();
        assert!(recorder.is_recording());
        assert!(recorder.session_id().is_some());

        recorder.stop().unwrap();
        assert!(!recorder.is_recording());
        assert!(recorder.session_id().is_none());
    }

    #[test]
    fn test_session_id_format() {
        let session_id = generate_session_id();
        assert!(session_id.starts_with("recording_"));
        let suffix = session_id.strip_prefix("recording_").unwrap();
        let parts: Vec<_> = suffix.split('_').collect();
        assert_eq!(parts.len(), 3, "unexpected session id: {session_id}");
        assert_eq!(parts[0].len(), 8);
        assert_eq!(parts[1].len(), 6);
        assert_eq!(parts[2].len(), 3);
    }
}
