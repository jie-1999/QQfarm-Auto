<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useAccountStore } from '@/stores/account'
import { useBagStore } from '@/stores/bag'
import { useStatusStore } from '@/stores/status'
import { useToastStore } from '@/stores/toast'

const statusStore = useStatusStore()
const accountStore = useAccountStore()
const bagStore = useBagStore()
const toastStore = useToastStore()
const {
  status,
  logs: statusLogs,
  accountLogs: statusAccountLogs,
  realtimeConnected,
} = storeToRefs(statusStore)
const { currentAccountId, currentAccount } = storeToRefs(accountStore)
const { dashboardItems } = storeToRefs(bagStore)
const logContainer = ref<HTMLElement | null>(null)
const autoScroll = ref(true)
const lastBagFetchAt = ref(0)
const clearingLogs = ref(false)

const allLogs = computed(() => {
  const sLogs = statusLogs.value || []
  const aLogs = (statusAccountLogs.value || []).map((l: any) => ({
    ts: new Date(l.time).getTime(),
    time: l.time,
    tag: l.action === 'Error' ? '错误' : '系统',
    msg: l.reason ? `${l.msg} (${l.reason})` : l.msg,
    isAccountLog: true,
  }))

  return [...sLogs, ...aLogs].sort((a: any, b: any) => a.ts - b.ts).filter((l: any) => !l.isAccountLog)
})

const filter = reactive({
  module: '',
  event: '',
  keyword: '',
  isWarn: '',
})

const hasActiveLogFilter = computed(() =>
  !!(filter.module || filter.event || filter.keyword || filter.isWarn),
)

const modules = [
  { label: '所有模块', value: '' },
  { label: '农场', value: 'farm' },
  { label: '好友', value: 'friend' },
  { label: '仓库', value: 'warehouse' },
  { label: '任务', value: 'task' },
  { label: '系统', value: 'system' },
]

const events = [
  { label: '所有事件', value: '' },
  { label: '农场巡查', value: 'farm_cycle' },
  { label: '收获作物', value: 'harvest_crop' },
  { label: '清理枯株', value: 'remove_plant' },
  { label: '种植种子', value: 'plant_seed' },
  { label: '施加化肥', value: 'fertilize' },
  { label: '土地推送', value: 'lands_notify' },
  { label: '选择种子', value: 'seed_pick' },
  { label: '购买种子', value: 'seed_buy' },
  { label: '购买化肥', value: 'fertilizer_buy' },
  { label: '开启礼包', value: 'fertilizer_gift_open' },
  { label: '获取任务', value: 'task_scan' },
  { label: '完成任务', value: 'task_claim' },
  { label: '免费礼包', value: 'mall_free_gifts' },
  { label: '分享奖励', value: 'daily_share' },
  { label: '会员礼包', value: 'vip_daily_gift' },
  { label: '月卡礼包', value: 'month_card_gift' },
  { label: '图鉴奖励', value: 'illustrated_rewards' },
  { label: '邮箱领取', value: 'email_rewards' },
  { label: '出售成功', value: 'sell_success' },
  { label: '土地升级', value: 'upgrade_land' },
  { label: '土地解锁', value: 'unlock_land' },
  { label: '好友巡查', value: 'friend_cycle' },
  { label: '访问好友', value: 'visit_friend' },
]

const eventLabelMap: Record<string, string> = Object.fromEntries(
  events.filter(e => e.value).map(e => [e.value, e.label]),
)

function getEventLabel(event: string) {
  return eventLabelMap[event] || event
}

const logs = [
  { label: '所有等级', value: '' },
  { label: '普通', value: 'info' },
  { label: '警告', value: 'warn' },
]

