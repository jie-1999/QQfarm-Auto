<script setup lang="ts">
import { useDateFormat, useIntervalFn, useNow } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import AccountModal from '@/components/AccountModal.vue'
import RemarkModal from '@/components/RemarkModal.vue'

import { menuRoutes } from '@/router/menu'
import { getPlatformClass, getPlatformLabel, useAccountStore } from '@/stores/account'
import { useAppStore } from '@/stores/app'
import { useStatusStore } from '@/stores/status'
import { useUserStore } from '@/stores/user'

const accountStore = useAccountStore()
const statusStore = useStatusStore()
const appStore = useAppStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { accounts, currentAccount } = storeToRefs(accountStore)
const { status, realtimeConnected } = storeToRefs(statusStore)
const { sidebarOpen } = storeToRefs(appStore)

const showAccountDropdown = ref(false)
const showAccountModal = ref(false)
const showRemarkModal = ref(false)
const accountToEdit = ref<any>(null)
const wsErrorNotifiedAt = ref<Record<string, number>>({})

const systemConnected = ref(true)
const serverUptimeBase = ref(0)
const serverVersion = ref('')
const lastPingTime = ref(Date.now())
const now = useNow()
const formattedTime = useDateFormat(now, 'YYYY-MM-DD HH:mm:ss')

async function checkConnection() {
  try {
    const res = await api.get('/api/ping')
    systemConnected.value = true
    if (res.data.ok && res.data.data) {
      if (res.data.data.uptime) {
        serverUptimeBase.value = res.data.data.uptime
        lastPingTime.value = Date.now()
      }
      if (res.data.data.version) {
        serverVersion.value = res.data.data.version
      }
    }
    const accountRef = currentAccount.value?.id || currentAccount.value?.uin
    if (accountRef) {
      statusStore.connectRealtime(String(accountRef))
    }
  }
  catch {
    systemConnected.value = false
  }
}

async function refreshStatusFallback() {
  if (realtimeConnected.value)
    return
  const accountRef = currentAccount.value?.id || currentAccount.value?.uin
  if (accountRef) {
    await statusStore.fetchStatus(String(accountRef))
  }
}

async function handleAccountSaved() {
  await accountStore.fetchAccounts()
  await refreshStatusFallback()
  showAccountModal.value = false
  showRemarkModal.value = false
}

function openRemarkModal(acc: any) {
  accountToEdit.value = acc
  showRemarkModal.value = true
  showAccountDropdown.value = false
}

onMounted(() => {
  accountStore.fetchAccounts()
  checkConnection()
  userStore.fetchUserInfo()
  fetchAnnouncement()
})

onBeforeUnmount(() => {
  statusStore.disconnectRealtime()
})

const platform = computed(() => getPlatformLabel(currentAccount.value?.platform))

useIntervalFn(checkConnection, 30000)
useIntervalFn(() => {
  refreshStatusFallback()
  accountStore.fetchAccounts()
}, 10000)

watch(() => currentAccount.value?.id || currentAccount.value?.uin || '', () => {
  const accountRef = currentAccount.value?.id || currentAccount.value?.uin
  statusStore.connectRealtime(String(accountRef || ''))
  refreshStatusFallback()
}, { immediate: true })

watch(() => status.value?.wsError, (wsError: any) => {
  if (!wsError || Number(wsError.code) !== 400 || !currentAccount.value)
    return
  const errAt = Number(wsError.at) || 0
  const accId = String(currentAccount.value.id || currentAccount.value.uin || '')
  const lastNotified = wsErrorNotifiedAt.value[accId] || 0
  if (errAt <= lastNotified)
    return
  wsErrorNotifiedAt.value[accId] = errAt
  accountToEdit.value = currentAccount.value
  showAccountModal.value = true
}, { deep: true })

