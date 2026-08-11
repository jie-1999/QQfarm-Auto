<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import LandCard from '@/components/LandCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAccountStore } from '@/stores/account'
import { useFarmStore } from '@/stores/farm'
import { useStatusStore } from '@/stores/status'

const farmStore = useFarmStore()
const accountStore = useAccountStore()
const statusStore = useStatusStore()
const { lands, summary, loading } = storeToRefs(farmStore)
const { currentAccountId, currentAccount } = storeToRefs(accountStore)
const { status, loading: statusLoading, realtimeConnected } = storeToRefs(statusStore)

const operating = ref(false)
const confirmVisible = ref(false)
const confirmConfig = ref({
  title: '',
  message: '',
  opType: '',
})

async function executeOperate() {
  if (!currentAccountId.value || !confirmConfig.value.opType)
    return
  confirmVisible.value = false
  operating.value = true
  try {
    await farmStore.operate(currentAccountId.value, confirmConfig.value.opType)
  }
  finally {
    operating.value = false
  }
}

function handleOperate(opType: string) {
  if (!currentAccountId.value)
    return

  const confirmMap: Record<string, string> = {
    harvest: '确定要收获所有成熟作物吗？',
    clear: '确定要一键除草/除虫吗？',
    plant: '确定要一键种植吗？(根据策略配置)',
    upgrade: '确定要升级所有可升级的土地吗？(消耗金币)',
    all: '确定要一键全收吗？(包含收获、除草、种植等)',
  }

  confirmConfig.value = {
    title: '确认操作',
    message: confirmMap[opType] || '确定执行此操作吗？',
    opType,
  }
  confirmVisible.value = true
}

const operations = [
  { type: 'harvest', label: '收获', icon: 'i-carbon-wheat', variant: 'primary' as const },
  { type: 'clear', label: '除草/虫', icon: 'i-carbon-clean', variant: 'outline' as const },
  { type: 'plant', label: '种植', icon: 'i-carbon-sprout', variant: 'success' as const },
  { type: 'upgrade', label: '升级土地', icon: 'i-carbon-upgrade', variant: 'secondary' as const },
  { type: 'all', label: '一键全收', icon: 'i-carbon-flash', variant: 'danger' as const },
]

async function refresh() {
  if (currentAccountId.value) {
    const acc = currentAccount.value
    if (!acc)
      return

    if (!realtimeConnected.value) {
      await statusStore.fetchStatus(currentAccountId.value)
    }

    if (acc.running && status.value?.connection?.connected) {
      farmStore.fetchLands(currentAccountId.value)
    }
  }
}

watch(currentAccountId, () => {
  refresh()
})

const { pause, resume } = useIntervalFn(() => {
  if (lands.value) {
    lands.value = lands.value.map((l: any) =>
      l.matureInSec > 0 ? { ...l, matureInSec: l.matureInSec - 1 } : l,
    )
  }
}, 1000)

const { pause: pauseRefresh, resume: resumeRefresh } = useIntervalFn(refresh, 60000)

onMounted(() => {
  refresh()
  resume()
  resumeRefresh()
})

onUnmounted(() => {
  pause()
  pauseRefresh()
})

const badgeStyles = {
  harvestable: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  growing: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' },
  empty: { bg: 'rgba(161, 161, 170, 0.12)', text: '#a1a1aa' },
  dead: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
} as const
</script>

<template>
  <div class="space-y-4">
    <div class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)]">
      <!-- Header with Title and Actions -->
      <div class="flex flex-col items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-4 sm:flex-row">
        <h3 class="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <div class="i-carbon-grid text-xl" />
          土地详情
        </h3>
        <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <BaseButton
            v-for="op in operations"
            :key="op.type"
            :variant="op.variant"
            size="sm"
            :disabled="operating"
            @click="handleOperate(op.type)"
          >
            <div :class="op.icon" />
            {{ op.label }}
          </BaseButton>
        </div>
      </div>

      <!-- Summary -->
      <div class="flex flex-wrap gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-app)] p-4 text-sm">
        <div
          class="flex items-center gap-1.5 rounded-full px-3 py-1"
          :style="{ background: badgeStyles.harvestable.bg, color: badgeStyles.harvestable.text }"
        >
          <div class="i-carbon-clean" />
          <span class="font-medium">可收: {{ summary?.harvestable || 0 }}</span>
        </div>
        <div
          class="flex items-center gap-1.5 rounded-full px-3 py-1"
          :style="{ background: badgeStyles.growing.bg, color: badgeStyles.growing.text }"
        >
          <div class="i-carbon-sprout" />
          <span class="font-medium">生长: {{ summary?.growing || 0 }}</span>
        </div>
        <div
          class="flex items-center gap-1.5 rounded-full px-3 py-1"
          :style="{ background: badgeStyles.empty.bg, color: badgeStyles.empty.text }"
        >
          <div class="i-carbon-checkbox" />
          <span class="font-medium">空闲: {{ summary?.empty || 0 }}</span>
        </div>
        <div
          class="flex items-center gap-1.5 rounded-full px-3 py-1"
          :style="{ background: badgeStyles.dead.bg, color: badgeStyles.dead.text }"
        >
          <div class="i-carbon-warning" />
          <span class="font-medium">枯萎: {{ summary?.dead || 0 }}</span>
        </div>
      </div>

      <!-- Grid -->
      <div class="p-4">
        <div v-if="loading || statusLoading" class="flex justify-center py-12">
          <div class="i-svg-spinners-90-ring-with-bg text-4xl text-[var(--accent)]" />
        </div>

        <div v-else-if="!currentAccountId" class="flex flex-col items-center justify-center gap-4 rounded-xl bg-[var(--surface-card)] p-12 text-center">
          <div class="i-carbon-user-offline text-4xl text-[var(--text-muted)]" />
          <div>
            <div class="text-lg text-[var(--text-primary)] font-medium">
              未登录账号
            </div>
            <div class="mt-1 text-sm text-[var(--text-muted)]">
              请先添加农场账号
            </div>
          </div>
        </div>

        <div v-else-if="!status?.connection?.connected" class="flex flex-col items-center justify-center gap-4 rounded-xl bg-[var(--surface-card)] p-12 text-center">
          <div class="i-carbon-connection-signal-off text-4xl text-[var(--text-muted)]" />
          <div>
            <div class="text-lg text-[var(--text-primary)] font-medium">
              账号未登录
            </div>
            <div class="mt-1 text-sm text-[var(--text-muted)]">
              请先运行账号或检查网络连接
            </div>
          </div>
        </div>

        <div v-else-if="!lands || lands.length === 0" class="flex justify-center py-12 text-[var(--text-muted)]">
          暂无土地数据
        </div>

        <div v-else class="grid grid-cols-2 gap-4 lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-3">
          <LandCard
            v-for="land in lands"
            :key="land.id"
            :land="land"
          />
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="confirmVisible"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      @confirm="executeOperate"
      @cancel="confirmVisible = false"
    />
  </div>
</template>
