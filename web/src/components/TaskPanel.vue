<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import DailyOverview from '@/components/DailyOverview.vue'
import { useAccountStore } from '@/stores/account'
import { useStatusStore } from '@/stores/status'

const statusStore = useStatusStore()
const accountStore = useAccountStore()
const { status, dailyGifts, realtimeConnected } = storeToRefs(statusStore)
const { currentAccountId, currentAccount } = storeToRefs(accountStore)

const growth = computed(() => dailyGifts.value?.growth || null)

async function refresh() {
  if (currentAccountId.value) {
    const acc = currentAccount.value
    if (!acc)
      return

    if (!realtimeConnected.value) {
      await statusStore.fetchStatus(currentAccountId.value)
    }
    if (acc.running && status.value?.connection?.connected) {
      statusStore.fetchDailyGifts(currentAccountId.value)
    }
  }
}

onMounted(() => {
  refresh()
})

watch(currentAccountId, () => {
  refresh()
})

function formatTaskProgress(task: any) {
  if (!task)
    return '未开始'
  const rawCurrent = task.progress ?? task.current
  const rawTarget = task.totalProgress ?? task.target

  const current = Number.isFinite(rawCurrent)
    ? rawCurrent
    : (rawCurrent ? Number(rawCurrent) || 0 : 0)

  const target = Number.isFinite(rawTarget)
    ? rawTarget
    : (rawTarget ? Number(rawTarget) || 0 : 0)

  if (!current && !target)
    return '未开始'

  if (target && current >= target)
    return '已完成'

  return `进度：${current}/${target}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Daily Overview (Daily Gifts & Tasks) -->
    <DailyOverview :daily-gifts="dailyGifts" />

    <!-- Growth Task -->
    <div class="flex flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <div class="i-carbon-growth text-[var(--status-success)]" />
          <span>成长任务</span>
        </h3>
        <span
          v-if="growth"
          class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
          :class="growth.doneToday
            ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
            : 'bg-[var(--accent-muted)] text-[var(--accent)]'"
        >
          {{ growth.doneToday ? '今日已完成' : `${growth.completedCount}/${growth.totalCount}` }}
        </span>
      </div>

      <div
        v-if="!currentAccountId"
        class="flex flex-col items-center justify-center gap-3 rounded-lg bg-[var(--surface-app)] py-8 text-center text-[var(--text-muted)]"
      >
        <div class="i-carbon-user-offline text-3xl text-[var(--text-muted)]" />
        <div>
          <div class="text-sm text-[var(--text-secondary)] font-medium">
            未登录账号
          </div>
          <div class="mt-1 text-xs text-[var(--text-muted)]">
            请先添加农场账号
          </div>
        </div>
      </div>
      <div
        v-else-if="!status?.connection?.connected"
        class="flex flex-col items-center justify-center gap-3 rounded-lg bg-[var(--surface-app)] py-8 text-center"
      >
        <div class="i-carbon-connection-signal-off text-3xl text-[var(--text-muted)]" />
        <div>
          <div class="text-sm text-[var(--text-secondary)] font-medium">
            账号未登录
          </div>
          <div class="mt-1 text-xs text-[var(--text-muted)]">
            请先运行账号或检查网络连接
          </div>
        </div>
      </div>
      <div
        v-else-if="growth && growth.tasks && growth.tasks.length"
        class="space-y-2"
      >
        <div
          v-for="(task, idx) in growth.tasks"
          :key="idx"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-[var(--text-secondary)]">{{ task.desc || task.name }}</span>
          <span class="text-xs text-[var(--text-muted)]">{{ formatTaskProgress(task) }}</span>
        </div>
      </div>
      <div v-else class="text-center text-sm text-[var(--text-muted)]">
        暂无任务详情
      </div>
    </div>
  </div>
</template>
