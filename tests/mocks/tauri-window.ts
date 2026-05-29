import { vi } from 'vitest'

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    isMinimized: vi.fn().mockResolvedValue(false),
    isVisible: vi.fn().mockResolvedValue(true),
    unminimize: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    setFocus: vi.fn().mockResolvedValue(undefined),
  })),
}))
