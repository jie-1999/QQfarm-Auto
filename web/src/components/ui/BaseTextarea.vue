<script setup lang="ts">
defineProps<{
  placeholder?: string
  label?: string
  disabled?: boolean
  rows?: number
}>()
const model = defineModel<string>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm text-[var(--text-secondary)] font-medium">
      {{ label }}
    </label>
    <textarea
      v-model="model"
      :rows="rows || 3"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 disabled:cursor-not-allowed focus:border-[var(--accent)] disabled:bg-[var(--surface-app)] disabled:text-[var(--text-disabled)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]/20"
    />
  </div>
</template>
