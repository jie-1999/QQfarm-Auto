<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline' | 'text'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  to?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const componentTag = computed(() => {
  if (props.to)
    return RouterLink
  if (props.href)
    return 'a'
  return 'button'
})

const classes = computed(() => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-app)] disabled:cursor-not-allowed disabled:opacity-50'

  const variants: Record<string, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm',
    secondary: 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)]',
    danger: 'bg-[var(--status-error)] text-white hover:opacity-90 shadow-sm',
    success: 'bg-[var(--status-success)] text-white hover:opacity-90 shadow-sm',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
    outline: 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
    text: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline p-0',
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return [
    base,
    variants[props.variant] || variants.primary,
    sizes[props.size] || sizes.md,
    props.block ? 'w-full' : '',
  ]
})
</script>

<template>
  <component
    :is="componentTag"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :disabled="disabled || loading"
    :class="classes"
    @click="!disabled && !loading && emit('click', $event)"
  >
    <div v-if="loading" class="i-svg-spinners-ring-resize animate-spin" />
    <slot />
  </component>
</template>
