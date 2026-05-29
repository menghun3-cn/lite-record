import { describe, it, expect } from 'vitest'
import { formatDuration } from '@/composables/useRecorder'

describe('formatDuration', () => {
  it('格式化 0 秒', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('格式化分钟与秒', () => {
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(332)).toBe('05:32')
  })
})
