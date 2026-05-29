<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, type RadioGroupItemProps, useForwardProps } from 'reka-ui'
import { Circle } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<RadioGroupItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    v-bind="forwardedProps"
    :class="cn(
      'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      class="relative flex items-center justify-center"
    >
      <Circle class="size-2.5 fill-primary" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
