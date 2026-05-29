<script setup lang="ts">
import { watch } from 'vue'
import { Play, Square, Monitor, AppWindow, Settings, FolderOpen } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useRecorder } from '@/composables/useRecorder'
import { useVideoDir } from '@/composables/useVideoDir'

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

const { videoDir, isOpening, openVideoDir } = useVideoDir()

watch(recordingSource, async (source) => {
  if (source === 'window') {
    await loadWindows()
    selectedWindowId.value = null
  }
})
</script>

<template>
  <div class="h-full overflow-hidden bg-background flex flex-col" data-testid="app-root">
    <main class="flex-1 min-h-0 flex flex-col items-center px-4 py-3 gap-3 overflow-hidden">
      <div class="w-full max-w-sm shrink-0">
        <Label class="text-sm font-medium mb-2 block">选择录屏源</Label>
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
              class="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all min-h-[72px]"
              :class="{ 'opacity-50 cursor-not-allowed': isRecording }"
            >
              <Monitor class="mb-1.5 h-5 w-5" />
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
              class="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all min-h-[72px]"
              :class="{ 'opacity-50 cursor-not-allowed': isRecording }"
            >
              <AppWindow class="mb-1.5 h-5 w-5" />
              <span class="text-sm font-medium">选择窗口</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div
        v-if="recordingSource === 'window'"
        class="w-full max-w-sm shrink-0"
        data-testid="window-picker"
      >
        <Label class="text-sm font-medium mb-1.5 block">选择要录制的窗口</Label>
        <select
          v-model="selectedWindowId"
          class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          :disabled="isRecording"
          data-testid="window-select"
        >
          <option :value="null" disabled>请选择窗口...</option>
          <option v-for="win in windows" :key="win.id" :value="win.id">
            {{ win.title }}
          </option>
        </select>
      </div>

      <div class="flex-1 min-h-0 flex flex-col items-center justify-center text-center shrink">
        <div
          class="text-4xl font-mono font-semibold tracking-wider transition-all duration-300"
          :class="isRecording ? 'text-red-500 animate-pulse' : 'text-foreground'"
          data-testid="duration-display"
        >
          {{ durationText }}
        </div>
        <p class="text-sm text-muted-foreground mt-1" data-testid="status-text">
          {{ isRecording ? '正在录制...' : '准备就绪' }}
        </p>
        <p
          v-if="isRecording"
          class="text-xs text-red-500 mt-0.5"
          data-testid="recording-indicator"
        >
          ● 录制中
        </p>
      </div>

      <div class="w-full max-w-sm shrink-0 space-y-2">
        <Button
          size="lg"
          class="w-full h-12 text-base font-medium transition-all duration-200"
          :variant="isRecording ? 'destructive' : 'default'"
          :class="isRecording ? 'hover:bg-red-600' : ''"
          :data-testid="isRecording ? 'btn-stop' : 'btn-start'"
          @click="toggleRecording"
        >
          <Play v-if="!isRecording" class="mr-2 h-4 w-4" />
          <Square v-else class="mr-2 h-4 w-4" />
          {{ isRecording ? '停止录制' : '开始录制' }}
        </Button>

        <p
          v-if="lastOutputPath"
          class="text-xs text-green-600 text-center truncate"
          :title="lastOutputPath"
          data-testid="last-output-path"
        >
          已保存: {{ lastOutputPath }}
        </p>

        <p class="text-[11px] text-muted-foreground text-center leading-tight">
          快捷键: Ctrl+Shift+R 开始 | Ctrl+Shift+S 停止
          <template v-if="isRecording">
            · 录制中可正常操作其他窗口
          </template>
        </p>
      </div>

      <div
        class="w-full max-w-sm shrink-0 rounded-lg border bg-card p-2.5"
        data-testid="video-dir-section"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <Label class="text-xs text-muted-foreground shrink-0">存储路径</Label>
          <Button
            variant="outline"
            size="sm"
            class="h-7 px-2 text-xs shrink-0"
            :disabled="!videoDir || isOpening"
            data-testid="btn-open-video-dir"
            @click="openVideoDir"
          >
            <FolderOpen class="mr-1 h-3 w-3" />
            打开目录
          </Button>
        </div>
        <p
          class="text-[11px] text-foreground truncate leading-tight"
          :title="videoDir"
          data-testid="video-dir-path"
        >
          {{ videoDir || '加载中...' }}
        </p>
      </div>
    </main>

    <footer class="h-10 border-t flex items-center justify-between px-4 bg-card shrink-0">
      <Button variant="ghost" size="sm" class="h-8 text-muted-foreground" data-testid="btn-settings">
        <Settings class="mr-1.5 h-3.5 w-3.5" />
        设置
      </Button>
      <span class="text-xs text-muted-foreground">v0.1.0</span>
    </footer>
  </div>
</template>
