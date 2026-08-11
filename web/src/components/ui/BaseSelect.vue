<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  label?: string
  options?: { label: string, value: string | number, disabled?: boolean }[]
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'change', value: string | number): void
}>()

const model = defineModel<string | number>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const selected = props.options?.find(opt => opt.value === model.value)
  return selected ? selected.label : (props.placeholder || '请选择')
})

function toggleDropdown() {
  if (props.disabled)
    return
  isOpen.value = !isOpen.value
}

function selectOption(value: string | number) {
  model.value = value
  isOpen.value = false
  emit('change', value)
}

function closeDropdown(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div ref="containerRef" class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm text-[var(--text-secondary)] font-medium">
      {{ label }}
    </label>
    <div class="relative">
      <!-- Trigger -->
      <div
        class="w-full flex cursor-pointer items-center justify-between border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-all duration-200"
        :class="{
          'cursor-not-allowed bg-[var(--surface-app)] text-[var(--text-disabled)]': disabled,
          'border-[var(--accent)] ring-2 ring-[var(--accent)]/20': isOpen,
          'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20': !disabled && !isOpen,
        }"
        @click="toggleDropdown"
      >
        <span class="truncate">{{ selectedLabel }}</span>
        <div class="i-carbon-chevron-down text-lg text-[var(--text-muted)] transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </div>

      <!-- Dropdown Menu -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="isOpen"
          class="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] py-1 shadow-lg"
        >
          <template v-if="options?.length">
            <div
              v-for="opt in options"
              :key="opt.value"
              class="cursor-pointer px-3 py-2 text-sm transition-colors duration-150 hover:bg-[var(--surface-hover)]"
              :class="{
                'bg-[var(--accent-muted)] text-[var(--accent)]': model === opt.value,
                'cursor-not-allowed text-[var(--text-disabled)] hover:bg-transparent': opt.disabled,
                'text-[var(--text-secondary)]': model !== opt.value && !opt.disabled,
              }"
              @click="!opt.disabled && selectOption(opt.value)"
            >
              <slot name="option" :option="opt" :selected="model === opt.value">
                {{ opt.label }}
              </slot>
            </div>
          </template>
          <div v-else class="px-3 py-2 text-center text-sm text-[var(--text-muted)]">
            暂无选项
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
