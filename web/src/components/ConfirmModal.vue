<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  show: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'primary'
  isAlert?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Transition name="scale">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click="emit('cancel')">
      <div class="max-w-sm w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
        <h3 class="mb-2 text-base font-semibold">
          {{ title || '确认操作' }}
        </h3>
        <p class="mb-6 whitespace-pre-line text-sm text-[var(--text-secondary)]">
          {{ message || '确定要执行此操作吗？' }}
        </p>
        <div class="flex justify-end gap-2">
          <BaseButton
            v-if="!isAlert"
            variant="secondary"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ cancelText || '取消' }}
          </BaseButton>
          <BaseButton
            :variant="type === 'danger' ? 'danger' : 'primary'"
            :loading="loading"
            @click="emit('confirm')"
          >
            {{ confirmText || '确定' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
