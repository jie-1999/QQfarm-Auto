<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useAccountStore } from '@/stores/account'
import { usePlantBlacklistStore } from '@/stores/plant-blacklist'
import { useStatusStore } from '@/stores/status'
import { useToastStore } from '@/stores/toast'

const accountStore = useAccountStore()
const plantBlacklistStore = usePlantBlacklistStore()
const toast = useToastStore()
const statusStore = useStatusStore()
const { currentAccountId } = storeToRefs(accountStore)
const { blacklist } = storeToRefs(plantBlacklistStore)
const { status } = storeToRefs(statusStore)

const loading = ref(false)
const list = ref<any[]>([])
const sortKey = ref('exp')
const imageErrors = ref<Record<string | number, boolean>>({})
const searchKeyword = ref('')
const batchLoading = ref(false)

const activeTab = ref('crops')

const strategyLevel = ref(1)

watch(() => status.value?.status?.level, (newLevel) => {
  if (newLevel && Number(newLevel) > 0) {
    strategyLevel.value = Number(newLevel)
  }
}, { immediate: true })

const strategies = [
  {
    key: 'max_exp',
    label: '经验/时',
    metric: 'expPerHour',
    color: 'purple',
    icon: 'i-carbon-growth',
    unit: 'EXP',
    desc: '每小时经验收益最高',
  },
  {
    key: 'max_profit',
    label: '利润/时',
    metric: 'profitPerHour',
    color: 'amber',
    icon: 'i-carbon-currency',
    unit: '金币',
    desc: '每小时净利润最高',
  },
  {
    key: 'max_fert_exp',
    label: '普肥经验/时',
    metric: 'normalFertilizerExpPerHour',
    color: 'blue',
    icon: 'i-carbon-chemistry',
    unit: 'EXP',
    desc: '使用普通化肥后经验最高',
  },
  {
    key: 'max_fert_profit',
    label: '普肥利润/时',
    metric: 'normalFertilizerProfitPerHour',
    color: 'green',
    icon: 'i-carbon-piggy-bank',
    unit: '金币',
    desc: '使用普通化肥后利润最高',
  },
]

function getStrategyBestPlant(strategyKey: string) {
  const strategy = strategies.find(s => s.key === strategyKey)
  if (!strategy)
    return null

  const metric = strategy.metric
  const filtered = list.value.filter((item) => {
    const level = item.level
    if (level === null || level === undefined)
      return true
    return Number(level) <= strategyLevel.value
  })

  if (filtered.length === 0)
    return null

  if (strategyKey === 'level') {
    return [...filtered].sort((a, b) => {
      const av = a.level ?? -1
      const bv = b.level ?? -1
      return bv - av
    })[0]
  }

  return [...filtered].sort((a, b) => {
    const av = Number(a[metric])
    const bv = Number(b[metric])
    if (!Number.isFinite(av) && !Number.isFinite(bv))
      return 0
    if (!Number.isFinite(av))
      return 1
    if (!Number.isFinite(bv))
      return -1
    return bv - av
  })[0]
}

function getStrategyAvailableCount() {
  return list.value.filter((item) => {
    const level = item.level
    if (level === null || level === undefined)
      return true
    return Number(level) <= strategyLevel.value
  }).length
}

function getColorClass(color: string, type: 'bg' | 'text' | 'border' | 'gradient') {
  const colorMap: Record<string, Record<string, string>> = {
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      gradient: 'from-purple-500 to-purple-600',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      gradient: 'from-blue-500 to-blue-600',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      gradient: 'from-amber-500 to-amber-600',
    },
    green: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      gradient: 'from-rose-500 to-rose-600',
    },
  }
  return colorMap[color]?.[type] || ''
}

const filteredList = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return list.value

  return list.value.filter((item: any) => {
    const name = String(item?.name || '').toLowerCase()
    const seedId = String(item?.seedId || '')
    return name.includes(keyword) || seedId.includes(keyword)
  })
})

const sortOptions = [
  { value: 'exp', label: '经验/小时' },
  { value: 'fert', label: '普通肥经验/小时' },
  { value: 'profit', label: '利润/小时' },
  { value: 'fert_profit', label: '普通肥利润/小时' },
  { value: 'level', label: '等级' },
]

const sortOrder = ref<'desc' | 'asc'>('desc')

const sortOrderOptions = [
  { value: 'desc', label: '倒序' },
  { value: 'asc', label: '正序' },
]

