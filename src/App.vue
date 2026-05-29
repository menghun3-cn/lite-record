<script setup lang="ts">
import { watch } from 'vue'
import { Play, Square, Monitor, AppWindow, Settings } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useRecorder } from '@/composables/useRecorder'

const {
  isRecording,
  recordingSource,
  selectedWindowId,
  windows,
  durationText,
  lastOutputPath,
  loadWindows,
  toggleRecording,
} = useRecorder()

watch(recordingSource, async (source) => {
  if (source === 'window') {
    await loadWindows()
    selectedWindowId.value = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col" data-testid="app-root">
    <header class="h-12 border-b flex items-center px-4 bg-card">
      <h1 class="text-lg font-semibold">AI Capture</h1>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div class="w-full max-w-sm">
        <Label class="text-sm font-medium mb-3 block">选择录屏源</Label>
        <RadioGroup
          v-model="recordingSource"
          class="flex gap-2"
          :disabled="isRecording"
          data-testid="source-group"
        >
          <div class="flex-1">
            <RadioGroupItem
              id="desktop"
              value="desktop"
              class="peer sr-only"
              data-testid="source-desktop"
            />
            <Label
              for="desktop"
              class="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all min-h-[88px]"
              :class="{ 'opacity-50 cursor-not-allowed': isRecording }"
            >
              <Monitor class="mb-2 h-6 w-6" />
              <span class="text-sm font-medium">整个桌面</span>
            </Label>
          </div>
          <div class="flex-1">
            <RadioGroupItem
              id="window"
              value="window"
              class="peer sr-only"
              data-testid="source-window"
            />
            <Label
              for="window"
              class="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all min-h-[88px]"
              :class="{ 'opacity-50 cursor-not-allowed': isRecording }"
            >
              <AppWindow class="mb-2 h-6 w-6" />
              <span class="text-sm font-medium">选择窗口</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div
        v-if="recordingSource === 'window'"
        class="w-full max-w-sm"
        data-testid="window-picker"
      >
        <Label class="text-sm font-medium mb-2 block">选择要录制的窗口</Label>
        <select
          v-model="selectedWindowId"
          class="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          :disabled="isRecording"
          data-testid="window-select"
        >
          <option :value="null" disabled>请选择窗口...</option>
          <option v-for="win in windows" :key="win.id" :value="win.id">
            {{ win.title }}
          </option>
        </select>
      </div>

      <div class="text-center">
        <div
          class="text-5xl font-mono font-semibold tracking-wider transition-all duration-300"
          :class="isRecording ? 'text-red-500 animate-pulse' : 'text-foreground'"
          data-testid="duration-display"
        >
          {{ durationText }}
        </div>
        <p class="text-sm text-muted-foreground mt-2" data-testid="status-text">
          {{ isRecording ? '正在录制...' : '准备就绪' }}
        </p>
        <p
          v-if="isRecording"
          class="text-xs text-red-500 mt-1"
          data-testid="recording-indicator"
        >
          ● 录制中
        </p>
      </div>

      <Button
        size="lg"
        class="w-full max-w-sm h-14 text-lg font-medium transition-all duration-200"
        :variant="isRecording ? 'destructive' : 'default'"
        :class="isRecording ? 'hover:bg-red-600' : ''"
        :data-testid="isRecording ? 'btn-stop' : 'btn-start'"
        @click="toggleRecording"
      >
        <Play v-if="!isRecording" class="mr-2 h-5 w-5" />
        <Square v-else class="mr-2 h-5 w-5" />
        {{ isRecording ? '停止录制' : '开始录制' }}
      </Button>

      <p
        v-if="lastOutputPath"
        class="text-xs text-green-600 text-center max-w-sm break-all"
        data-testid="last-output-path"
      >
        已保存: {{ lastOutputPath }}
      </p>

      <div class="text-xs text-muted-foreground text-center space-y-1">
        <p>快捷键: Ctrl+Shift+R 开始 | Ctrl+Shift+S 停止</p>
        <p v-if="isRecording">录制中可正常操作其他窗口，主窗口已最小化</p>
      </div>
    </main>

    <footer class="h-12 border-t flex items-center justify-between px-4 bg-card">
      <Button variant="ghost" size="sm" class="text-muted-foreground" data-testid="btn-settings">
        <Settings class="mr-2 h-4 w-4" />
        设置
      </Button>
      <span class="text-xs text-muted-foreground">AI Capture v0.1.0</span>
    </footer>
  </div>
</template>
