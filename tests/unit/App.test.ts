import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import App from '@/App.vue'

const mockInvoke = vi.mocked(invoke)

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      return null
    })
  })

  it('渲染主界面', () => {
    const wrapper = mount(App)
    expect(wrapper.find('[data-testid="app-root"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('lite-record')
  })

  it('显示录屏源选择', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('整个桌面')
    expect(wrapper.text()).toContain('选择窗口')
  })

  it('显示开始录制按钮', () => {
    const wrapper = mount(App)
    expect(wrapper.find('[data-testid="btn-start"]').exists()).toBe(true)
  })

  it('显示准备就绪状态', () => {
    const wrapper = mount(App)
    expect(wrapper.find('[data-testid="status-text"]').text()).toContain('准备就绪')
  })

  it('点击开始录制调用 Tauri 命令', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      return null
    })

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-start"]').trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith('start_recording', {
      source: 'desktop',
      windowId: null,
    })
  })

  it('录制开始后显示停止按钮与状态', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      return null
    })

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-start"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="btn-stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="status-text"]').text()).toContain('正在录制')
    expect(wrapper.find('[data-testid="recording-indicator"]').exists()).toBe(true)
  })

  it('点击停止录制调用停止命令', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') return 'recording_20260101_120000'
      if (cmd === 'stop_recording') return 'D:/video/recording.mp4'
      return null
    })

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-start"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="btn-stop"]').trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith('stop_recording')
  })

  it('处理录制错误后恢复初始状态', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') throw new Error('录制失败')
      return null
    })

    vi.stubGlobal('alert', vi.fn())

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-start"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="btn-start"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="status-text"]').text()).toContain('准备就绪')

    vi.unstubAllGlobals()
  })
})
