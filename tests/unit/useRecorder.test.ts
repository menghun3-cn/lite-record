import { defineComponent } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import { register } from '@tauri-apps/plugin-global-shortcut'
import {
  RECORDING_COUNTDOWN_SECONDS,
  useRecorder,
} from '@/composables/useRecorder'

const mockInvoke = vi.mocked(invoke)
const mockRegister = vi.mocked(register)

function mountRecorder() {
  const Comp = defineComponent({
    setup() {
      return useRecorder()
    },
    template: '<div />',
  })
  return mount(Comp)
}

async function advanceCountdown() {
  await vi.advanceTimersByTimeAsync(RECORDING_COUNTDOWN_SECONDS * 1000)
}

describe('useRecorder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') return 'C:\\Users\\admin\\.lite-record\\video\\out.mp4'
      return null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('开始录制前显示 3 秒倒计时', async () => {
    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording()
    await flushPromises()

    expect(wrapper.vm.isCountdown).toBe(true)
    expect(wrapper.vm.countdownValue).toBe(RECORDING_COUNTDOWN_SECONDS)
    expect(mockInvoke.mock.calls.filter(([cmd]) => cmd === 'start_recording')).toHaveLength(0)

    await advanceCountdown()
    await startPromise
    await flushPromises()

    expect(wrapper.vm.isCountdown).toBe(false)
    expect(wrapper.vm.isRecording).toBe(true)
    expect(mockInvoke.mock.calls.filter(([cmd]) => cmd === 'start_recording')).toHaveLength(1)
  })

  it('快捷键开始且窗口最小化时先恢复主窗口', async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const unminimize = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getCurrentWindow).mockReturnValue({
      isMinimized: vi.fn().mockResolvedValue(true),
      isVisible: vi.fn().mockResolvedValue(true),
      unminimize,
      show: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    } as never)

    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording({ fromShortcut: true })
    await flushPromises()

    expect(unminimize).toHaveBeenCalled()
    expect(wrapper.vm.isCountdown).toBe(true)

    await advanceCountdown()
    await startPromise
    await flushPromises()
  })

  it('倒计时期间 cancelCountdownStart 不会开始录制', async () => {
    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording()
    await flushPromises()
    expect(wrapper.vm.isCountdown).toBe(true)

    wrapper.vm.cancelCountdownStart()
    await startPromise
    await flushPromises()

    expect(wrapper.vm.isCountdown).toBe(false)
    expect(wrapper.vm.isRecording).toBe(false)
    expect(mockInvoke.mock.calls.filter(([cmd]) => cmd === 'start_recording')).toHaveLength(0)
  })

  it('并发 startRecording 仅调用一次 start_recording', async () => {
    let resolveStart: (value: string) => void
    const startPromise = new Promise<string>((resolve) => {
      resolveStart = resolve
    })

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return startPromise
      if (cmd === 'stop_recording') return 'C:\\Users\\admin\\.lite-record\\video\\out.mp4'
      return null
    })

    const wrapper = mountRecorder()
    await flushPromises()

    const first = wrapper.vm.startRecording()
    const second = wrapper.vm.startRecording()
    await flushPromises()

    await advanceCountdown()
    resolveStart!('recording_20260101_120000_123')
    await Promise.all([first, second])
    await flushPromises()

    expect(
      mockInvoke.mock.calls.filter(([cmd]) => cmd === 'start_recording'),
    ).toHaveLength(1)
    expect(wrapper.vm.isRecording).toBe(true)
  })

  it('并发 stopRecording 仅调用一次 stop_recording', async () => {
    let resolveStop: (value: string) => void
    const stopPromise = new Promise<string>((resolve) => {
      resolveStop = resolve
    })

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') return stopPromise
      return null
    })

    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)

    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording()
    await flushPromises()
    await advanceCountdown()
    await startPromise
    await flushPromises()

    const first = wrapper.vm.stopRecording()
    const second = wrapper.vm.stopRecording()

    resolveStop!('C:\\Users\\admin\\.lite-record\\video\\out.mp4')
    await Promise.all([first, second])
    await flushPromises()

    expect(
      mockInvoke.mock.calls.filter(([cmd]) => cmd === 'stop_recording'),
    ).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(wrapper.vm.isRecording).toBe(false)

    vi.unstubAllGlobals()
  })

  it('停止进行中时忽略 startRecording', async () => {
    let resolveStop: (value: string) => void
    const stopPromise = new Promise<string>((resolve) => {
      resolveStop = resolve
    })

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') return stopPromise
      return null
    })

    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording()
    await flushPromises()
    await advanceCountdown()
    await startPromise
    await flushPromises()

    const stopCall = wrapper.vm.stopRecording()
    const startDuringStop = wrapper.vm.startRecording()
    await flushPromises()

    expect(
      mockInvoke.mock.calls.filter(([cmd]) => cmd === 'start_recording'),
    ).toHaveLength(1)

    resolveStop!('C:\\Users\\admin\\.lite-record\\video\\out.mp4')
    await stopCall
    await startDuringStop
    await flushPromises()

    expect(wrapper.vm.isRecording).toBe(false)
  })

  it('快捷键重复触发 stop 时不弹错', async () => {
    let stopCalls = 0
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') {
        stopCalls++
        if (stopCalls === 1) return 'C:\\Users\\admin\\.lite-record\\video\\out.mp4'
        throw '没有正在进行的录制'
      }
      return null
    })

    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)

    const wrapper = mountRecorder()
    await flushPromises()

    const startPromise = wrapper.vm.startRecording()
    await flushPromises()
    await advanceCountdown()
    await startPromise
    await flushPromises()

    const stopShortcut = mockRegister.mock.calls.find(
      ([shortcut]) => shortcut === 'CommandOrControl+Shift+S',
    )?.[1] as (() => void) | undefined

    expect(stopShortcut).toBeTypeOf('function')

    stopShortcut!()
    await flushPromises()
    stopShortcut!()
    await flushPromises()

    expect(
      mockInvoke.mock.calls.filter(([cmd]) => cmd === 'stop_recording'),
    ).toHaveLength(1)
    expect(alertSpy).not.toHaveBeenCalled()
    expect(wrapper.vm.isRecording).toBe(false)

    vi.unstubAllGlobals()
  })
})