const displayName = computed(() => {
  const account = accountStore.currentAccount

  // Try to use nickname from status (game server)
  const gameName = status.value?.status?.name
  if (gameName) {
    // 如果有备注，显示为"昵称（备注）"
    if (account?.name) {
      return `${gameName} (${account.name})`
    }
    return gameName
  }

  // Check login status
  if (!status.value?.connection?.connected) {
    if (account) {
      // 如果有备注和昵称，显示为"昵称（备注）"
      if (account.name && account.nick) {
        return `${account.nick} (${account.name})`
      }
      return account.name || account.nick || '未登录'
    }
    return '未登录'
  }

  // Fallback to account name (usually ID) or '未命名'
  if (account) {
    // 如果有备注和昵称，显示为"昵称（备注）"
    if (account.name && account.nick) {
      return `${account.nick} (${account.name})`
    }
    return account.name || account.nick || '未命名'
  }
  return '未命名'
})

// Exp Rate & Time to Level
const expRate = computed(() => {
  const gain = status.value?.sessionExpGained || 0
  const uptime = status.value?.uptime || 0
  if (!uptime)
    return '0/时'
  const hours = uptime / 3600
  const rate = hours > 0 ? (gain / hours) : 0
  return `${Math.floor(rate)}/时`
})

const timeToLevel = computed(() => {
  const gain = status.value?.sessionExpGained || 0
  const uptime = status.value?.uptime || 0
  const current = status.value?.levelProgress?.current || 0
  const needed = status.value?.levelProgress?.needed || 0

  if (!needed || !uptime || gain <= 0)
    return ''

  const hours = uptime / 3600
  const ratePerHour = hours > 0 ? (gain / hours) : 0
  if (ratePerHour <= 0)
    return ''

  const expNeeded = needed - current
  const minsToLevel = expNeeded / (ratePerHour / 60)

  if (minsToLevel < 60)
    return `约 ${Math.ceil(minsToLevel)} 分钟后升级`
  return `约 ${(minsToLevel / 60).toFixed(1)} 小时后升级`
})

// Fertilizer & Collection
const fertilizerNormal = computed(() => dashboardItems.value.find((i: any) => Number(i.id) === 1011))
const fertilizerOrganic = computed(() => dashboardItems.value.find((i: any) => Number(i.id) === 1012))
const collectionNormal = computed(() => dashboardItems.value.find((i: any) => Number(i.id) === 3001))
const collectionRare = computed(() => dashboardItems.value.find((i: any) => Number(i.id) === 3002))

function formatBucketTime(item: any) {
  if (!item)
    return '0.0h'
  if (item.hoursText)
    return item.hoursText.replace('小时', 'h')
  const count = Number(item.count || 0)
  return `${(count / 3600).toFixed(1)}h`
}

// Next Check Countdown
const nextFarmCheck = ref('--:--:--')
const nextHelpCheck = ref('--:--:--')
const nextStealCheck = ref('--:--:--')
const localUptime = ref(0)
let localNextFarmRemainSec = 0
let localNextHelpRemainSec = 0
let localNextStealRemainSec = 0

function updateCountdowns() {
  // Update uptime
  if (!status.value?.connection?.connected) {
    nextFarmCheck.value = '账号未登录'
    nextHelpCheck.value = '账号未登录'
    nextStealCheck.value = '账号未登录'
  }
  else {
    localUptime.value++
    if (localNextFarmRemainSec > 0) {
      localNextFarmRemainSec--
      nextFarmCheck.value = formatDuration(localNextFarmRemainSec)
    }
    else {
      nextFarmCheck.value = '巡查中...'
    }

    if (localNextHelpRemainSec > 0) {
      localNextHelpRemainSec--
      nextHelpCheck.value = formatDuration(localNextHelpRemainSec)
    }
    else {
      nextHelpCheck.value = '巡查中...'
    }

    if (localNextStealRemainSec > 0) {
      localNextStealRemainSec--
      nextStealCheck.value = formatDuration(localNextStealRemainSec)
    }
    else {
      nextStealCheck.value = '巡查中...'
    }
  }
}

