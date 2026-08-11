<script setup lang="ts">
import { ref } from 'vue'
import BagPanel from '@/components/BagPanel.vue'
import FarmPanel from '@/components/FarmPanel.vue'
import TaskPanel from '@/components/TaskPanel.vue'

const currentTab = ref<'farm' | 'bag' | 'task'>('farm')
</script>

<template>
  <div class="mx-auto h-full max-w-7xl flex flex-col p-4 md:p-6">
    <div class="mb-5">
      <h1 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
        个人中心
      </h1>
      <p class="mt-1 text-sm text-[var(--text-muted)]">
        管理你的农场、背包与任务
      </p>
    </div>

    <div class="mb-5 inline-flex gap-1 border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)] p-1">
      <button
        class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
        :class="currentTab === 'farm'
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'"
        @click="currentTab = 'farm'"
      >
        <div class="i-carbon-sprout text-base" />
        <span>我的农场</span>
      </button>
      <button
        class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
        :class="currentTab === 'bag'
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'"
        @click="currentTab = 'bag'"
      >
        <div class="i-carbon-box text-base" />
        <span>我的背包</span>
      </button>
      <button
        class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
        :class="currentTab === 'task'
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'"
        @click="currentTab = 'task'"
      >
        <div class="i-carbon-task text-base" />
        <span>我的任务</span>
      </button>
    </div>

    <div class="flex-1 overflow-hidden overflow-y-auto">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <component :is="currentTab === 'farm' ? FarmPanel : (currentTab === 'bag' ? BagPanel : TaskPanel)" />
      </Transition>
    </div>
  </div>
</template>
