<script setup lang="ts">
defineProps<{
  label?: string
}>()
const model = defineModel<boolean>()
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-3">
    <div class="relative inline-flex items-center">
      <input v-model="model" type="checkbox" class="peer sr-only">
      <div class="h-6 w-11 rounded-full bg-[var(--surface-active)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-[var(--border-default)] after:rounded-full after:bg-[var(--surface-elevated)] peer-checked:bg-[var(--accent)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent)]/20 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-[var(--surface-elevated)]" />
    </div>
    <span v-if="label" class="select-none text-sm text-[var(--text-secondary)] font-medium">
      {{ label }}
    </span>
  </label>
</template>
