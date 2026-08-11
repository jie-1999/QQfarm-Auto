<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  type?: string
  placeholder?: string
  label?: string
  disabled?: boolean
  clearable?: boolean
}>(), {
  type: 'text',
})

const emit = defineEmits<{
  (e: 'clear'): void
}>()

const model = defineModel<string | number>()
const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password' && showPassword.value)
    return 'text'
  return props.type || 'text'
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm text-[var(--text-secondary)] font-medium">
      {{ label }}
    </label>
    <div class="relative">
      <input
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all duration-200 disabled:cursor-not-allowed focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        :class="{ 'pr-10': type === 'password' || (clearable && model) }"
      >
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute right-3 top-1/2 text-[var(--text-muted)] transition-colors -translate-y-1/2 hover:text-[var(--text-secondary)]"
        @click="showPassword = !showPassword"
      >
        <div v-if="showPassword" class="i-carbon-view-off" />
        <div v-else class="i-carbon-view" />
      </button>
      <button
        v-else-if="clearable && model"
        type="button"
        class="absolute right-3 top-1/2 text-[var(--text-muted)] transition-colors -translate-y-1/2 hover:text-[var(--text-secondary)]"
        @click="model = ''; emit('clear')"
      >
        <div class="i-carbon-close" />
      </button>
    </div>
  </div>
</template>

<style scoped>
input::-ms-reveal,
input::-ms-clear {
  display: none;
}
</style>
