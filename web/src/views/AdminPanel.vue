<script setup lang="ts">
import type { Card, UserCard } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api'
import ConfirmModal from '@/components/ConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const toast = useToastStore()

const activeTab = ref<'card' | 'user' | 'log' | 'system'>(
  (localStorage.getItem('admin-active-tab') as 'card' | 'user' | 'log' | 'system') || 'card',
)

watch(activeTab, (newTab) => {
  localStorage.setItem('admin-active-tab', newTab)
})

const tabs = [
  { key: 'card', label: '卡密', icon: 'i-carbon-ticket' },
  { key: 'user', label: '用户', icon: 'i-carbon-user-admin' },
  { key: 'log', label: '日志', icon: 'i-carbon-document' },
  { key: 'system', label: '系统', icon: 'i-carbon-settings' },
] as const

const modalVisible = ref(false)
const modalConfig = ref({
  title: '',
  message: '',
  type: 'primary' as 'primary' | 'danger',
  isAlert: true,
})

function showAlert(message: string, type: 'primary' | 'danger' = 'primary') {
  modalConfig.value = {
    title: type === 'danger' ? '错误' : '提示',
    message,
    type,
    isAlert: true,
  }
  modalVisible.value = true
}

// ========== 卡密管理 ==========
const cards = ref<Card[]>([])
const cardsLoading = ref(false)
const showCreateModal = ref(false)

const newCard = ref({
  description: '',
  days: 30,
  count: 1,
  type: 'time' as 'time' | 'quota',
})

const selectedCards = ref<Set<string>>(new Set())
const selectAll = ref(false)

const searchQuery = ref('')
const filterStatus = ref<'all' | 'used' | 'unused' | 'enabled' | 'disabled'>('all')
const cardTypeFilter = ref<'all' | 'time' | 'quota'>('all')

// 卡密领取功能
const cardClaimEnabled = ref(false)
const cardClaimLoading = ref(false)

const unusedTimeCardsCount = computed(() => {
  return cards.value.filter(c => c.type === 'time' && !c.usedBy && c.enabled).length
})

const filteredCards = computed(() => {
  let result = cards.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(card =>
      card.code.toLowerCase().includes(query)
      || card.description.toLowerCase().includes(query)
      || (card.usedBy && card.usedBy.toLowerCase().includes(query)),
    )
  }

  switch (filterStatus.value) {
    case 'used':
      result = result.filter(card => card.usedBy)
      break
    case 'unused':
      result = result.filter(card => !card.usedBy)
      break
    case 'enabled':
      result = result.filter(card => card.enabled)
      break
    case 'disabled':
      result = result.filter(card => !card.enabled)
      break
  }

  if (cardTypeFilter.value !== 'all') {
    result = result.filter(card => card.type === cardTypeFilter.value)
  }

  return result
})

