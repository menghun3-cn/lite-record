import { getCurrentWindow } from '@tauri-apps/api/window'

export async function restoreMainWindow(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.unminimize()
    await window.show()
    await window.setFocus()
  } catch (error) {
    console.warn('恢复主窗口失败:', error)
  }
}

/** 窗口最小化或不可见时恢复主窗口，供快捷键开始录制倒计时前使用 */
export async function restoreMainWindowIfNeeded(): Promise<boolean> {
  try {
    const window = getCurrentWindow()
    const [minimized, visible] = await Promise.all([
      window.isMinimized(),
      window.isVisible(),
    ])
    if (minimized || !visible) {
      await restoreMainWindow()
      return true
    }
    return false
  } catch (error) {
    console.warn('检测/恢复主窗口失败:', error)
    return false
  }
}