const sortedList = computed(() => {
  const metricMap: Record<string, string> = {
    exp: 'expPerHour',
    fert: 'normalFertilizerExpPerHour',
    profit: 'profitPerHour',
    fert_profit: 'normalFertilizerProfitPerHour',
    level: 'level',
  }
  const metric = metricMap[sortKey.value]
  if (!metric)
    return filteredList.value

  const sorted = [...filteredList.value].sort((a, b) => {
    const av = Number(a[metric])
    const bv = Number(b[metric])
    if (!Number.isFinite(av) && !Number.isFinite(bv))
      return 0
    if (!Number.isFinite(av))
      return 1
    if (!Number.isFinite(bv))
      return -1
    return sortOrder.value === 'desc' ? bv - av : av - bv
  })
  return sorted
})

async function loadAnalytics() {
  if (!currentAccountId.value)
    return
  loading.value = true
  try {
    const res = await api.get(`/api/analytics`, {
      params: { sort: sortKey.value },
      headers: { 'x-account-id': currentAccountId.value },
    })
    const data = res.data.data
    if (Array.isArray(data)) {
      list.value = data
    }
    else {
      list.value = []
    }
  }
  catch (e) {
    console.error(e)
    list.value = []
  }
  finally {
    loading.value = false
  }
}

async function handleToggleBlacklist(item: any) {
  await plantBlacklistStore.toggleBlacklist(item.seedId)
  if (plantBlacklistStore.isBlacklisted(item.seedId)) {
    toast.success(`${item.name} 已加入偷菜黑名单`)
  }
  else {
    toast.success(`${item.name} 已移出偷菜黑名单`)
  }
}

async function handleAddAllToBlacklist() {
  if (batchLoading.value)
    return
  batchLoading.value = true
  try {
    const allSeedIds = list.value.map((item: any) => item.seedId)
    await plantBlacklistStore.addAllToBlacklist(allSeedIds)
    toast.success(`已将 ${allSeedIds.length} 种作物加入偷菜黑名单`)
  }
  finally {
    batchLoading.value = false
  }
}

async function handleClearBlacklist() {
  if (batchLoading.value)
    return
  batchLoading.value = true
  try {
    await plantBlacklistStore.clearBlacklist()
    toast.success('已清空偷菜黑名单')
  }
  finally {
    batchLoading.value = false
  }
}

onMounted(() => {
  loadAnalytics()
  plantBlacklistStore.fetchBlacklist()
})

watch([currentAccountId, sortKey], () => {
  loadAnalytics()
})

function formatLv(level: any) {
  if (level === null || level === undefined || level === '' || Number(level) < 0)
    return '未知'
  return String(level)
}

function getSeedNameById(seedId: number) {
  const item = list.value.find((i: any) => i.seedId === seedId)
  return item?.name || `蔬菜ID:${seedId}`
}

