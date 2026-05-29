import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export function useVideoDir() {
  const videoDir = ref('')
  const isOpening = ref(false)

  async function loadVideoDir() {
    try {
      videoDir.value = await invoke<string>('get_video_dir')
    } catch (error) {
      console.error('加载存储路径失败:', error)
      videoDir.value = ''
    }
  }

  async function openVideoDir() {
    if (isOpening.value) return

    isOpening.value = true
    try {
      await invoke('open_video_dir')
    } catch (error) {
      console.error('打开存储目录失败:', error)
      alert(`打开目录失败: ${error}`)
    } finally {
      isOpening.value = false
    }
  }

  onMounted(() => {
    void loadVideoDir()
  })

  return {
    videoDir,
    isOpening,
    loadVideoDir,
    openVideoDir,
  }
}
