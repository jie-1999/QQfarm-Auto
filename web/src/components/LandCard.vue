<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  land: any
}>()

const land = computed(() => props.land)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

const growProgress = computed(() => {
  const matureInSec = land.value.matureInSec || 0
  const totalGrowTime = land.value.totalGrowTime || 0

  if (totalGrowTime <= 0 || matureInSec <= 0) {
    return 0
  }

  const progress = Math.min(100, Math.max(0, (matureInSec / totalGrowTime) * 100))
  return progress
})

const levelStyles: Record<number, { bg: string, border: string }> = {
  0: { bg: 'var(--surface-card)', border: 'var(--border-subtle)' },
  1: { bg: 'rgba(234, 179, 8, 0.06)', border: 'rgba(234, 179, 8, 0.15)' },
  2: { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.15)' },
  3: { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.18)' },
  4: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.18)' },
}

const landStyle = computed(() => {
  const level = Number(land.value.level) || 0
  const status = land.value.status
  const styles = levelStyles[level] ?? levelStyles[0]!

  if (status === 'locked') {
    return {
      background: 'var(--surface-card)',
      border: '1px dashed var(--border-default)',
      opacity: '0.6',
    }
  }

  if (status === 'dead') {
    return {
      background: 'var(--surface-hover)',
      border: '1px solid var(--border-default)',
      filter: 'grayscale(1)',
    }
  }

  const base: Record<string, string> = {
    background: styles.bg,
    border: `1px solid ${styles.border}`,
  }

  if (status === 'harvestable') {
    base.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.6), 0 0 0 3px var(--surface-card)'
  }
  else if (status === 'stealable') {
    base.boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.6), 0 0 0 3px var(--surface-card)'
  }

  return base
})

function formatTime(sec: number) {
  if (sec <= 0)
    return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getSafeImageUrl(url: string) {
  if (!url)
    return ''
  if (url.startsWith('http://'))
    return url.replace('http://', 'https://')
  return url
}

function getLandTypeName(level: number) {
  const typeMap: Record<number, string> = {
    0: '普通',
    1: '黄土地',
    2: '红土地',
    3: '黑土地',
    4: '金土地',
  }
  return typeMap[Number(level) || 0] || ''
}
function getPlantSizeText(land: any) {
  const size = Number(land?.plantSize) || 1
  if (size <= 1)
    return ''
  return `${size}x${size}`
}
</script>

<template>
  <div
    class="relative min-h-[140px] flex flex-col items-center rounded-xl p-2 transition hover:shadow-md"
    :style="landStyle"
  >
    <div class="absolute left-1 top-1 text-[10px] text-[var(--text-muted)] font-mono">
      #{{ land.id }}
    </div>
    <div
      v-if="land.plantSize > 1"
      class="absolute right-1 top-1 rounded px-1 py-0.5 text-[10px]"
      style="background: rgba(236, 72, 153, 0.12); color: #ec4899"
    >
      合种 {{ getPlantSizeText(land) }}
    </div>
    <div class="mb-1 mt-4 h-10 w-10 flex items-center justify-center">
      <img
        v-if="land.seedImage"
        :src="getSafeImageUrl(land.seedImage)"
        class="max-h-full max-w-full object-contain"
        loading="lazy"
        referrerpolicy="no-referrer"
      >
      <div v-else class="i-carbon-sprout text-xl text-[var(--text-muted)]" />
    </div>

    <div class="w-full truncate px-1 text-center text-xs text-[var(--text-primary)] font-bold" :title="land.plantName">
      {{ land.plantName || '-' }}
    </div>

    <div class="mb-0.5 mt-0.5 w-full text-center text-[10px] text-[var(--text-muted)]">
      <span v-if="land.matureInSec > 0" style="color: #f59e0b">
        预计 {{ formatTime(land.matureInSec) }} 后成熟
      </span>
      <span v-else>
        {{ land.phaseName || (land.status === 'locked' ? '未解锁' : '未开垦') }}
      </span>
    </div>

    <div v-if="land.matureInSec > 0 && land.totalGrowTime > 0" class="w-full px-1">
      <div class="rainbow-progress-bar">
        <div
          class="rainbow-progress-fill"
          :style="{ width: `${growProgress}%` }"
        />
      </div>
    </div>

    <div class="text-[10px] text-[var(--text-muted)]">
      {{ getLandTypeName(land.level) }}
    </div>

    <div class="mb-1 text-[10px] text-[var(--text-muted)]">
      季数 {{ land.totalSeason > 0 ? (`${land.currentSeason}/${land.totalSeason}`) : '-/-' }}
    </div>

    <!-- Status Badges -->
    <div class="mt-auto flex origin-bottom scale-90 gap-0.5 text-[10px]">
      <span
        v-if="land.needWater"
        class="rounded px-0.5"
        style="background: rgba(59, 130, 246, 0.12); color: #3b82f6"
      >水</span>
      <span
        v-if="land.needWeed"
        class="rounded px-0.5"
        style="background: rgba(16, 185, 129, 0.12); color: #10b981"
      >草</span>
      <span
        v-if="land.needBug"
        class="rounded px-0.5"
        style="background: rgba(239, 68, 68, 0.12); color: #ef4444"
      >虫</span>
      <!-- For friends view -->
      <span
        v-if="land.status === 'harvestable'"
        class="rounded px-0.5"
        style="background: rgba(245, 158, 11, 0.12); color: #f59e0b"
      >可偷</span>
    </div>
  </div>
</template>