function formatGrowTime(seconds: any) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0)
    return '0秒'
  if (s < 60)
    return `${s}秒`
  if (s < 3600) {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`
  }
  const hours = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-1 border-b border-[var(--border-subtle)]">
      <button
        class="relative px-4 py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === 'crops' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
        @click="activeTab = 'crops'"
      >
        <div class="flex items-center gap-2">
          <div class="i-carbon-sprout h-4 w-4" />
          <span>全部作物</span>
          <span v-if="list.length" class="ml-0.5 rounded-full bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--accent)] font-medium">
            {{ list.length }}
          </span>
        </div>
        <div v-if="activeTab === 'crops'" class="absolute inset-x-0 h-0.5 bg-[var(--accent)] -bottom-px" />
      </button>
      <button
        class="relative px-4 py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === 'blacklist' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
        @click="activeTab = 'blacklist'"
      >
        <div class="flex items-center gap-2">
          <div class="i-carbon-subtract-alt h-4 w-4" />
          <span>黑名单</span>
          <span v-if="blacklist.length" class="ml-0.5 rounded-full bg-[var(--status-error)]/10 px-1.5 py-0.5 text-[10px] text-[var(--status-error)] font-medium">
            {{ blacklist.length }}
          </span>
        </div>
        <div v-if="activeTab === 'blacklist'" class="absolute inset-x-0 h-0.5 bg-[var(--accent)] -bottom-px" />
      </button>
      <button
        class="relative px-4 py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === 'strategy' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
        @click="activeTab = 'strategy'"
      >
        <div class="flex items-center gap-2">
          <div class="i-carbon-chart-line h-4 w-4" />
          <span>种植策略</span>
        </div>
        <div v-if="activeTab === 'strategy'" class="absolute inset-x-0 h-0.5 bg-[var(--accent)] -bottom-px" />
      </button>
    </div>

    <div>
      <div v-if="loading" class="flex justify-center py-12">
        <div class="i-svg-spinners-90-ring-with-bg text-4xl text-[var(--accent)]" />
      </div>

      <div v-else-if="!currentAccountId" class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-8 text-center text-[var(--text-muted)]">
        请选择账号后查看数据分析
      </div>

      <div v-else-if="list.length === 0" class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-8 text-center text-[var(--text-muted)]">
        暂无数据
      </div>

      <div v-else-if="activeTab === 'crops'" class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="i-carbon-sprout text-xl text-[var(--status-success)]" />
            <div>
              <h3 class="text-sm text-[var(--text-primary)] font-semibold tracking-tight">
                全部作物信息
              </h3>
              <p class="text-xs text-[var(--text-muted)]">
                共 {{ list.length }} 种作物
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <div class="i-carbon-search absolute left-3 top-1/2 text-[var(--text-muted)] -translate-y-1/2" />
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索作物..."
                class="w-full border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] sm:w-64 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              >
            </div>
            <div v-if="list.length" class="text-sm text-[var(--text-muted)]">
              {{ sortedList.length }}/{{ list.length }}
            </div>
            <label class="whitespace-nowrap text-sm text-[var(--text-secondary)] font-medium">排序:</label>
            <BaseSelect
              v-model="sortKey"
              :options="sortOptions"
              class="w-40"
            />
            <BaseSelect
              v-model="sortOrder"
              :options="sortOrderOptions"
              class="w-20"
            />
          </div>
        </div>

        <div class="p-4 space-y-4">
          <div class="block sm:hidden space-y-4">
            <div v-for="(item, idx) in sortedList" :key="idx" class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-4">
              <div class="mb-3 flex items-start gap-3">
                <div class="relative h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-hover)]">
                  <img
                    v-if="item.image && !imageErrors[item.seedId]"
                    :src="item.image"
                    class="h-10 w-10 object-contain"
                    loading="lazy"
                    @error="imageErrors[item.seedId] = true"
                  >
                  <div v-else class="i-carbon-sprout text-2xl text-[var(--text-muted)]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <div class="truncate text-sm text-[var(--text-primary)] font-semibold">
                      {{ item.name }}
                      <span v-if="blacklist.includes(item.seedId)" class="ml-1 rounded bg-[var(--status-error)]/10 px-1.5 py-0.5 text-[10px] text-[var(--status-error)] font-medium">黑名单</span>
                    </div>
                    <div class="text-xs text-[var(--text-muted)]">
                      ID:{{ item.seedId }}
                    </div>
                  </div>
                  <div class="mt-1 flex items-center gap-2">
                    <span class="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] font-medium">Lv{{ formatLv(item.level) }}</span>
                    <span class="text-[10px] text-[var(--text-muted)]">{{ item.seasons }}季</span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div class="flex flex-col">
                  <span class="text-xs text-[var(--text-muted)]">时间</span>
                  <span class="text-sm text-[var(--text-secondary)] font-medium">{{ formatGrowTime(item.growTime) }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-[var(--text-muted)]">经验/时</span>
                  <span class="text-sm text-purple-400 font-semibold">{{ item.expPerHour }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-[var(--text-muted)]">净利润/时</span>
                  <span class="text-sm text-amber-400 font-semibold">{{ item.profitPerHour ?? '-' }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-[var(--text-muted)]">普肥经验/时</span>
                  <span class="text-sm text-blue-400 font-semibold">{{ item.normalFertilizerExpPerHour ?? '-' }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs text-[var(--text-muted)]">普肥利润/时</span>
                  <span class="text-sm text-emerald-400 font-semibold">{{ item.normalFertilizerProfitPerHour ?? '-' }}</span>
                </div>
              </div>

              <div class="mt-3">
                <button
                  class="w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  :class="blacklist.includes(item.seedId) ? 'bg-[var(--status-error)]/10 text-[var(--status-error)] hover:bg-[var(--status-error)]/20' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
                  @click="handleToggleBlacklist(item)"
                >
                  {{ blacklist.includes(item.seedId) ? '移出偷菜黑名单' : '加入偷菜黑名单' }}
                </button>
              </div>
            </div>
          </div>

          <div class="hidden overflow-hidden border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] sm:block">
            <div class="overflow-x-auto">
              <table class="w-full whitespace-nowrap text-left text-sm">
                <thead class="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)] text-xs text-[var(--text-muted)] uppercase">
                  <tr>
                    <th class="sticky left-0 z-10 bg-[var(--surface-hover)] px-4 py-3 font-medium">
                      作物 (Lv)
                    </th>
                    <th class="px-4 py-3 font-medium">
                      时间
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      经验/时
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      普通肥经验/时
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      净利润/时
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      普通肥净利润/时
                    </th>
                    <th class="px-4 py-3 text-center font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in sortedList" :key="idx" class="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-hover)]">
                    <td class="sticky left-0 bg-[var(--surface-card)] px-4 py-2 transition-colors group-hover:bg-[var(--surface-hover)]">
                      <div class="flex items-center gap-3">
                        <div class="relative h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-hover)]">
                          <img
                            v-if="item.image && !imageErrors[item.seedId]"
                            :src="item.image"
                            class="h-8 w-8 object-contain"
                            loading="lazy"
                            @error="imageErrors[item.seedId] = true"
                          >
                          <div v-else class="i-carbon-sprout text-xl text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <div class="text-[var(--text-primary)] font-semibold">
                            {{ item.name }}
                            <span v-if="blacklist.includes(item.seedId)" class="ml-1 rounded bg-[var(--status-error)]/10 px-1.5 py-0.5 text-[10px] text-[var(--status-error)] font-medium">黑名单</span>
                          </div>
                          <div class="mt-0.5 flex items-center gap-1.5">
                            <span class="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] font-medium">Lv{{ formatLv(item.level) }}</span>
                            <span class="text-[10px] text-[var(--text-muted)]">ID:{{ item.seedId }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-[var(--text-secondary)]">
                      <div class="font-medium">
                        {{ formatGrowTime(item.growTime) }}
                      </div>
                      <div class="text-xs text-[var(--text-muted)]">
                        {{ item.seasons }}季
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <div class="text-purple-400 font-semibold">
                        {{ item.expPerHour }}
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <div class="text-blue-400 font-semibold">
                        {{ item.normalFertilizerExpPerHour ?? '-' }}
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <div class="text-amber-400 font-semibold">
                        {{ item.profitPerHour ?? '-' }}
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">
                      <div class="text-emerald-400 font-semibold">
                        {{ item.normalFertilizerProfitPerHour ?? '-' }}
                      </div>
                    </td>
                    <td class="px-4 py-2 text-center">
                      <button
                        class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        :class="blacklist.includes(item.seedId) ? 'bg-[var(--status-error)]/10 text-[var(--status-error)] hover:bg-[var(--status-error)]/20' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
                        @click="handleToggleBlacklist(item)"
                      >
                        {{ blacklist.includes(item.seedId) ? '移出黑名单' : '加入黑名单' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'blacklist'" class="overflow-hidden border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)]">
        <div class="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)] p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="i-carbon-subtract-alt text-xl text-[var(--status-error)]" />
              <div>
                <h3 class="text-sm text-[var(--text-primary)] font-semibold tracking-tight">
                  偷菜黑名单
                </h3>
                <p class="text-xs text-[var(--text-muted)]">
                  加入黑名单的蔬菜在自动偷菜时会被跳过，但不会影响自己种植
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1.5 rounded-lg bg-[var(--status-warning)]/10 px-3 py-2 text-sm text-[var(--status-warning)] font-medium transition-colors hover:bg-[var(--status-warning)]/20 disabled:opacity-50"
                :disabled="batchLoading || list.length === 0"
                @click="handleAddAllToBlacklist"
              >
                <div v-if="batchLoading" class="i-svg-spinners-90-ring-with-bg" />
                <div v-else class="i-carbon-add" />
                一键全部加入黑名单
              </button>
              <button
                v-if="blacklist.length > 0"
                class="flex items-center gap-1.5 rounded-lg bg-[var(--status-error)]/10 px-3 py-2 text-sm text-[var(--status-error)] font-medium transition-colors hover:bg-[var(--status-error)]/20 disabled:opacity-50"
                :disabled="batchLoading"
                @click="handleClearBlacklist"
              >
                <div class="i-carbon-trash-can" />
                清空黑名单
              </button>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div v-if="blacklist.length === 0" class="py-8 text-center text-[var(--text-muted)]">
            暂无黑名单蔬菜
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="seedId in blacklist"
              :key="seedId"
              class="flex items-center justify-between rounded-lg bg-[var(--surface-hover)] px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="relative h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-card)]">
                  <img
                    v-if="list.find(i => i.seedId === seedId)?.image"
                    :src="list.find(i => i.seedId === seedId)?.image"
                    class="h-8 w-8 object-contain"
                    loading="lazy"
                  >
                  <div v-else class="i-carbon-sprout text-xl text-[var(--text-muted)]" />
                </div>
                <div>
                  <div class="text-sm text-[var(--text-primary)] font-medium">
                    {{ getSeedNameById(seedId) }}
                  </div>
                  <div class="text-xs text-[var(--text-muted)]">
                    ID: {{ seedId }}
                  </div>
                </div>
              </div>
              <button
                class="rounded-lg bg-[var(--status-error)]/10 px-3 py-1.5 text-sm text-[var(--status-error)] font-medium transition-colors hover:bg-[var(--status-error)]/20"
                @click="plantBlacklistStore.removeFromBlacklist(seedId)"
              >
                移出黑名单
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'strategy'" class="overflow-hidden border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)]">
        <div class="border-b border-[var(--border-subtle)] bg-[var(--surface-hover)] p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="i-carbon-calculation text-xl text-[var(--accent)]" />
              <div>
                <h3 class="text-sm text-[var(--text-primary)] font-semibold tracking-tight">
                  策略推荐
                </h3>
                <p class="text-xs text-[var(--text-muted)]">
                  根据等级推荐最优种植策略
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--text-muted)]">参考等级:</span>
              <input
                v-model.number="strategyLevel"
                type="number"
                min="1"
                max="100"
                class="w-16 border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 py-1.5 text-center text-sm text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              >
            </div>
          </div>
        </div>

        <div class="p-4">
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-4 sm:grid-cols-2">
            <div
              v-for="strategy in strategies"
              :key="strategy.key"
              class="overflow-hidden border rounded-xl bg-[var(--surface-card)] transition-shadow hover:shadow-md"
              :class="getColorClass(strategy.color, 'border')"
            >
              <div class="p-4">
                <div class="mb-3 flex items-center gap-2.5">
                  <div
                    class="h-8 w-8 flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white"
                    :class="getColorClass(strategy.color, 'gradient')"
                  >
                    <div class="text-sm" :class="strategy.icon" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold" :class="getColorClass(strategy.color, 'text')">
                      {{ strategy.label }}
                    </div>
                    <div class="text-[10px] text-[var(--text-muted)]">
                      {{ strategy.desc }}
                    </div>
                  </div>
                </div>

                <div v-if="getStrategyBestPlant(strategy.key)" class="space-y-3">
                  <div class="flex items-center gap-2.5">
                    <div class="h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden border rounded-lg bg-[var(--surface-hover)]" :class="getColorClass(strategy.color, 'border')">
                      <img
                        v-if="getStrategyBestPlant(strategy.key)?.image && !imageErrors[getStrategyBestPlant(strategy.key)?.seedId]"
                        :src="getStrategyBestPlant(strategy.key)?.image"
                        class="h-8 w-8 object-contain"
                        loading="lazy"
                        @error="imageErrors[getStrategyBestPlant(strategy.key)?.seedId] = true"
                      >
                      <div v-else class="i-carbon-sprout text-lg text-[var(--text-muted)]" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm text-[var(--text-primary)] font-medium">
                        {{ getStrategyBestPlant(strategy.key)?.name }}
                      </div>
                      <div class="text-xs text-[var(--text-muted)]">
                        Lv{{ formatLv(getStrategyBestPlant(strategy.key)?.level) }}
                      </div>
                    </div>
                  </div>
                  <div class="rounded-lg bg-[var(--surface-hover)] px-3 py-2">
                    <div class="flex items-baseline justify-between">
                      <span class="text-xs text-[var(--text-muted)]">{{ strategy.unit }}/时</span>
                      <span class="text-base font-bold font-mono" :class="getColorClass(strategy.color, 'text')">
                        {{ getStrategyBestPlant(strategy.key)?.[strategy.metric] }}
                      </span>
                    </div>
                  </div>
                </div>
                <div v-else class="py-4 text-center text-xs text-[var(--text-muted)]">
                  暂无可种植作物
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <div class="i-carbon-information" />
            <span>可种植 {{ getStrategyAvailableCount() }}/{{ list.length }} 种作物 &middot; 策略计算与设置页面种植策略一致</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