async function fetchCards() {
  cardsLoading.value = true
  try {
    const result = await userStore.getAllCards()
    if (result.ok) {
      cards.value = result.data
    }
    else {
      toast.error(result.error || '获取卡密列表失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '获取卡密列表失败')
  }
  finally {
    cardsLoading.value = false
  }
}

async function fetchCardClaimStatus() {
  cardClaimLoading.value = true
  try {
    const res = await api.get('/api/card-claim/status')
    if (res.data.ok) {
      cardClaimEnabled.value = res.data.enabled
    }
  }
  catch (e: any) {
    console.error('获取卡密领取状态失败:', e)
  }
  finally {
    cardClaimLoading.value = false
  }
}

async function toggleCardClaimStatus(enabled: boolean | undefined) {
  if (enabled === undefined)
    return
  cardClaimLoading.value = true
  try {
    const res = await api.post('/api/admin/card-claim/status', { enabled })
    if (res.data.ok) {
      cardClaimEnabled.value = res.data.enabled
      toast.success(enabled ? '卡密领取功能已开启' : '卡密领取功能已关闭')
    }
  }
  catch (e: any) {
    toast.error(e.message || '操作失败')
    cardClaimEnabled.value = !enabled
  }
  finally {
    cardClaimLoading.value = false
  }
}

async function createCard() {
  if (!newCard.value.description) {
    toast.warning('请输入卡密描述')
    return
  }

  const count = Math.min(Math.max(Number.parseInt(String(newCard.value.count), 10) || 1, 1), 100)

  try {
    const result = await userStore.createCard(
      newCard.value.description,
      newCard.value.days,
      count > 1 ? count : undefined,
      newCard.value.type,
    )
    if (result.ok) {
      if (result.batch) {
        toast.success(`成功创建 ${result.count} 个卡密`)
        exportCardsToFile(result.data, `卡密批量导出_${newCard.value.description}_${formatDateForFile(Date.now())}.txt`)
      }
      else {
        toast.success('卡密创建成功')
      }
      showCreateModal.value = false
      newCard.value = { description: '', days: 30, count: 1, type: 'time' }
      await fetchCards()
    }
    else {
      toast.error(result.error || '创建卡密失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '创建卡密失败')
  }
}

async function toggleCardStatus(card: Card) {
  try {
    const result = await userStore.updateCard(card.code, { enabled: !card.enabled })
    if (result.ok) {
      toast.success(card.enabled ? '卡密已禁用' : '卡密已启用')
      await fetchCards()
    }
    else {
      toast.error(result.error || '操作失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

async function deleteCard(card: Card) {
  if (!confirm(`确定要删除卡密 ${card.code} 吗？`))
    return

  try {
    const result = await userStore.deleteCard(card.code)
    if (result.ok) {
      toast.success('卡密删除成功')
      await fetchCards()
    }
    else {
      toast.error(result.error || '删除卡密失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '删除卡密失败')
  }
}

async function deleteSelectedCards() {
  const selectedCodes = Array.from(selectedCards.value)
  if (selectedCodes.length === 0) {
    toast.warning('请先选择要删除的卡密')
    return
  }

  if (!confirm(`确定要删除选中的 ${selectedCodes.length} 个卡密吗？此操作不可恢复！`))
    return

  try {
    const result = await userStore.deleteCardsBatch(selectedCodes)
    if (result.ok) {
      toast.success(`成功删除 ${result.deletedCount} 个卡密`)
      if (result.notFoundCount > 0) {
        toast.warning(`${result.notFoundCount} 个卡密未找到`)
      }
      selectedCards.value.clear()
      selectAll.value = false
      await fetchCards()
    }
    else {
      toast.error(result.error || '批量删除卡密失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '批量删除卡密失败')
  }
}

async function copyCode(code: string) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code)
      toast.success('卡密已复制到剪贴板')
    }
    else {
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      toast.success('卡密已复制到剪贴板')
      document.body.removeChild(textArea)
    }
  }
  catch (e) {
    toast.error('复制失败，请手动复制')
    console.error('复制失败:', e)
  }
}

async function copySelectedCards() {
  const codes = Array.from(selectedCards.value)
  if (codes.length === 0)
    return

  try {
    const text = codes.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success(`已复制 ${codes.length} 个卡密到剪贴板`)
    }
    else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      toast.success(`已复制 ${codes.length} 个卡密到剪贴板`)
      document.body.removeChild(textArea)
    }
  }
  catch (e) {
    toast.error('复制失败，请手动复制')
    console.error('复制失败:', e)
  }
}

function formatDate(timestamp: number | null) {
  if (!timestamp)
    return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatDateForFile(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
}

function getCardTypeLabel(card: Card) {
  if (card.type === 'quota') {
    return '额度'
  }
  return '时间'
}

function getCardValueLabel(card: Card) {
  if (card.type === 'quota') {
    return `+${card.days}额度`
  }
  if (card.days === -1)
    return '永久'
  return `${card.days}天`
}

function exportCardsToFile(cardsToExport: Card[], filename?: string) {
  if (!cardsToExport || cardsToExport.length === 0) {
    toast.warning('没有可导出的卡密')
    return
  }

  const content = cardsToExport.map(card =>
    `卡密: ${card.code}\n描述: ${card.description}\n时长: ${getCardTypeLabel(card)}\n状态: ${card.enabled ? '启用' : '禁用'}\n${card.usedBy ? `使用者: ${card.usedBy}\n使用时间: ${formatDate(card.usedAt)}` : '未使用'}\n创建时间: ${formatDate(card.createdAt)}\n${'='.repeat(40)}`,
  ).join('\n\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `卡密导出_${formatDateForFile(Date.now())}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  toast.success(`已导出 ${cardsToExport.length} 个卡密到文件`)
}

function toggleSelectAll() {
  if (selectAll.value) {
    filteredCards.value.forEach(card => selectedCards.value.add(card.code))
  }
  else {
    filteredCards.value.forEach(card => selectedCards.value.delete(card.code))
  }
}

function toggleSelectCard(code: string) {
  if (selectedCards.value.has(code)) {
    selectedCards.value.delete(code)
    selectAll.value = false
  }
  else {
    selectedCards.value.add(code)
    if (filteredCards.value.every(card => selectedCards.value.has(card.code))) {
      selectAll.value = true
    }
  }
}

// ========== 用户管理 ==========
interface UserInfo {
  username: string
  role: string
  card: UserCard | null
  accountLimit: number
}

interface EditForm {
  newUsername: string
  password: string
  accountLimit: number
  expiresAt: string
  isPermanent: boolean
}

const users = ref<UserInfo[]>([])
const usersLoading = ref(false)
const showEditModal = ref(false)
const selectedUser = ref<UserInfo | null>(null)
const editForm = ref<EditForm>({
  newUsername: '',
  password: '',
  accountLimit: 2,
  expiresAt: '',
  isPermanent: false,
})
const editLoading = ref(false)

const currentUsername = computed(() => userStore.username)

async function fetchUsers() {
  usersLoading.value = true
  try {
    const result = await userStore.getAllUsers()
    if (result.ok) {
      users.value = result.data
    }
    else {
      toast.error(result.error || '获取用户列表失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '获取用户列表失败')
  }
  finally {
    usersLoading.value = false
  }
}

async function toggleUserStatus(user: UserInfo) {
  try {
    const updates: Partial<UserCard> = { enabled: !user.card?.enabled }
    const result = await userStore.updateUser(user.username, updates)
    if (result.ok) {
      toast.success(user.card?.enabled ? '用户已封禁' : '用户已解封')
      await fetchUsers()
    }
    else {
      toast.error(result.error || '操作失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

async function deleteUser(user: UserInfo) {
  if (!confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复！`))
    return

  try {
    const result = await userStore.deleteUser(user.username)
    if (result.ok) {
      toast.success('用户删除成功')
      await fetchUsers()
    }
    else {
      toast.error(result.error || '删除用户失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '删除用户失败')
  }
}

function openEditModal(user: UserInfo) {
  selectedUser.value = user
  editForm.value = {
    newUsername: user.username,
    password: '',
    accountLimit: user.accountLimit || 2,
    expiresAt: user.card?.expiresAt ? formatDateTimeLocal(user.card.expiresAt) : '',
    isPermanent: user.card?.days === -1,
  }
  showEditModal.value = true
}

function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

async function handleEdit() {
  if (!selectedUser.value)
    return

  editLoading.value = true
  try {
    const expiresAtValue = editForm.value.isPermanent
      ? null
      : (editForm.value.expiresAt ? new Date(editForm.value.expiresAt).getTime() : null)

    const updateData: Record<string, any> = {
      accountLimit: editForm.value.accountLimit,
      expiresAt: expiresAtValue,
      isPermanent: editForm.value.isPermanent,
    }

    if (editForm.value.newUsername && editForm.value.newUsername !== selectedUser.value.username) {
      updateData.newUsername = editForm.value.newUsername
    }

    if (editForm.value.password) {
      updateData.password = editForm.value.password
    }

    const res = await api.post(`/api/admin/users/${selectedUser.value.username}/edit`, updateData)

    if (res.data.ok) {
      toast.success('用户信息已更新')
      showEditModal.value = false
      await fetchUsers()
    }
    else {
      toast.error(res.data.error || '更新失败')
    }
  }
  catch (e: any) {
    toast.error(e?.response?.data?.error || e?.message || '更新失败')
  }
  finally {
    editLoading.value = false
  }
}

function getDaysLabel(days: number) {
  if (days === -1)
    return '永久'
  return `${days}天`
}

function isExpired(card: UserCard | null) {
  if (!card?.expiresAt)
    return false
  return Date.now() > card.expiresAt
}

// ========== 登录日志 ==========
interface LoginLog {
  id: string
  timestamp: number
  event: 'login_success' | 'login_failed'
  username: string
  errorType: string | null
  ip: string
  userAgent: string
}

const loginLogs = ref<LoginLog[]>([])
const loginLogsLoading = ref(false)
const loginLogsTotal = ref(0)
const showClearLogsConfirm = ref(false)
const clearLogsLoading = ref(false)

async function fetchLoginLogs() {
  loginLogsLoading.value = true
  try {
    const result = await userStore.getLoginLogs(100, 0)
    if (result.ok) {
      loginLogs.value = result.data.logs
      loginLogsTotal.value = result.data.total
    }
    else {
      toast.error(result.error || '获取登录日志失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '获取登录日志失败')
  }
  finally {
    loginLogsLoading.value = false
  }
}

function openClearLogsConfirm() {
  if (loginLogsTotal.value === 0) {
    toast.warning('暂无日志可清空')
    return
  }
  showClearLogsConfirm.value = true
}

async function confirmClearLogs() {
  clearLogsLoading.value = true
  try {
    const result = await userStore.clearLoginLogs()
    if (result.ok) {
      toast.success('日志已清空')
      loginLogs.value = []
      loginLogsTotal.value = 0
      showClearLogsConfirm.value = false
    }
    else {
      toast.error(result.error || '清空失败')
    }
  }
  catch (e: any) {
    toast.error(e.message || '清空失败')
  }
  finally {
    clearLogsLoading.value = false
  }
}

function formatLogTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

function getEventLabel(event: string): string {
  return event === 'login_success' ? '登录成功' : '登录失败'
}

function getEventClass(event: string): string {
  return event === 'login_success'
    ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
    : 'bg-[var(--status-error)]/10 text-[var(--status-error)]'
}

function getErrorTypeLabel(errorType: string | null): string {
  if (!errorType)
    return '-'
  const labels: Record<string, string> = {
    rate_limit: '速率限制',
    locked: '账户锁定',
    invalid_credentials: '凭证错误',
  }
  return labels[errorType] || errorType
}

function parseBrowser(userAgent: string): string {
  if (!userAgent || userAgent === 'unknown')
    return '未知'

  if (userAgent.includes('Edg/')) {
    const match = userAgent.match(/Edg\/([\d.]+)/)
    return `Edge ${match ? match[1] : ''}`
  }
  if (userAgent.includes('Chrome/')) {
    const match = userAgent.match(/Chrome\/([\d.]+)/)
    return `Chrome ${match ? match[1] : ''}`
  }
  if (userAgent.includes('Firefox/')) {
    const match = userAgent.match(/Firefox\/([\d.]+)/)
    return `Firefox ${match ? match[1] : ''}`
  }
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/([\d.]+)/)
    return `Safari ${match ? match[1] : ''}`
  }
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    return 'IE'
  }

  return '其他'
}

// ========== 系统配置 ==========
const systemConfigSaving = ref(false)
const systemConfigLoading = ref(false)

const localSystemConfig = ref({
  serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
  clientVersion: '1.10.0.13_20260417',
  platform: 'qq',
  os: 'iOS',
})

const defaultSystemConfig = ref({
  serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
  clientVersion: '1.10.0.13_20260417',
  platform: 'qq',
  os: 'iOS',
})

const wxConfigSaving = ref(false)

const localWxConfig = ref({
  enabled: true,
  apiBase: 'http://127.0.0.1:8059/api',
  apiKey: '',
  proxyApiUrl: 'http://127.0.0.1:8059/api',
  appId: 'wx5306c5978fdb76e4',
  autoAddAccount: true,
  userIsolation: true,
})

const platformOptions = [
  { label: 'QQ', value: 'qq' },
  { label: '微信', value: 'wx' },
]

const osOptions = [
  { label: 'iOS', value: 'iOS' },
  { label: 'Android', value: 'Android' },
]

async function loadWxConfig() {
  try {
    const { data } = await api.get('/api/admin/wx-config')
    if (data?.ok && data.data) {
      localWxConfig.value = { ...data.data }
    }
  }
  catch (e: any) {
    console.error('加载微信配置失败:', e)
  }
}

async function handleSaveWxConfig() {
  wxConfigSaving.value = true
  try {
    const { data } = await api.post('/api/admin/wx-config', localWxConfig.value)
    if (data?.ok) {
      showAlert('微信配置已保存，全局应用生效', 'primary')
    }
    else {
      showAlert(data?.error || '保存失败', 'danger')
    }
  }
  catch (e: any) {
    showAlert(`保存失败: ${e.message || '未知错误'}`, 'danger')
  }
  finally {
    wxConfigSaving.value = false
  }
}

async function handleResetWxConfig() {
  localWxConfig.value = {
    enabled: true,
    apiBase: 'http://127.0.0.1:8059/api',
    apiKey: '',
    proxyApiUrl: 'http://127.0.0.1:8059/api',
    appId: 'wx5306c5978fdb76e4',
    autoAddAccount: true,
    userIsolation: true,
  }
  showAlert('微信配置已重置为默认值', 'primary')
}

async function loadSystemConfig() {
  systemConfigLoading.value = true
  try {
    const { data } = await api.get('/api/admin/system-config')
    if (data?.ok) {
      if (data.data.saved) {
        localSystemConfig.value = { ...data.data.saved }
      }
      if (data.data.default) {
        defaultSystemConfig.value = { ...data.data.default }
      }
    }
  }
  catch (e: any) {
    console.error('加载系统配置失败:', e)
  }
  finally {
    systemConfigLoading.value = false
  }
}

async function handleSaveSystemConfig() {
  systemConfigSaving.value = true
  try {
    const { data } = await api.post('/api/admin/system-config', localSystemConfig.value)
    if (data?.ok) {
      showAlert('系统配置已保存并立即生效，无需重启项目', 'primary')
    }
    else {
      showAlert(data?.error || '保存失败', 'danger')
    }
  }
  catch (e: any) {
    showAlert(`保存失败: ${e.message || '未知错误'}`, 'danger')
  }
  finally {
    systemConfigSaving.value = false
  }
}

async function handleResetSystemConfig() {
  systemConfigSaving.value = true
  try {
    const { data } = await api.post('/api/admin/system-config/reset')
    if (data?.ok) {
      localSystemConfig.value = { ...data.data.saved }
      showAlert('系统配置已重置为默认值', 'primary')
    }
    else {
      showAlert(data?.error || '重置失败', 'danger')
    }
  }
  catch (e: any) {
    showAlert(`重置失败: ${e.message || '未知错误'}`, 'danger')
  }
  finally {
    systemConfigSaving.value = false
  }
}

onMounted(() => {
  fetchCards()
  fetchUsers()
  fetchLoginLogs()
  loadSystemConfig()
  loadWxConfig()
  fetchCardClaimStatus()
})
</script>

<template>
  <div class="admin-panel mx-auto max-w-7xl p-4 md:p-6">
    <div class="mb-6">
      <h1 class="flex items-center gap-2 text-lg text-[var(--text-primary)] font-semibold tracking-tight">
        <div class="i-fas-user-shield" />
        后台管理
      </h1>
    </div>

    <div class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)]">
      <div class="border-b border-[var(--border-subtle)]">
        <nav class="flex gap-1 p-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            :class="activeTab === tab.key
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]'"
            @click="activeTab = tab.key"
          >
            <div :class="tab.icon" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="p-4 md:p-6">
        <!-- 卡密管理 -->
        <div v-if="activeTab === 'card'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
              卡密管理
            </h3>
            <div class="flex gap-2">
              <BaseButton variant="secondary" size="sm" @click="fetchCards">
                刷新
              </BaseButton>
              <BaseButton variant="primary" size="sm" @click="showCreateModal = true">
                创建卡密
              </BaseButton>
            </div>
          </div>

          <!-- 卡密领取功能开关 -->
          <div class="flex items-center justify-between border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-4">
            <div>
              <h4 class="text-sm text-[var(--text-primary)] font-medium">
                卡密领取功能
              </h4>
              <p class="mt-1 text-xs text-[var(--text-muted)]">
                开启后，用户注册时可免费领取一张时间卡密
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-[var(--text-muted)]">
                库存: <span class="font-medium font-mono" :class="unusedTimeCardsCount > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'">{{ unusedTimeCardsCount }}</span> 张
              </span>
              <BaseSwitch
                v-model="cardClaimEnabled"
                :disabled="cardClaimLoading"
                @update:model-value="toggleCardClaimStatus"
              />
            </div>
          </div>

          <!-- 类型筛选 -->
          <div class="flex gap-2">
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150"
              :class="cardTypeFilter === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
              @click="cardTypeFilter = 'all'"
            >
              全部
            </button>
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150"
              :class="cardTypeFilter === 'time'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
              @click="cardTypeFilter = 'time'"
            >
              时间卡密
            </button>
            <button
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150"
              :class="cardTypeFilter === 'quota'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
              @click="cardTypeFilter = 'quota'"
            >
              配额卡密
            </button>
          </div>

          <!-- 搜索和状态筛选 -->
          <div class="flex items-center gap-2">
            <input
              v-model="searchQuery"
              placeholder="搜索卡密、描述或使用者..."
              class="h-8 w-64 border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]/20"
            >
            <select
              v-model="filterStatus"
              class="h-8 border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-2 text-sm text-[var(--text-primary)]"
            >
              <option value="all">
                全部状态
              </option>
              <option value="unused">
                未使用
              </option>
              <option value="used">
                已使用
              </option>
              <option value="enabled">
                已启用
              </option>
              <option value="disabled">
                已禁用
              </option>
            </select>
          </div>

          <!-- 批量操作栏 -->
          <div v-if="selectedCards.size > 0" class="flex items-center gap-3 border border-[var(--accent-border)] rounded-lg bg-[var(--accent-muted)] p-3">
            <span class="text-sm text-[var(--accent)]">
              已选择 {{ selectedCards.size }} 个卡密
            </span>
            <BaseButton variant="secondary" size="sm" @click="copySelectedCards">
              一键复制
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="deleteSelectedCards">
              批量删除
            </BaseButton>
            <BaseButton
              class="ml-auto"
              variant="ghost"
              size="sm"
              @click="selectedCards.clear(); selectAll = false"
            >
              清除选择
            </BaseButton>
          </div>

          <!-- 加载中 -->
          <div v-if="cardsLoading" class="py-8 text-center text-[var(--text-muted)]">
            <div i-svg-spinners-90-ring-with-bg class="mb-2 inline-block text-2xl" />
            <div>加载中...</div>
          </div>

          <!-- 卡密表格 -->
          <div v-else class="overflow-hidden border border-[var(--border-subtle)] rounded-xl">
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-[var(--surface-hover)] text-xs text-[var(--text-muted)] tracking-wider uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left">
                      <input
                        v-model="selectAll"
                        type="checkbox"
                        class="border-[var(--border-default)] rounded"
                        @change="toggleSelectAll"
                      >
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      卡密
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      描述
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      类型
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      数值
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      状态
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      使用者
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      生成时间
                    </th>
                    <th class="px-4 py-2 text-left font-medium">
                      使用时间
                    </th>
                    <th class="px-4 py-2 text-right font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="card in filteredCards"
                    :key="card.code"
                    class="border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
                  >
                    <td class="px-3 py-2">
                      <input
                        :checked="selectedCards.has(card.code)"
                        type="checkbox"
                        class="border-[var(--border-default)] rounded"
                        @change="toggleSelectCard(card.code)"
                      >
                    </td>
                    <td class="whitespace-nowrap px-4 py-2">
                      <code class="rounded bg-[var(--surface-hover)] px-2 py-0.5 text-xs text-[var(--text-secondary)] font-mono">{{ card.code }}</code>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-sm text-[var(--text-primary)]">
                      {{ card.description }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-2">
                      <span
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="card.type === 'quota' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--status-info)]/10 text-[var(--status-info)]'"
                      >
                        {{ getCardTypeLabel(card) }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-sm text-[var(--text-primary)] font-mono">
                      {{ getCardValueLabel(card) }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-2">
                      <span
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="card.enabled ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]' : 'bg-[var(--status-error)]/10 text-[var(--status-error)]'"
                      >
                        {{ card.enabled ? '启用' : '禁用' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-sm text-[var(--text-muted)]">
                      {{ card.usedBy || '-' }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-sm text-[var(--text-muted)]">
                      {{ card.createdAt ? new Date(card.createdAt).toLocaleString() : '-' }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-sm text-[var(--text-muted)]">
                      {{ card.usedAt ? new Date(card.usedAt).toLocaleString() : '-' }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-2 text-right text-sm">
                      <button class="mr-2 text-[var(--accent)] transition-opacity hover:opacity-80" @click="copyCode(card.code)">
                        复制
                      </button>
                      <button class="mr-2 text-[var(--accent)] transition-opacity hover:opacity-80" @click="toggleCardStatus(card)">
                        {{ card.enabled ? '禁用' : '启用' }}
                      </button>
                      <button class="text-[var(--status-error)] transition-opacity hover:opacity-80" @click="deleteCard(card)">
                        删除
                      </button>
                    </td>
                  </tr>
                  <tr v-if="filteredCards.length === 0">
                    <td colspan="10" class="px-4 py-4 text-center text-[var(--text-muted)]">
                      暂无卡密
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 创建卡密弹窗 -->
          <div
            v-if="showCreateModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="showCreateModal = false"
          >
            <div class="max-w-md w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
              <h2 class="mb-4 text-lg text-[var(--text-primary)] font-semibold tracking-tight">
                创建卡密
              </h2>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    描述
                  </label>
                  <BaseInput
                    v-model="newCard.description"
                    placeholder="例如: 月卡-2024"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    卡密类型
                  </label>
                  <div class="flex gap-4">
                    <label class="flex cursor-pointer items-center gap-2">
                      <input
                        v-model="newCard.type"
                        type="radio"
                        value="time"
                        class="text-[var(--accent)] focus:ring-[var(--accent)]"
                      >
                      <span class="text-sm text-[var(--text-secondary)]">时间卡（增加使用时长）</span>
                    </label>
                    <label class="flex cursor-pointer items-center gap-2">
                      <input
                        v-model="newCard.type"
                        type="radio"
                        value="quota"
                        class="text-[var(--accent)] focus:ring-[var(--accent)]"
                      >
                      <span class="text-sm text-[var(--text-secondary)]">额度卡（增加账号额度）</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    {{ newCard.type === 'quota' ? '额度数量' : '天数' }}
                  </label>
                  <BaseInput
                    v-model.number="newCard.days"
                    type="number"
                    :placeholder="newCard.type === 'quota' ? '可添加的账号数量' : '天数'"
                  />
                  <p v-if="newCard.type === 'time'" class="mt-1 text-xs text-[var(--text-muted)]">
                    输入-1表示永久，其他数字表示天数
                  </p>
                  <p v-else class="mt-1 text-xs text-[var(--text-muted)]">
                    用户使用后可增加的账号额度数量
                  </p>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    数量
                  </label>
                  <BaseInput
                    v-model.number="newCard.count"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="数量"
                  />
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    批量创建数量（1-100），批量创建后会自动导出文件
                  </p>
                </div>
              </div>
              <div class="mt-5 flex justify-end gap-2">
                <BaseButton variant="secondary" size="sm" @click="showCreateModal = false">
                  取消
                </BaseButton>
                <BaseButton variant="primary" size="sm" @click="createCard">
                  创建
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户管理 -->
        <div v-else-if="activeTab === 'user'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
              用户管理
            </h3>
            <BaseButton variant="primary" size="sm" @click="fetchUsers">
              刷新
            </BaseButton>
          </div>

          <div v-if="usersLoading" class="py-8 text-center text-[var(--text-muted)]">
            <div i-svg-spinners-90-ring-with-bg class="mb-2 inline-block text-2xl" />
            <div>加载中...</div>
          </div>

          <div v-else class="overflow-hidden border border-[var(--border-subtle)] rounded-xl">
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-[var(--surface-hover)] text-xs text-[var(--text-muted)] tracking-wider uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">
                      用户名
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      角色
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      额度
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      时长
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      过期时间
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      状态
                    </th>
                    <th class="px-3 py-2 text-right font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in users"
                    :key="user.username"
                    class="border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
                  >
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)] font-medium">
                      {{ user.username }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2">
                      <span
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="user.role === 'admin' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'"
                      >
                        {{ user.role === 'admin' ? '管理员' : '用户' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)]">
                      <span
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="user.role === 'admin' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'"
                      >
                        {{ user.role === 'admin' ? '无限制' : `${user.accountLimit || 2}个` }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)]">
                      {{ user.card ? getDaysLabel(user.card.days) : '无' }}
                    </td>
                    <td
                      class="whitespace-nowrap px-3 py-2 text-sm"
                      :class="isExpired(user.card) ? 'text-[var(--status-error)]' : 'text-[var(--text-primary)]'"
                    >
                      {{ formatDate(user.card?.expiresAt || null) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2">
                      <span
                        v-if="user.card"
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="user.card.enabled === false
                          ? 'bg-[var(--status-error)]/10 text-[var(--status-error)]'
                          : (isExpired(user.card)
                            ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'
                            : 'bg-[var(--status-success)]/10 text-[var(--status-success)]')"
                      >
                        {{ user.card.enabled === false ? '封禁' : (isExpired(user.card) ? '已过期' : '正常') }}
                      </span>
                      <span v-else class="text-[var(--text-muted)]">-</span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
                      <button
                        class="mr-3 text-[var(--accent)] transition-opacity hover:opacity-80"
                        @click="openEditModal(user)"
                      >
                        编辑
                      </button>
                      <button
                        v-if="user.card"
                        class="mr-3 text-[var(--status-warning)] transition-opacity hover:opacity-80"
                        @click="toggleUserStatus(user)"
                      >
                        {{ user.card.enabled === false ? '解封' : '封禁' }}
                      </button>
                      <button
                        v-if="user.username !== currentUsername"
                        class="text-[var(--status-error)] transition-opacity hover:opacity-80"
                        @click="deleteUser(user)"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                  <tr v-if="users.length === 0">
                    <td colspan="8" class="px-3 py-4 text-center text-[var(--text-muted)]">
                      暂无用户
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 编辑用户弹窗 -->
          <div
            v-if="showEditModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="showEditModal = false"
          >
            <div class="max-w-md w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
              <h2 class="mb-4 text-lg text-[var(--text-primary)] font-semibold tracking-tight">
                编辑用户: {{ selectedUser?.username }}
              </h2>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    用户名
                  </label>
                  <BaseInput
                    v-model="editForm.newUsername"
                    placeholder="输入新用户名（留空则不修改）"
                  />
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    用户名只能包含字母、数字和下划线，长度3-32位
                  </p>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    新密码
                  </label>
                  <BaseInput
                    v-model="editForm.password"
                    type="password"
                    placeholder="输入新密码（留空则不修改）"
                  />
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    密码长度至少6位，需包含大写字母、小写字母、数字、特殊符号中的至少两种
                  </p>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    账号额度
                  </label>
                  <BaseInput
                    v-model.number="editForm.accountLimit"
                    type="number"
                    min="1"
                    placeholder="可添加的账号数量"
                  />
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    用户最多可添加的农场账号数量
                  </p>
                </div>
                <div>
                  <label class="mb-1 block text-sm text-[var(--text-secondary)] font-medium">
                    过期时间
                  </label>
                  <div class="flex items-center gap-3">
                    <input
                      v-model="editForm.isPermanent"
                      type="checkbox"
                      class="border-[var(--border-default)] rounded text-[var(--accent)] focus:ring-[var(--accent)]"
                    >
                    <span class="text-sm text-[var(--text-secondary)]">永久有效</span>
                  </div>
                  <input
                    v-if="!editForm.isPermanent"
                    v-model="editForm.expiresAt"
                    type="datetime-local"
                    class="mt-2 w-full border border-[var(--border-default)] rounded-lg bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all duration-200 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                </div>
              </div>
              <div class="mt-5 flex justify-end gap-2">
                <BaseButton variant="secondary" size="sm" @click="showEditModal = false">
                  取消
                </BaseButton>
                <BaseButton
                  variant="primary"
                  size="sm"
                  :disabled="editLoading"
                  @click="handleEdit"
                >
                  {{ editLoading ? '保存中...' : '保存' }}
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 登录日志 -->
        <div v-else-if="activeTab === 'log'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
              登录日志
            </h3>
            <div class="flex items-center gap-2">
              <BaseButton
                variant="danger"
                size="sm"
                @click="openClearLogsConfirm"
              >
                清空日志
              </BaseButton>
              <BaseButton
                variant="primary"
                size="sm"
                :loading="loginLogsLoading"
                @click="fetchLoginLogs"
              >
                刷新
              </BaseButton>
            </div>
          </div>

          <div class="overflow-hidden border border-[var(--border-subtle)] rounded-xl">
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-[var(--surface-hover)] text-xs text-[var(--text-muted)] tracking-wider uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">
                      时间
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      事件
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      用户名
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      错误类型
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      IP地址
                    </th>
                    <th class="px-3 py-2 text-left font-medium">
                      浏览器
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loginLogsLoading">
                    <td colspan="6" class="px-3 py-8 text-center text-[var(--text-muted)]">
                      加载中...
                    </td>
                  </tr>
                  <tr v-else-if="loginLogs.length === 0">
                    <td colspan="6" class="px-3 py-8 text-center text-[var(--text-muted)]">
                      暂无登录日志
                    </td>
                  </tr>
                  <tr
                    v-for="log in loginLogs"
                    :key="log.id"
                    class="border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
                  >
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)]">
                      {{ formatLogTime(log.timestamp) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2">
                      <span
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        :class="getEventClass(log.event)"
                      >
                        {{ getEventLabel(log.event) }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)] font-medium">
                      {{ log.username }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-primary)]">
                      {{ getErrorTypeLabel(log.errorType) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-secondary)] font-mono">
                      {{ log.ip }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-[var(--text-secondary)]">
                      {{ parseBrowser(log.userAgent) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="loginLogsTotal > 0" class="border-t border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
              共 {{ loginLogsTotal }} 条记录
            </div>
          </div>

          <!-- 清空日志确认弹窗 -->
          <div
            v-if="showClearLogsConfirm"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="showClearLogsConfirm = false"
          >
            <div class="max-w-md w-full border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
              <h2 class="mb-4 text-lg text-[var(--text-primary)] font-semibold tracking-tight">
                确认清空日志
              </h2>
              <p class="mb-4 text-sm text-[var(--text-secondary)]">
                确定要清空所有登录日志吗？此操作不可恢复。
              </p>
              <p class="mb-4 text-sm text-[var(--text-muted)]">
                当前共有 {{ loginLogsTotal }} 条记录
              </p>
              <div class="flex justify-end gap-2">
                <BaseButton variant="secondary" size="sm" @click="showClearLogsConfirm = false">
                  取消
                </BaseButton>
                <BaseButton
                  variant="danger"
                  size="sm"
                  :loading="clearLogsLoading"
                  @click="confirmClearLogs"
                >
                  确认清空
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统配置 -->
        <div v-else-if="activeTab === 'system'" class="space-y-4">
          <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
            系统配置
          </h3>

          <div class="space-y-4">
            <!-- 系统配置卡片 -->
            <div class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-4">
              <h4 class="mb-3 flex items-center gap-2 text-base text-[var(--text-primary)] font-semibold">
                <div class="i-carbon-settings" />
                系统配置
              </h4>

              <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <BaseInput
                  v-model="localSystemConfig.serverUrl"
                  label="服务器地址"
                  type="text"
                  placeholder="wss://..."
                />
                <BaseInput
                  v-model="localSystemConfig.clientVersion"
                  label="客户端版本"
                  type="text"
                  placeholder="1.10.0.13_20260417"
                />
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm text-[var(--text-secondary)] font-medium">平台</label>
                  <div class="flex gap-2">
                    <button
                      v-for="option in platformOptions"
                      :key="option.value"
                      class="rounded-lg px-3 py-1.5 text-sm transition-all duration-200"
                      :class="localSystemConfig.platform === option.value
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
                      @click="localSystemConfig.platform = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm text-[var(--text-secondary)] font-medium">系统</label>
                  <div class="flex gap-2">
                    <button
                      v-for="option in osOptions"
                      :key="option.value"
                      class="rounded-lg px-3 py-1.5 text-sm transition-all duration-200"
                      :class="localSystemConfig.os === option.value
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'"
                      @click="localSystemConfig.os = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-3 flex justify-end gap-2">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  :loading="systemConfigSaving"
                  @click="handleResetSystemConfig"
                >
                  重置
                </BaseButton>
                <BaseButton
                  variant="primary"
                  size="sm"
                  :loading="systemConfigSaving"
                  @click="handleSaveSystemConfig"
                >
                  保存
                </BaseButton>
              </div>
            </div>

            <!-- 微信配置卡片 -->
            <div class="border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] p-4">
              <h4 class="mb-3 flex items-center gap-2 text-base text-[var(--text-primary)] font-semibold">
                <div class="i-carbon-logo-wechat" />
                微信配置
              </h4>

              <div class="mb-3 border border-[var(--accent-border)] rounded-lg bg-[var(--accent-muted)] p-3 text-xs text-[var(--accent)]">
                <div>- 启用微信登录: 关闭后普通用户无法使用微信扫码登录</div>
                <div>- 自动添加账号: 扫码成功后自动添加账号，关闭则只返回Code</div>
                <div>- 用户隔离: 开启后普通用户只能看到自己的账号</div>
              </div>

              <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div class="md:col-span-2">
                  <BaseSwitch
                    v-model="localWxConfig.enabled"
                    label="启用微信登录"
                  />
                </div>
                <BaseInput
                  v-model="localWxConfig.apiBase"
                  label="API地址"
                  type="text"
                  placeholder="http://127.0.0.1:8059/api"
                />
                <BaseInput
                  v-model="localWxConfig.apiKey"
                  label="API密钥"
                  type="text"
                  placeholder="可选，用于代理模式"
                />
                <BaseInput
                  v-model="localWxConfig.proxyApiUrl"
                  label="代理API地址"
                  type="text"
                  placeholder="http://127.0.0.1:8059/api"
                />
                <div class="md:col-span-2">
                  <BaseSwitch
                    v-model="localWxConfig.autoAddAccount"
                    label="自动添加账号"
                  />
                </div>
                <div class="md:col-span-2">
                  <BaseSwitch
                    v-model="localWxConfig.userIsolation"
                    label="用户隔离"
                  />
                </div>
              </div>

              <div class="mt-3 flex justify-end gap-2">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  :loading="wxConfigSaving"
                  @click="handleResetWxConfig"
                >
                  重置
                </BaseButton>
                <BaseButton
                  variant="primary"
                  size="sm"
                  :loading="wxConfigSaving"
                  @click="handleSaveWxConfig"
                >
                  保存
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="modalVisible"
      :title="modalConfig.title"
      :message="modalConfig.message"
      :type="modalConfig.type"
      :is-alert="modalConfig.isAlert"
      confirm-text="知道了"
      @confirm="modalVisible = false"
      @cancel="modalVisible = false"
    />
  </div>
</template>