watch(status, (newVal) => {
  if (newVal?.nextChecks) {
    localNextFarmRemainSec = newVal.nextChecks.farmRemainSec || 0
    localNextHelpRemainSec = newVal.nextChecks.helpRemainSec || 0
    localNextStealRemainSec = newVal.nextChecks.stealRemainSec || 0
    updateCountdowns()
  }
  if (newVal?.uptime !== undefined) {
    localUptime.value = newVal.uptime
  }
}, { deep: true })

function formatDuration(seconds: number) {
  if (seconds <= 0)
    return '00:00:00'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (d > 0)
    return `${d}天 ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function getLogTagClass(tag: string) {
  if (tag === '错误')
    return 'bg-[var(--status-error)]/10 text-[var(--status-error)]'
  if (tag === '系统')
    return 'bg-[var(--accent)]/10 text-[var(--accent)]'
  if (tag === '警告')
    return 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'
  return 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
}

function getLogMsgClass(tag: string) {
  if (tag === '错误')
    return 'text-[var(--status-error)]'
  return 'text-[var(--text-secondary)]'
}

function formatLogTime(timeStr: string) {
  // 2024/5/20 12:34:56 -> 12:34:56
  if (!timeStr)
    return ''
  const parts = timeStr.split(' ')
  return parts.length > 1 ? parts[1] : timeStr
}

const OP_META: Record<string, { label: string, icon: string, color: string }> = {
  harvest: { label: '收获', icon: 'i-carbon-crop-growth', color: 'text-[var(--status-success)]' },
  water: { label: '浇水', icon: 'i-carbon-rain-drop', color: 'text-[var(--status-info)]' },
  weed: { label: '除草', icon: 'i-carbon-cut-out', color: 'text-[var(--status-warning)]' },
  bug: { label: '除虫', icon: 'i-carbon-warning-alt', color: 'text-[var(--status-error)]' },
  fertilize: { label: '施肥', icon: 'i-carbon-chemistry', color: 'text-[var(--status-success)]' },
  plant: { label: '种植', icon: 'i-carbon-tree', color: 'text-[var(--status-success)]' },
  steal: { label: '偷菜', icon: 'i-carbon-run', color: 'text-[var(--status-warning)]' },
  helpWater: { label: '帮浇水', icon: 'i-carbon-rain-drop', color: 'text-[var(--status-info)]' },
  helpWeed: { label: '帮除草', icon: 'i-carbon-cut-out', color: 'text-[var(--status-warning)]' },
  helpBug: { label: '帮除虫', icon: 'i-carbon-warning-alt', color: 'text-[var(--status-error)]' },
  taskClaim: { label: '任务', icon: 'i-carbon-task-complete', color: 'text-[var(--accent)]' },
  sell: { label: '出售', icon: 'i-carbon-shopping-cart', color: 'text-[var(--status-error)]' },
}

const filteredOperations = computed(() => {
  const ops = status.value?.operations || {}
  const result: Record<string, number> = {}
  for (const key of Object.keys(ops)) {
    if (key !== 'upgrade' && key !== 'levelUp') {
      result[key] = ops[key]
    }
  }
  return result
})

function getOpName(key: string | number) {
  return OP_META[String(key)]?.label || String(key)
}

function getOpIcon(key: string | number) {
  return OP_META[String(key)]?.icon || 'i-carbon-circle-dash'
}

function getOpColor(key: string | number) {
  return OP_META[String(key)]?.color || 'text-[var(--text-muted)]'
}

function getExpPercent(p: any) {
  if (!p || !p.needed)
    return 0
  return Math.min(100, Math.max(0, (p.current / p.needed) * 100))
}

async function refreshBag(force = false) {
  if (!currentAccountId.value)
    return
  if (!currentAccount.value?.running)
    return
  if (!status.value?.connection?.connected)
    return

  const now = Date.now()
  if (!force && now - lastBagFetchAt.value < 2500)
    return
  lastBagFetchAt.value = now
  await bagStore.fetchBag(currentAccountId.value)
}

async function refresh(forceReloadLogs = false) {
  if (currentAccountId.value) {
    const acc = currentAccount.value
    if (!acc)
      return

    if (!realtimeConnected.value) {
      await statusStore.fetchStatus(currentAccountId.value)
      await statusStore.fetchAccountLogs()
    }

    if (forceReloadLogs || hasActiveLogFilter.value || !realtimeConnected.value) {
      await statusStore.fetchLogs(currentAccountId.value, {
        module: filter.module || undefined,
        event: filter.event || undefined,
        keyword: filter.keyword || undefined,
        isWarn: filter.isWarn === 'warn' ? true : filter.isWarn === 'info' ? false : undefined,
      })
    }

    await refreshBag()
  }
}

function onLogFilterChange() {
  refresh(true)
}

function onLogSearchTrigger() {
  refresh(true)
}

watch(currentAccountId, async () => {
  await refresh()
  scrollToBottom()
})

watch(() => status.value?.connection?.connected, (connected) => {
  if (connected)
    refreshBag(true)
})

watch(() => JSON.stringify(status.value?.operations || {}), (next, prev) => {
  if (!realtimeConnected.value || next === prev)
    return
  refreshBag()
})

watch(hasActiveLogFilter, (enabled) => {
  statusStore.setRealtimeLogsEnabled(!enabled)
  refresh()
})

function onLogScroll(e: Event) {
  const el = e.target as HTMLElement
  if (!el)
    return
  const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  autoScroll.value = isNearBottom
}

async function clearLogs() {
  if (!currentAccountId.value)
    return
  clearingLogs.value = true
  try {
    const { data } = await api.delete('/api/logs')
    if (data?.ok) {
      toastStore.success('日志已清空')
      await refresh(true)
    }
    else {
      toastStore.error(`清空失败: ${data?.error || '未知错误'}`)
    }
  }
  catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || '请求失败'
    toastStore.error(`清空失败: ${msg}`)
  }
  finally {
    clearingLogs.value = false
  }
}

// Auto scroll logs
watch(allLogs, () => {
  nextTick(() => {
    if (logContainer.value && autoScroll.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}, { deep: true })

function scrollToBottom() {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

onMounted(async () => {
  statusStore.setRealtimeLogsEnabled(!hasActiveLogFilter.value)
  await refresh()
  scrollToBottom()
})

// Auto refresh fallback every 10s
useIntervalFn(refresh, 10000)
// Countdown timer (every 1s)
useIntervalFn(updateCountdowns, 1000)
</script>

<template>
  <div class="mx-auto max-w-7xl flex flex-col gap-6 p-4 pt-6 md:p-6">
    <!-- Status Cards -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:grid-cols-2">
      <!-- Account & Exp -->
      <div class="flex flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
        <div class="mb-3 flex items-start justify-between">
          <div class="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <div class="i-fas-user-circle" />
            账号
          </div>
          <span class="inline-flex rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--accent)] font-medium">
            Lv.{{ status?.status?.level || 0 }}
          </span>
        </div>
        <div class="mb-1 truncate text-lg font-semibold tracking-tight" :title="displayName">
          {{ displayName }}
        </div>

        <!-- Level Progress -->
        <div class="mt-auto">
          <div class="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div class="flex items-center gap-1">
              <div class="i-fas-bolt text-[var(--accent)]" />
              <span>EXP</span>
            </div>
            <span class="font-mono">{{ status?.levelProgress?.current || 0 }} / {{ status?.levelProgress?.needed || '?' }}</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
            <div
              class="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              :style="{ width: `${getExpPercent(status?.levelProgress)}%` }"
            />
          </div>
          <div class="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
            <span>效率: <span class="font-mono">{{ expRate }}</span></span>
            <span>{{ timeToLevel }}</span>
          </div>
        </div>
      </div>

      <!-- Assets & Status -->
      <div class="flex flex-col justify-between border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
        <div class="flex justify-between">
          <div>
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <div class="i-fas-coins text-[var(--status-warning)]" />
              金币
            </div>
            <div class="text-2xl text-[var(--status-warning)] font-bold font-mono">
              {{ status?.status?.gold || 0 }}
            </div>
            <div
              v-if="(status?.sessionGoldGained || 0) !== 0"
              class="text-[10px] font-mono"
              :class="(status?.sessionGoldGained || 0) > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'"
            >
              {{ (status?.sessionGoldGained || 0) > 0 ? '+' : '' }}{{ status?.sessionGoldGained || 0 }}
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center justify-end gap-1.5 text-xs text-[var(--text-muted)]">
              <div class="i-fas-ticket-alt text-[var(--status-success)]" />
              点券
            </div>
            <div class="text-2xl text-[var(--status-success)] font-bold font-mono">
              {{ status?.status?.coupon || 0 }}
            </div>
            <div
              v-if="(status?.sessionCouponGained || 0) !== 0"
              class="text-[10px] font-mono"
              :class="(status?.sessionCouponGained || 0) > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'"
            >
              {{ (status?.sessionCouponGained || 0) > 0 ? '+' : '' }}{{ status?.sessionCouponGained || 0 }}
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center justify-end gap-1.5 text-xs text-[var(--text-muted)]">
              <div class="i-carbon-circle text-[var(--status-warning)]" />
              金豆豆
            </div>
            <div class="text-2xl text-[var(--status-warning)] font-bold font-mono">
              {{ status?.status?.goldBean || 0 }}
            </div>
          </div>
        </div>
        <div class="mt-4 border-t border-[var(--border-subtle)] pt-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full" :class="status?.connection?.connected ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'" />
              <span class="text-xs text-[var(--text-secondary)] font-medium">{{ status?.connection?.connected ? '在线' : '离线' }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <div class="i-fas-clock text-[var(--accent)]" />
              <span class="font-mono">{{ formatDuration(localUptime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Items (Fertilizer & Collection) -->
      <div class="flex flex-col justify-between border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
        <div class="mb-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <div class="i-fas-flask text-[var(--status-success)]" />
          化肥容器
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <div class="i-fas-flask text-[var(--status-success)]" />
              普通
            </div>
            <div class="font-bold font-mono">
              {{ formatBucketTime(fertilizerNormal) }}
            </div>
          </div>
          <div>
            <div class="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <div class="i-fas-vial text-[var(--status-success)]" />
              有机
            </div>
            <div class="font-bold font-mono">
              {{ formatBucketTime(fertilizerOrganic) }}
            </div>
          </div>
        </div>
        <div class="my-3 border-t border-[var(--border-subtle)]" />
        <div class="mb-2 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <div class="i-fas-star text-[var(--status-success)]" />
          收藏点
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <div class="i-fas-bookmark text-[var(--status-success)]" />
              普通
            </div>
            <div class="font-bold font-mono">
              {{ collectionNormal?.count || 0 }}
            </div>
          </div>
          <div>
            <div class="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <div class="i-fas-gem text-[var(--status-success)]" />
              典藏
            </div>
            <div class="font-bold font-mono">
              {{ collectionRare?.count || 0 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 flex-col items-stretch gap-6 md:flex-row">
      <!-- Logs (Left Column) -->
      <div class="flex flex-1 flex-col gap-6 md:w-3/4">
        <div class="flex flex-1 flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5 md:overflow-hidden">
          <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <div class="i-carbon-document" />
              <span>运行日志</span>
            </h3>

            <div class="flex flex-wrap items-center gap-2 text-sm">
              <BaseSelect
                v-model="filter.module"
                :options="modules"
                class="w-32"
                @change="onLogFilterChange"
              />

              <BaseSelect
                v-model="filter.event"
                :options="events"
                class="w-32"
                @change="onLogFilterChange"
              />

              <BaseSelect
                v-model="filter.isWarn"
                :options="logs"
                class="w-32"
                @change="onLogFilterChange"
              />

              <BaseInput
                v-model="filter.keyword"
                placeholder="关键词..."
                class="w-32"
                clearable
                @keyup.enter="onLogSearchTrigger"
                @clear="onLogSearchTrigger"
              />

              <BaseButton
                variant="primary"
                size="sm"
                @click="onLogSearchTrigger"
              >
                <div class="i-carbon-search" />
              </BaseButton>

              <BaseButton
                variant="secondary"
                size="sm"
                :loading="clearingLogs"
                @click="clearLogs"
              >
                <div class="i-carbon-trash-can" />
              </BaseButton>
            </div>
          </div>

          <div ref="logContainer" class="max-h-[50vh] min-h-0 flex-1 overflow-y-auto border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-app)] p-4 text-sm leading-relaxed font-mono" @scroll="onLogScroll">
            <div v-if="!allLogs.length" class="py-8 text-center text-[var(--text-muted)]">
              暂无日志
            </div>
            <div v-for="log in allLogs" :key="log.ts + log.msg" class="mb-1 break-all">
              <span class="mr-2 select-none text-[var(--text-muted)]">[{{ formatLogTime(log.time) }}]</span>
              <span class="mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium" :class="getLogTagClass(log.tag)">{{ log.tag }}</span>
              <span v-if="log.meta?.event" class="mr-2 inline-flex rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">{{ getEventLabel(log.meta.event) }}</span>
              <span :class="getLogMsgClass(log.tag)">{{ log.msg }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column Stack -->
      <div class="flex flex-col gap-6 md:w-1/4">
        <!-- Next Checks -->
        <div class="flex flex-col border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div class="i-carbon-hourglass" />
            <span>下次巡查倒计时</span>
          </h3>
          <div class="flex flex-col justify-center gap-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div class="i-carbon-sprout text-lg text-[var(--status-success)]" />
                <span>农场</span>
              </div>
              <div class="text-lg text-[var(--text-primary)] font-bold font-mono">
                {{ nextFarmCheck }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div class="i-carbon-user-multiple text-lg text-[var(--status-info)]" />
                <span>帮助</span>
              </div>
              <div class="text-lg text-[var(--text-primary)] font-bold font-mono">
                {{ nextHelpCheck }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div class="i-carbon-run text-lg text-[var(--status-warning)]" />
                <span>偷菜</span>
              </div>
              <div class="text-lg text-[var(--text-primary)] font-bold font-mono">
                {{ nextStealCheck }}
              </div>
            </div>
          </div>
        </div>

        <!-- Operations Grid -->
        <div class="flex-1 border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-5">
          <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div class="i-carbon-chart-column" />
            <span>今日统计</span>
          </h3>
          <div v-if="!status?.connection?.connected" class="flex flex-col items-center justify-center gap-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-12 text-center text-[var(--text-muted)]">
            <div class="i-carbon-connection-signal-off text-4xl text-[var(--text-muted)]" />
            <div class="flex flex-col">
              <div class="text-lg text-[var(--text-primary)] font-medium">
                账号未登录
              </div>
              <div class="mt-1 text-sm text-[var(--text-muted)]">
                请先运行账号或检查网络连接
              </div>
            </div>
          </div>
          <div v-else class="grid grid-cols-2 gap-2 2xl:gap-3">
            <div
              v-for="(val, key) in filteredOperations"
              :key="key"
              class="flex items-center justify-between border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-app)] px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <div class="text-base 2xl:text-lg" :class="[getOpIcon(key), getOpColor(key)]" />
                <div class="text-xs text-[var(--text-muted)] 2xl:text-sm">
                  {{ getOpName(key) }}
                </div>
              </div>
              <div class="text-sm text-[var(--text-primary)] font-bold font-mono 2xl:text-base">
                {{ val }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
