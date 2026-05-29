import { ref } from 'vue'

const message = ref<string | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useAppMessage() {
  function clearMessage() {
    message.value = null
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function showError(text: string) {
    clearMessage()
    message.value = text
    hideTimer = setTimeout(clearMessage, 8000)
  }

  return {
    message,
    showError,
    clearMessage,
  }
}
