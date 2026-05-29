import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useAppMessage } from '@/composables/useAppMessage'
import { restoreMainWindow } from '@/utils/restoreMainWindow'

export type RecordingSource = 'desktop' | 'window'

export interface WindowInfo {
  id: number
  title: string
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function useRecorder() {
  const { showError, clearMessage } = useAppMessage()
  const isRecording = ref(false)
  const recordingSource = ref<RecordingSource>('desktop')
  const selectedWindowId = ref<number | null>(null)
  const windows = ref<WindowInfo[]>([])
  const duration = ref(0)
  const durationText = ref('00:00')
  const lastOutputPath = ref<string | null>(null)
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let startInFlight = false
  let stopInFlight = false

  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function startTimer() {
    clearTimer()
    duration.value = 0
    durationText.value = '00:00'
    timerInterval = setInterval(() => {
      duration.value++
      durationText.value = formatDuration(duration.value)
    }, 1000)
  }

  async function loadWindows() {
    try {
      windows.value = await invoke<WindowInfo[]>('list_windows')
    } catch (error) {
      console.error('加载窗口列表失败:', error)
      windows.value = []
    }
  }

  async function syncRecordingState() {
    try {
      isRecording.value = await invoke<boolean>('get_recording_state')
      if (isRecording.value) {
        startTimer()
      }
    } catch {
      isRecording.value = false
    }
  }

  async function startRecording() {
    if (isRecording.value || startInFlight || stopInFlight) return

    if (recordingSource.value === 'window' && selectedWindowId.value == null) {
      showError('请先选择一个窗口')
      return
    }

    startInFlight = true
    try {
      await invoke<string>('start_recording', {
        source: recordingSource.value,
        windowId:
          recordingSource.value === 'window' ? selectedWindowId.value : null,
      })
      clearMessage()
      isRecording.value = true
      startTimer()
    } catch (error) {
      const message = String(error)
      if (message.includes('已在录制中')) {
        await syncRecordingState()
        return
      }
      console.error('开始录制失败:', error)
      showError(message)
      isRecording.value = false
      clearTimer()
      durationText.value = '00:00'
      await syncRecordingState()
    } finally {
      startInFlight = false
    }
  }

  function resetRecordingUi() {
    isRecording.value = false
    clearTimer()
    duration.value = 0
    durationText.value = '00:00'
  }

  async function stopRecording() {
    if (!isRecording.value || stopInFlight || startInFlight) return

    stopInFlight = true
    try {
      const path = await invoke<string>('stop_recording')
      lastOutputPath.value = path
      clearMessage()
      resetRecordingUi()
    } catch (error) {
      const message = String(error)
      if (message.includes('没有正在进行的录制')) {
        resetRecordingUi()
        await syncRecordingState()
        await restoreMainWindow()
        return
      }
      console.error('停止录制失败:', error)
      await restoreMainWindow()
      showError(`停止录制失败: ${error}`)
    } finally {
      stopInFlight = false
    }
  }

  function toggleRecording() {
    if (isRecording.value) {
      void stopRecording()
    } else {
      void startRecording()
    }
  }

  async function registerShortcuts() {
    try {
      await unregisterShortcuts()
      await register('CommandOrControl+Shift+R', () => {
        void startRecording()
      })
      await register('CommandOrControl+Shift+S', () => {
        if (isRecording.value) void stopRecording()
      })
    } catch (error) {
      console.error('注册快捷键失败:', error)
    }
  }

  async function unregisterShortcuts() {
    try {
      await unregister('CommandOrControl+Shift+R')
      await unregister('CommandOrControl+Shift+S')
    } catch (error) {
      console.error('注销快捷键失败:', error)
    }
  }

  let unlistenStart: (() => void) | undefined
  let unlistenStop: (() => void) | undefined

  onMounted(async () => {
    await loadWindows()
    await syncRecordingState()
    await registerShortcuts()

    unlistenStart = await listen<string>('recording-started', () => {
      clearMessage()
      isRecording.value = true
      startTimer()
    })
    unlistenStop = await listen<string>('recording-stopped', (event) => {
      isRecording.value = false
      lastOutputPath.value = event.payload
      clearMessage()
      clearTimer()
      duration.value = 0
      durationText.value = '00:00'
    })
  })

  onUnmounted(() => {
    unlistenStart?.()
    unlistenStop?.()
    void unregisterShortcuts()
    clearTimer()
  })

  return {
    isRecording,
    recordingSource,
    selectedWindowId,
    windows,
    duration,
    durationText,
    lastOutputPath,
    loadWindows,
    startRecording,
    stopRecording,
    toggleRecording,
    formatDuration,
  }
}
