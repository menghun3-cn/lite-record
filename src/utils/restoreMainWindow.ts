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
