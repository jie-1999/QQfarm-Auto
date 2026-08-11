<script setup lang="ts">
import type { Theme } from '@/stores/app'
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/ToastContainer.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const savedTheme = localStorage.getItem('ui_theme') as Theme
if (savedTheme && appStore.themes[savedTheme]) {
  appStore.applyTheme(savedTheme)
}

onMounted(() => {
  appStore.fetchTheme()
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden" :style="{ background: 'var(--surface-app)', color: 'var(--text-primary)' }">
    <RouterView />
    <ToastContainer />
  </div>
</template>
