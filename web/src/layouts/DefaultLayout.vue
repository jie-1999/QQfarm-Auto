<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Sidebar from '@/components/Sidebar.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const { sidebarOpen } = storeToRefs(appStore)
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden">
    <!-- Mobile Sidebar Overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="appStore.closeSidebar"
      />
    </Transition>

    <Sidebar />

    <main class="relative min-w-0 flex flex-1 flex-col overflow-hidden">
      <!-- Mobile Header -->
      <header class="h-14 flex shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-4 lg:hidden">
        <button
          class="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          @click="appStore.toggleSidebar"
        >
          <div class="i-carbon-menu text-lg" />
        </button>
        <span class="text-sm font-semibold tracking-tight">农场助手</span>
      </header>

      <!-- Main Content -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <div class="flex flex-1 flex-col overflow-y-auto p-4 lg:p-8 md:p-6">
          <RouterView v-slot="{ Component, route }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.path" />
            </Transition>
          </RouterView>
        </div>
      </div>
    </main>
  </div>
</template>
