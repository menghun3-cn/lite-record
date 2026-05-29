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
      if (cmd === 'get_video_dir') return 'C:\\Users\\admin\\.lite-record\\video'
      return null
    })
  })

  it('渲染主界面', async () => {
    const wrapper = mount(App)
    await flushPromises()
    expect(wrapper.find('[data-testid="app-root"]').exists()).toBe(true)
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('[data-testid="video-dir-section"]').exists()).toBe(true)
  })

  it('显示存储路径', async () => {
    const wrapper = mount(App)
    await flushPromises()
    expect(wrapper.find('[data-testid="video-dir-path"]').text()).toContain(
      '.lite-record\\video',
    )
  })

  it('点击打开目录调用 Tauri 命令', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-open-video-dir"]').trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith('open_video_dir')
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
    expect(wrapper.find('[data-testid="status-text"]').text()).toContain('录制中')
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

  it('处理录制错误后显示可关闭提示并恢复初始状态', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_windows') return []
      if (cmd === 'get_recording_state') return false
      if (cmd === 'start_recording') throw new Error('录制失败')
      return null
    })

    const wrapper = mount(App)
    await flushPromises()

    await wrapper.find('[data-testid="btn-start"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="app-message"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-message"]').text()).toContain('录制失败')
    expect(wrapper.find('[data-testid="btn-start"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="status-text"]').text()).toContain('准备就绪')

    await wrapper.find('[data-testid="btn-dismiss-message"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="app-message"]').exists()).toBe(false)
  })
})
