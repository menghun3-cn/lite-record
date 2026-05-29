import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  restoreMainWindow,
  restoreMainWindowIfNeeded,
} from '@/utils/restoreMainWindow'

describe('restoreMainWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restoreMainWindowIfNeeded 在最小化时恢复窗口', async () => {
    const unminimize = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getCurrentWindow).mockReturnValue({
      isMinimized: vi.fn().mockResolvedValue(true),
      isVisible: vi.fn().mockResolvedValue(true),
      unminimize,
      show: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    } as never)

    const restored = await restoreMainWindowIfNeeded()

    expect(restored).toBe(true)
    expect(unminimize).toHaveBeenCalled()
  })

  it('restoreMainWindowIfNeeded 在可见且未最小化时不恢复', async () => {
    const unminimize = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getCurrentWindow).mockReturnValue({
      isMinimized: vi.fn().mockResolvedValue(false),
      isVisible: vi.fn().mockResolvedValue(true),
      unminimize,
      show: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    } as never)

    const restored = await restoreMainWindowIfNeeded()

    expect(restored).toBe(false)
    expect(unminimize).not.toHaveBeenCalled()
  })

  it('restoreMainWindow 调用 unminimize/show/setFocus', async () => {
    const unminimize = vi.fn().mockResolvedValue(undefined)
    const show = vi.fn().mockResolvedValue(undefined)
    const setFocus = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getCurrentWindow).mockReturnValue({
      isMinimized: vi.fn().mockResolvedValue(false),
      isVisible: vi.fn().mockResolvedValue(true),
      unminimize,
      show,
      setFocus,
    } as never)

    await restoreMainWindow()

    expect(unminimize).toHaveBeenCalled()
    expect(show).toHaveBeenCalled()
    expect(setFocus).toHaveBeenCalled()
  })
})
