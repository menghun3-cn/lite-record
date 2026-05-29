import { defineComponent } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import { register } from '@tauri-apps/plugin-global-shortcut'
import { useRecorder } from '@/composables/useRecorder'

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

describe('useRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') return 'C:\\Users\\admin\\.lite-record\\video\\out.mp4'
      return null
    })
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

    await wrapper.vm.startRecording()
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

    await wrapper.vm.startRecording()
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
