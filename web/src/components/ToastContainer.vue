<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)

function getIcon(type: string) {
  switch (type) {
    case 'success': return 'i-carbon-checkmark-filled'
    case 'error': return 'i-carbon-error-filled'
    case 'warning': return 'i-carbon-warning-filled'
    default: return 'i-carbon-information-filled'
  }
}

function getColor(type: string) {
  switch (type) {
    case 'success': return 'text-[var(--status-success)]'
    case 'error': return 'text-[var(--status-error)]'
    case 'warning': return 'text-[var(--status-warning)]'
    default: return 'text-[var(--status-info)]'
  }
}
</script>

<template>
  <div class="fixed right-4 top-4 z-[9999] flex flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="w-80 flex items-start gap-3 border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] p-3.5 shadow-lg"
      >
        <div :class="[getIcon(toast.type), getColor(toast.type)]" class="mt-0.5 shrink-0 text-lg" />
        <div class="flex-1 break-words text-sm text-[var(--text-secondary)]">
          {{ toast.message }}
        </div>
        <button
          class="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          @click="toastStore.remove(toast.id)"
        >
          <div class="i-carbon-close" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
