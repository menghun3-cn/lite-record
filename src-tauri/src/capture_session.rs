//! Windows Graphics Capture 录屏会话（windows-capture）

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use windows_capture::capture::{CaptureControl, Context, GraphicsCaptureApiHandler};
use windows_capture::encoder::{
    AudioSettingsBuilder, ContainerSettingsBuilder, VideoEncoder, VideoSettingsBuilder,
    VideoSettingsSubType,
};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::InternalCaptureControl;
use windows_capture::monitor::Monitor;
use windows_capture::settings::{
    ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
    MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
};
use windows_capture::window::Window;

use crate::recorder::RecorderConfig;

/// 共享停止信号
#[derive(Clone)]
pub struct CaptureFlags {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub output_path: PathBuf,
    pub stop: Arc<AtomicBool>,
}

struct ScreenCaptureHandler {
    encoder: Option<VideoEncoder>,
    flags: CaptureFlags,
}

impl GraphicsCaptureApiHandler for ScreenCaptureHandler {
    type Flags = CaptureFlags;
    type Error = Box<dyn std::error::Error + Send + Sync>;

    fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
        let flags = ctx.flags.clone();
        let output = flags.output_path.to_str().ok_or("输出路径包含非法字符")?;

        let video_settings = VideoSettingsBuilder::new(flags.width, flags.height)
            .sub_type(VideoSettingsSubType::H264)
            .frame_rate(flags.fps)
            .bitrate(8_000_000);

        let encoder = VideoEncoder::new(
            video_settings,
            AudioSettingsBuilder::default().disabled(true),
            ContainerSettingsBuilder::default(),
            output,
        )?;

        Ok(Self {
            encoder: Some(encoder),
            flags,
        })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        if self.flags.stop.load(Ordering::SeqCst) {
            if let Some(encoder) = self.encoder.take() {
                encoder.finish()?;
            }
            capture_control.stop();
            return Ok(());
        }

        if let Some(encoder) = self.encoder.as_mut() {
            encoder.send_frame(frame)?;
        }

        Ok(())
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        if let Some(encoder) = self.encoder.take() {
            let _ = encoder.finish();
        }
        Ok(())
    }
}

pub struct CaptureSession {
    stop: Arc<AtomicBool>,
    control: CaptureControl<ScreenCaptureHandler, Box<dyn std::error::Error + Send + Sync>>,
    pub output_path: PathBuf,
}

fn start_with_item<T>(
    item: T,
    width: u32,
    height: u32,
    fps: u32,
    output_path: PathBuf,
    stop: Arc<AtomicBool>,
) -> Result<CaptureSession, String>
where
    T: TryInto<windows_capture::settings::GraphicsCaptureItemType> + Send + 'static,
{
    if width == 0 || height == 0 {
        return Err("无效的录制尺寸".to_string());
    }

    let frame_interval = Duration::from_millis((1000 / fps.max(1)) as u64);
    let flags = CaptureFlags {
        width,
        height,
        fps,
        output_path: output_path.clone(),
        stop: stop.clone(),
    };

    let settings = Settings::new(
        item,
        CursorCaptureSettings::Default,
        DrawBorderSettings::WithoutBorder,
        SecondaryWindowSettings::Default,
        MinimumUpdateIntervalSettings::Custom(frame_interval),
        DirtyRegionSettings::Default,
        ColorFormat::Rgba8,
        flags,
    );

    let control = ScreenCaptureHandler::start_free_threaded(settings)
        .map_err(|e| format!("启动录屏失败: {}", e))?;

    Ok(CaptureSession {
        stop,
        control,
        output_path,
    })
}

pub fn start(config: &RecorderConfig, output_path: PathBuf) -> Result<CaptureSession, String> {
    let stop = Arc::new(AtomicBool::new(false));

    if config.source == "desktop" {
        let monitor = Monitor::primary().map_err(|e| format!("获取主显示器失败: {}", e))?;
        let width = monitor
            .width()
            .map_err(|e| format!("获取宽度失败: {}", e))?;
        let height = monitor
            .height()
            .map_err(|e| format!("获取高度失败: {}", e))?;
        return start_with_item(monitor, width, height, config.fps, output_path, stop);
    }

    if config.source == "window" {
        let hwnd = config.window_id.ok_or("窗口录制需要 window_id")?;
        let window = Window::from_raw_hwnd(hwnd as *mut std::ffi::c_void);
        if !window.is_valid() {
            return Err("所选窗口不可录制".to_string());
        }
        let width = window
            .width()
            .map_err(|e| format!("获取窗口宽度失败: {}", e))? as u32;
        let height = window
            .height()
            .map_err(|e| format!("获取窗口高度失败: {}", e))? as u32;
        return start_with_item(window, width, height, config.fps, output_path, stop);
    }

    Err(format!("不支持的录屏源: {}", config.source))
}

pub fn stop(session: CaptureSession) -> Result<PathBuf, String> {
    session.stop.store(true, Ordering::SeqCst);

    session
        .control
        .stop()
        .map_err(|e| format!("停止录屏失败: {}", e))?;

    if !session.output_path.exists() {
        return Err(format!("视频文件未生成: {:?}", session.output_path));
    }

    Ok(session.output_path)
}