const uptime = computed(() => {
  const diff = Math.floor(serverUptimeBase.value + (now.value.getTime() - lastPingTime.value) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${h}h ${m}m ${s}s`
})

const displayName = computed(() => {
  const acc = currentAccount.value
  if (!acc)
    return '选择账号'
  const liveName = status.value?.status?.name
  if (liveName && liveName !== '未登录') {
    if (acc.name)
      return `${liveName} (${acc.name})`
    return liveName
  }
  if (acc.name) {
    if (acc.nick)
      return `${acc.nick} (${acc.name})`
    return acc.name
  }
  if (acc.nick)
    return acc.nick
  return acc.uin
})

const connectionStatus = computed(() => {
  if (!systemConnected.value) {
    return { text: '系统离线', color: 'bg-[var(--status-error)]', pulse: false }
  }
  if (!currentAccount.value?.id) {
    return { text: '请添加账号', color: 'bg-[var(--text-muted)]', pulse: false }
  }
  const isConnected = status.value?.connection?.connected
  if (isConnected) {
    return { text: '运行中', color: 'bg-[var(--status-success)]', pulse: true }
  }
  return { text: '未连接', color: 'bg-[var(--text-muted)]', pulse: false }
})

const navItems = computed(() => {
  const isAdmin = userStore.isAdmin
  return menuRoutes
    .filter(item => !item.adminOnly || isAdmin)
    .map(item => ({
      path: item.path ? `/${item.path}` : '/',
      label: item.label,
      icon: item.icon,
    }))
})

function selectAccount(acc: any) {
  accountStore.setCurrentAccount(acc)
  showAccountDropdown.value = false
}

const version = __APP_VERSION__

watch(() => route.path, () => {
  if (window.innerWidth < 1024)
    appStore.closeSidebar()
})

const showUserDropdown = ref(false)
const showRenewModal = ref(false)
const renewCardCode = ref('')
const renewLoading = ref(false)
const renewError = ref('')
const renewSuccess = ref(false)
const renewCardInfo = ref<{ type: string, days: number, description: string } | null>(null)
const renewChecking = ref(false)

const showAnnouncementModal = ref(false)
const showAnnouncementViewModal = ref(false)
const announcementContent = ref('')
const announcementShowOnce = ref(true)
const announcementSaving = ref(false)
const announcementLoading = ref(false)
const currentAnnouncement = ref<{ content: string, showOnce: boolean, updatedAt: number, shouldShow?: boolean } | null>(null)
const showThemeDropdown = ref(false)
const showTokenDropdown = ref(false)
const tokenVisible = ref(false)
const tokenCopied = ref(false)

async function handleLogout() {
  await userStore.logout()
  router.push('/login')
}

async function checkCardInfo() {
  if (!renewCardCode.value.trim()) {
    renewError.value = '请输入卡密'
    return
  }
  renewChecking.value = true
  renewError.value = ''
  renewCardInfo.value = null
  try {
    const res = await api.get(`/api/card/info/${renewCardCode.value.trim()}`)
    if (res.data.ok) {
      renewCardInfo.value = res.data.data
    }
    else {
      renewError.value = res.data.error || '卡密不存在或已使用'
    }
  }
  catch (e: any) {
    renewError.value = e?.response?.data?.error || e?.message || '查询卡密失败'
  }
  finally {
    renewChecking.value = false
  }
}

async function handleRenew() {
  if (!renewCardCode.value.trim()) {
    renewError.value = '请输入卡密'
    return
  }
  renewLoading.value = true
  renewError.value = ''
  renewSuccess.value = false
  try {
    const res = await userStore.renew(renewCardCode.value.trim())
    if (res.ok) {
      renewSuccess.value = true
      renewCardCode.value = ''
      renewCardInfo.value = null
      setTimeout(() => {
        showRenewModal.value = false
        renewSuccess.value = false
      }, 1500)
    }
    else {
      renewError.value = res.error || '续费失败'
    }
  }
  catch (e: any) {
    renewError.value = e?.response?.data?.error || e?.message || '续费失败'
  }
  finally {
    renewLoading.value = false
  }
}

function openRenewModal() {
  renewCardCode.value = ''
  renewError.value = ''
  renewSuccess.value = false
  renewCardInfo.value = null
  showRenewModal.value = true
  showUserDropdown.value = false
}

function getDaysLabel(days: number) {
  if (days === -1)
    return '永久'
  return `${days}天`
}

async function openAnnouncementModal() {
  showUserDropdown.value = false
  announcementLoading.value = true
  showAnnouncementModal.value = true
  try {
    const res = await api.get('/api/announcement')
    if (res.data?.ok && res.data?.data) {
      announcementContent.value = res.data.data.content || ''
      announcementShowOnce.value = res.data.data.showOnce !== false
    }
  }
  catch (e) {
    console.error('获取公告失败', e)
  }
  finally {
    announcementLoading.value = false
  }
}

async function saveAnnouncement() {
  announcementSaving.value = true
  try {
    const res = await api.post('/api/admin/announcement', {
      content: announcementContent.value,
      showOnce: announcementShowOnce.value,
    })
    if (res.data?.ok) {
      showAnnouncementModal.value = false
    }
    else {
      console.error('保存公告失败', res.data?.error)
    }
  }
  catch (e) {
    console.error('保存公告失败', e)
  }
  finally {
    announcementSaving.value = false
  }
}

async function fetchAnnouncement() {
  if (userStore.isAdmin)
    return
  try {
    const res = await api.get('/api/announcement')
    if (res.data?.ok && res.data?.data) {
      currentAnnouncement.value = res.data.data
      if (res.data.data.shouldShow && res.data.data.content) {
        showAnnouncementViewModal.value = true
      }
    }
  }
  catch (e) {
    console.error('获取公告失败', e)
  }
}

async function markAnnouncementRead() {
  try {
    await api.post('/api/announcement/read')
    showAnnouncementViewModal.value = false
  }
  catch (e) {
    console.error('标记公告已读失败', e)
  }
}

async function copyToken() {
  const tokenValue = userStore.token
  if (!tokenValue)
    return
  try {
    await navigator.clipboard.writeText(tokenValue)
    tokenCopied.value = true
    setTimeout(() => {
      tokenCopied.value = false
    }, 2000)
  }
  catch (e) {
    console.error('复制失败', e)
  }
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-[var(--border-subtle)] transition-transform duration-200 lg:static lg:translate-x-0"
    :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    :style="{ background: 'var(--surface-app)' }"
  >
    <!-- Brand -->
    <div class="h-14 flex shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-5">
      <div class="i-carbon-sprout text-xl text-[var(--accent)]" />
      <span class="text-sm font-semibold tracking-tight">农场助手</span>
      <button
        class="ml-auto h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors lg:hidden hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
        @click="appStore.closeSidebar"
      >
        <div class="i-carbon-close text-lg" />
      </button>
    </div>

    <!-- User Info -->
    <div class="border-b border-[var(--border-subtle)] p-3">
      <div class="group relative">
        <button
          class="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
          @click="showUserDropdown = !showUserDropdown"
        >
          <div class="h-8 w-8 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)] ring-2 ring-[var(--border-default)]">
            <img
              :src="userStore.avatar || 'https://free.picui.cn/free/2026/03/10/69affe5755149.jpg'"
              class="h-full w-full object-cover"
              @error="(e) => (e.target as HTMLImageElement).src = 'https://free.picui.cn/free/2026/03/10/69affe5755149.jpg'"
            >
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">
              {{ userStore.username || '未登录' }}
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                :class="userStore.isAdmin ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'"
              >
                {{ userStore.isAdmin ? '管理员' : '用户' }}
              </span>
              <span v-if="userStore.userCard" class="truncate text-[11px] text-[var(--text-muted)]">
                {{ getDaysLabel(userStore.userCard.days) }}
              </span>
            </div>
          </div>
          <div
            class="i-carbon-chevron-down text-[var(--text-muted)] transition-transform duration-200"
            :class="{ 'rotate-180': showUserDropdown }"
          />
        </button>

        <!-- User Dropdown -->
        <div
          v-if="showUserDropdown"
          class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] py-1 shadow-lg"
        >
          <div class="border-b border-[var(--border-subtle)] px-3 py-2">
            <div class="text-sm font-medium">
              {{ userStore.username }}
            </div>
            <div class="text-[11px] text-[var(--text-muted)]">
              {{ userStore.isAdmin ? '管理员' : '普通用户' }}
            </div>
            <div v-if="userStore.userCard" class="mt-1 text-[11px] text-[var(--text-muted)]">
              额度: <span class="text-[var(--accent)]">{{ userStore.accountLimit }}</span>
            </div>
          </div>
          <div class="py-1">
            <button
              v-if="userStore.isAdmin"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              @click="openAnnouncementModal"
            >
              <div class="i-carbon-notification" />
              <span>设置公告</span>
            </button>
            <button
              v-if="!userStore.isAdmin"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              @click="openRenewModal"
            >
              <div class="i-carbon-renew" />
              <span>续费卡密</span>
            </button>
            <button
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--status-error)] transition-colors hover:bg-[var(--surface-hover)]"
              @click="handleLogout"
            >
              <div class="i-carbon-logout" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Selector -->
    <div class="border-b border-[var(--border-subtle)] p-3">
      <div class="group relative">
        <button
          class="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
          @click="showAccountDropdown = !showAccountDropdown"
        >
          <div class="h-8 w-8 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)] ring-2 ring-[var(--border-default)]">
            <img
              v-if="currentAccount?.uin"
              :src="`https://q1.qlogo.cn/g?b=qq&nk=${currentAccount.uin}&s=100`"
              class="h-full w-full object-cover"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
            >
            <div v-else class="i-carbon-user text-[var(--text-muted)]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">
              {{ displayName }}
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="platform"
                class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                :class="getPlatformClass(currentAccount?.platform)"
              >
                {{ platform }}
              </span>
              <span class="truncate text-[11px] text-[var(--text-muted)]">
                {{ currentAccount?.uin || currentAccount?.id || '未选择' }}
              </span>
            </div>
          </div>
          <div
            class="i-carbon-chevron-down text-[var(--text-muted)] transition-transform duration-200"
            :class="{ 'rotate-180': showAccountDropdown }"
          />
        </button>

        <!-- Account Dropdown -->
        <div
          v-if="showAccountDropdown"
          class="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-hidden border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] py-1 shadow-lg"
        >
          <div class="overflow-y-auto">
            <template v-if="accounts.length > 0">
              <button
                v-for="acc in accounts"
                :key="acc.id || acc.uin"
                class="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                :class="{ 'bg-[var(--accent-muted)]': currentAccount?.id === acc.id }"
                @click="selectAccount(acc)"
              >
                <div class="h-6 w-6 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <img
                    v-if="acc.uin"
                    :src="`https://q1.qlogo.cn/g?b=qq&nk=${acc.uin}&s=100`"
                    class="h-full w-full object-cover"
                    @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                  >
                  <div v-else class="i-carbon-user text-[var(--text-muted)]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium">
                    {{ acc.nick && acc.name ? `${acc.nick} (${acc.name})` : acc.name || acc.nick || acc.uin }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-[var(--text-muted)]">{{ acc.uin || acc.id }}</span>
                  </div>
                </div>
                <button
                  class="rounded-full p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                  title="修改备注"
                  @click.stop="openRemarkModal(acc)"
                >
                  <div class="i-carbon-edit text-sm" />
                </button>
              </button>
            </template>
            <div v-else class="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
              暂无账号
            </div>
          </div>
          <div class="border-t border-[var(--border-subtle)] py-1">
            <button
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--surface-hover)]"
              @click="showAccountModal = true; showAccountDropdown = false"
            >
              <div class="i-carbon-add" />
              <span>添加账号</span>
            </button>
            <router-link
              to="/settings"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              @click="showAccountDropdown = false"
            >
              <div class="i-carbon-settings" />
              <span>管理账号</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        active-class="!bg-[var(--accent-muted)] !text-[var(--accent)] font-medium"
      >
        <div class="text-base" :class="[item.icon]" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Token Display -->
    <div v-if="userStore.token" class="border-t border-[var(--border-subtle)] px-3 py-2">
      <button
        class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
        @click="showTokenDropdown = !showTokenDropdown"
      >
        <div class="flex items-center gap-2">
          <div class="i-carbon-key text-[var(--accent)]" />
          <span class="text-[var(--text-muted)]">Token</span>
        </div>
        <div
          class="i-carbon-chevron-down text-xs text-[var(--text-muted)] transition-transform duration-200"
          :class="{ 'rotate-180': showTokenDropdown }"
        />
      </button>
      <div v-show="showTokenDropdown" class="mt-2 space-y-2">
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
            @click="tokenVisible = !tokenVisible"
          >
            <div :class="tokenVisible ? 'i-carbon-view-off' : 'i-carbon-view'" />
            <span>{{ tokenVisible ? '隐藏' : '显示' }}</span>
          </button>
          <button
            class="flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
            :class="tokenCopied ? 'text-[var(--status-success)]' : 'text-[var(--text-muted)]'"
            @click="copyToken"
          >
            <div :class="tokenCopied ? 'i-carbon-checkmark' : 'i-carbon-copy'" />
            <span>{{ tokenCopied ? '已复制' : '复制' }}</span>
          </button>
        </div>
        <div class="break-all rounded bg-[var(--surface-hover)] px-2.5 py-1.5 text-[10px] text-[var(--text-secondary)] font-mono">
          {{ tokenVisible ? userStore.token : '••••••••••••••••' }}
        </div>
      </div>
    </div>

    <!-- Footer Status -->
    <div class="border-t border-[var(--border-subtle)] p-3">
      <div class="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <div class="flex items-center gap-1.5">
          <div
            class="h-1.5 w-1.5 rounded-full"
            :class="[connectionStatus.color, { 'animate-pulse': connectionStatus.pulse }]"
          />
          <span>{{ connectionStatus.text }}</span>
        </div>
        <span>{{ uptime }}</span>
      </div>
      <div class="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
        <span>{{ formattedTime }}</span>
        <div class="flex items-center gap-2">
          <span>Web v{{ version }}</span>
          <span v-if="serverVersion">Core v{{ serverVersion }}</span>
        </div>
      </div>

      <!-- Theme Picker -->
      <div class="relative mt-2">
        <button
          class="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
          @click="showThemeDropdown = !showThemeDropdown"
        >
          <div class="i-carbon-color-palette text-[var(--accent)]" />
          <span>主题</span>
        </button>
        <div
          v-show="showThemeDropdown"
          class="absolute bottom-full left-0 right-0 grid grid-cols-3 mb-2 gap-1.5 border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] p-2 shadow-lg"
        >
          <button
            v-for="(t, theme) in appStore.themes"
            :key="theme"
            class="flex flex-col items-center gap-1 rounded-lg p-2 transition-all hover:bg-[var(--surface-hover)]"
            :class="{ 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface-elevated)]': appStore.currentTheme === theme }"
            :title="t.name"
            @click="appStore.applyTheme(theme as any); showThemeDropdown = false"
          >
            <div class="text-sm" :class="[t.icon]" :style="{ color: t.accent }" />
            <span class="text-[9px] text-[var(--text-muted)]">{{ t.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </aside>

  <!-- Click-away overlay for dropdowns -->
  <div
    v-if="showAccountDropdown || showUserDropdown"
    class="fixed inset-0 z-40"
    @click="showAccountDropdown = false; showUserDropdown = false"
  />

  <AccountModal
    :show="showAccountModal"
    :edit-data="accountToEdit"
    @close="showAccountModal = false; accountToEdit = null"
    @saved="handleAccountSaved"
  />

  <RemarkModal
    :show="showRemarkModal"
    :account="accountToEdit"
    @close="showRemarkModal = false"
    @saved="handleAccountSaved"
  />

  <!-- Renew Modal -->
  <div
    v-if="showRenewModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    @click.self="showRenewModal = false"
  >
    <div class="max-w-sm w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
      <h3 class="mb-4 text-base font-semibold">
        续费卡密
      </h3>

      <div v-if="userStore.userCard" class="mb-4 rounded-lg bg-[var(--surface-hover)] p-3">
        <div class="text-[11px] text-[var(--text-muted)]">
          当前状态
        </div>
        <div class="mt-1 flex items-center justify-between text-sm">
          <span class="text-[var(--text-secondary)]">时长: {{ getDaysLabel(userStore.userCard.days) }}</span>
          <span class="text-[var(--text-secondary)]">额度: {{ userStore.accountLimit }}</span>
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1.5 block text-sm text-[var(--text-secondary)]">卡密</label>
        <div class="flex gap-2">
          <input
            v-model="renewCardCode"
            type="text"
            placeholder="请输入卡密"
            class="flex-1 border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] focus:outline-none"
            :disabled="renewLoading || renewChecking"
          >
          <button
            class="border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
            :disabled="renewLoading || renewChecking || !renewCardCode.trim()"
            @click="checkCardInfo"
          >
            <div v-if="renewChecking" class="i-svg-spinners-90-ring-with-bg" />
            <span v-else>查询</span>
          </button>
        </div>
      </div>

      <div v-if="renewCardInfo" class="mb-4 border border-[var(--accent-border)] rounded-lg bg-[var(--accent-muted)] p-3">
        <div class="text-[11px] text-[var(--text-muted)]">
          卡密信息
        </div>
        <div class="mt-2 text-sm space-y-1.5">
          <div class="flex justify-between">
            <span class="text-[var(--text-muted)]">描述:</span>
            <span class="font-medium">{{ renewCardInfo.description }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--text-muted)]">类型:</span>
            <span class="rounded bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] font-medium">
              {{ renewCardInfo.type === 'quota' ? '额度卡' : '时间卡' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="renewError" class="mb-3 rounded-lg bg-[var(--status-error)]/10 px-3 py-2 text-sm text-[var(--status-error)]">
        {{ renewError }}
      </div>

      <div v-if="renewSuccess" class="mb-3 rounded-lg bg-[var(--status-success)]/10 px-3 py-2 text-sm text-[var(--status-success)]">
        续费成功！
      </div>

      <div class="flex justify-end gap-2">
        <button
          class="border border-[var(--border-default)] rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          @click="showRenewModal = false"
        >
          取消
        </button>
        <button
          class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          :disabled="renewLoading || renewChecking || !renewCardCode.trim()"
          @click="renewCardInfo ? handleRenew() : checkCardInfo()"
        >
          <div v-if="renewLoading" class="i-svg-spinners-90-ring-with-bg mr-1 inline-block align-text-bottom" />
          {{ renewCardInfo ? '确认使用' : '查询卡密' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Announcement Modal -->
  <div
    v-if="showAnnouncementModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    @click.self="showAnnouncementModal = false"
  >
    <div class="max-w-md w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
      <h3 class="mb-4 text-base font-semibold">
        设置公告
      </h3>
      <div v-if="announcementLoading" class="flex justify-center py-8">
        <div class="i-svg-spinners-90-ring-with-bg text-2xl text-[var(--accent)]" />
      </div>
      <template v-else>
        <div class="mb-4">
          <textarea
            v-model="announcementContent"
            rows="6"
            placeholder="请输入公告内容"
            class="w-full border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
        <div class="mb-4 flex items-center gap-2">
          <input id="announcementShowOnce" v-model="announcementShowOnce" type="checkbox" class="h-4 w-4 border-[var(--border-default)] rounded">
          <label for="announcementShowOnce" class="text-sm text-[var(--text-secondary)]">只显示一次</label>
        </div>
        <div class="flex justify-end gap-2">
          <button
            class="border border-[var(--border-default)] rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            @click="showAnnouncementModal = false"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            :disabled="announcementSaving"
            @click="saveAnnouncement"
          >
            <div v-if="announcementSaving" class="i-svg-spinners-90-ring-with-bg mr-1 inline-block align-text-bottom" />
            保存
          </button>
        </div>
      </template>
    </div>
  </div>

  <!-- View Announcement Modal -->
  <div
    v-if="showAnnouncementViewModal && currentAnnouncement?.content"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    @click.self="showAnnouncementViewModal = false"
  >
    <div class="max-w-md w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
      <div class="mb-4 flex items-center gap-2">
        <div class="i-carbon-notification text-lg text-[var(--accent)]" />
        <h3 class="text-base font-semibold">
          系统公告
        </h3>
      </div>
      <div class="mb-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-hover)] p-3 text-sm text-[var(--text-secondary)]">
        {{ currentAnnouncement.content }}
      </div>
      <div class="flex justify-end">
        <button
          class="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-[var(--accent-hover)]"
          @click="markAnnouncementRead"
        >
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>
