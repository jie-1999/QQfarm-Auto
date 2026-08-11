<script setup lang="ts">
import type { Theme } from '@/stores/app'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

function selectTheme(theme: Theme) {
  appStore.applyTheme(theme)
  appStore.toggleThemePanel()
}
</script>

<template>
  <div class="relative">
    <!-- 主题切换按钮 -->
    <button
      class="icon-btn mx-2 !outline-none"
      title="主题设置"
      @click="appStore.toggleThemePanel()"
    >
      <div i-carbon-color-palette />
    </button>

    <!-- 使用 Teleport 将面板渲染到 body，避免被父容器裁剪 -->
    <teleport to="body">
      <!-- 遮罩层 -->
      <div
        v-if="appStore.showThemePanel"
        class="fixed inset-0 z-[99] bg-black/30"
        @click="appStore.toggleThemePanel()"
      />

      <div
        v-if="appStore.showThemePanel"
        class="fixed z-[100] w-80 border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-4 shadow-lg"
        :style="{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }"
      >
        <h3 class="mb-3 text-sm text-[var(--text-primary)] font-semibold tracking-tight">
          选择主题
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(t, theme) in appStore.themes"
            :key="theme"
            class="relative flex flex-col items-center justify-center gap-2 rounded-lg p-3 transition-all duration-200 hover:scale-105"
            :class="{
              'ring-2 ring-offset-2': appStore.currentTheme === theme,
            }"
            :style="{
              'background': `linear-gradient(135deg, ${t.accent} 0%, ${t.accentHover} 100%)`,
              '--tw-ring-color': t.accent,
              '--tw-ring-offset-color': t.isDark ? '#18181b' : '#ffffff',
            }"
            :title="t.name"
            @click="selectTheme(theme as Theme)"
          >
            <div :class="t.icon" class="text-xl text-white" />
            <span class="text-sm text-white font-medium">{{ t.name }}</span>
            <div
              v-if="appStore.currentTheme === theme"
              class="i-carbon-checkmark absolute right-1 top-1 text-sm text-white"
            />
          </button>
        </div>

        <div class="mt-3 border-t border-[var(--border-subtle)] pt-3 text-center">
          <button
            class="text-sm text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            @click="appStore.toggleThemePanel()"
          >
            关闭
          </button>
        </div>
      </div>
    </teleport>
  </div>
</template>
