<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useUserStore } from '@/stores/user'

declare const __APP_VERSION__: string

const userStore = useUserStore()
const appVersion = __APP_VERSION__
const gameVersion = ref('')

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const cardCode = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const showPasswordStrength = ref(false)
const lockoutRemaining = ref(0)
const rateLimitRemaining = ref(0)

const cardClaimEnabled = ref(false)
const cardClaimLoading = ref(false)
const showClaimModal = ref(false)
const claimModalContent = ref({
  success: true,
  title: '',
  message: '',
  cardCode: '',
  days: 0,
})

const passwordStrength = computed(() => {
  const pwd = password.value
  if (!pwd)
    return { score: 0, level: '', color: '', valid: false }

  let score = 0

  if (pwd.length >= 6)
    score++
  if (pwd.length >= 10)
    score++

  let typeCount = 0
  if (/[a-z]/.test(pwd))
    typeCount++
  if (/[A-Z]/.test(pwd))
    typeCount++
  if (/\d/.test(pwd))
    typeCount++
  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`]/.test(pwd))
    typeCount++

  if (typeCount >= 2)
    score += 2
  if (typeCount >= 3)
    score++
  if (typeCount >= 4)
    score++

  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', '111111']
  if (commonPasswords.some(p => pwd.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2)
  }

  const level = score <= 2 ? '弱' : score <= 4 ? '中' : score <= 6 ? '强' : '非常强'
  const color = score <= 2 ? '#ef5350' : score <= 4 ? '#ffa726' : score <= 6 ? '#66bb6a' : '#43a047'
  const valid = pwd.length >= 6 && typeCount >= 2

  return { score, level, color, valid }
})

const usernameValid = computed(() => {
  const name = username.value
  if (!name)
    return { valid: false, message: '' }
  if (name.length < 3)
    return { valid: false, message: '用户名至少3位' }
  if (name.length > 32)
    return { valid: false, message: '用户名最多32位' }
  if (!/^\w+$/.test(name))
    return { valid: false, message: '只能包含字母、数字、下划线' }
  return { valid: true, message: '' }
})

watch(password, () => {
  if (!isLogin.value && password.value)
    showPasswordStrength.value = true
})

function validateForm(): boolean {
  if (!username.value) {
    error.value = '请输入用户名'
    return false
  }
  if (!usernameValid.value.valid) {
    error.value = usernameValid.value.message
    return false
  }
  if (!password.value) {
    error.value = '请输入密码'
    return false
  }
  if (!isLogin.value) {
    if (password.value.length < 6) {
      error.value = '密码长度至少6位'
      return false
    }
    if (!passwordStrength.value.valid) {
      error.value = '密码强度不足'
      return false
    }
    if (!cardCode.value) {
      error.value = '请输入卡密'
      return false
    }
  }
  return true
}

async function handleSubmit() {
  if (!validateForm())
    return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    if (isLogin.value) {
      const result = await userStore.login(username.value, password.value)
      if (result.ok) {
        if (result.data?.mustChangePassword)
          success.value = '登录成功！请修改默认密码以确保账户安全'
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      }
      else {
        if (result.errorType === 'rate_limit') {
          error.value = result.error || '请求过于频繁，请稍后重试'
          if (result.remainingMs)
            rateLimitRemaining.value = Math.ceil(result.remainingMs / 1000)
        }
        else if (result.errorType === 'locked') {
          error.value = result.error || '账户已被锁定'
          if (result.remainingMs)
            lockoutRemaining.value = Math.ceil(result.remainingMs / 1000 / 60)
        }
        else {
          error.value = result.error || '登录失败'
        }
      }
    }
    else {
      const result = await userStore.register(username.value, password.value, cardCode.value)
      if (result.ok) {
        success.value = '注册成功，请登录'
        isLogin.value = true
        cardCode.value = ''
        password.value = ''
      }
      else {
        error.value = result.error || '注册失败'
      }
    }
  }
  catch (e: any) {
    const data = e.response?.data
    if (data?.errorType === 'rate_limit') {
      error.value = data.error || '请求过于频繁'
      if (data.remainingMs)
        rateLimitRemaining.value = Math.ceil(data.remainingMs / 1000)
    }
    else if (data?.errorType === 'locked') {
      error.value = data.error || '账户已被锁定'
      if (data.remainingMs)
        lockoutRemaining.value = Math.ceil(data.remainingMs / 1000 / 60)
    }
    else {
      error.value = data?.error || e.message || '操作异常'
    }
  }
  finally {
    loading.value = false
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  error.value = ''
  success.value = ''
  showPasswordStrength.value = false
  lockoutRemaining.value = 0
  rateLimitRemaining.value = 0
}

async function checkCardClaimStatus() {
  try {
    const res = await api.get('/api/card-claim/status')
    if (res.data.ok)
      cardClaimEnabled.value = res.data.enabled === true
  }
  catch (e) {
    console.error('检查卡密领取状态失败', e)
  }
}

async function claimFreeCard() {
  if (cardClaimLoading.value)
    return
  cardClaimLoading.value = true
  try {
    const res = await api.post('/api/card-claim')
    if (res.data.ok) {
      claimModalContent.value = {
        success: true,
        title: '领取成功',
        message: res.data.message || '卡密已自动填入',
        cardCode: res.data.cardCode || '',
        days: res.data.days || 0,
      }
      if (res.data.cardCode)
        cardCode.value = res.data.cardCode
    }
    else {
      claimModalContent.value = {
        success: false,
        title: '领取失败',
        message: res.data.error || '领取失败',
        cardCode: '',
        days: 0,
      }
    }
    showClaimModal.value = true
  }
  catch (e: any) {
    const data = e.response?.data
    claimModalContent.value = {
      success: false,
      title: '领取失败',
      message: data?.error || e.message || '领取失败',
      cardCode: '',
      days: 0,
    }
    showClaimModal.value = true
  }
  finally {
    cardClaimLoading.value = false
  }
}

function closeClaimModal() {
  showClaimModal.value = false
}

onMounted(() => {
  checkCardClaimStatus()
  fetchGameVersion()
})

async function fetchGameVersion() {
  try {
    const res = await api.get('/api/game-version')
    if (res.data.ok)
      gameVersion.value = res.data.clientVersion
  }
  catch (e) {
    console.error('获取游戏版本失败:', e)
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center p-4" :style="{ background: 'var(--surface-app)' }">
    <div class="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl" :style="{ background: 'var(--accent-muted)' }">
          <span class="i-carbon-crop-growth text-2xl text-[var(--accent)]" />
        </div>
        <h1 class="text-xl font-semibold tracking-tight" :style="{ color: 'var(--text-primary)' }">
          农场助手
        </h1>
        <p class="mt-1 text-sm" :style="{ color: 'var(--text-muted)' }">
          {{ isLogin ? '欢迎回来，开始你的农场之旅' : '加入我们，开启农场新生活' }}
        </p>
      </div>

      <!-- Form -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1.5 block text-sm font-medium" :style="{ color: 'var(--text-secondary)' }">用户名</label>
          <BaseInput
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
          />
          <p v-if="username && !usernameValid.valid" class="mt-1 text-xs" :style="{ color: 'var(--status-error)' }">
            {{ usernameValid.message }}
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium" :style="{ color: 'var(--text-secondary)' }">密码</label>
          <BaseInput
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
          <div v-if="showPasswordStrength && password" class="mt-2 flex items-center gap-2">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full" :style="{ background: 'var(--surface-hover)' }">
              <div
                class="h-full rounded-full transition-all duration-300"
                :style="{ width: `${Math.min(passwordStrength.score * 12.5, 100)}%`, backgroundColor: passwordStrength.color }"
              />
            </div>
            <span class="text-xs font-medium" :style="{ color: passwordStrength.color }">
              {{ passwordStrength.level }}
            </span>
          </div>
        </div>

        <div v-if="!isLogin">
          <label class="mb-1.5 block text-sm font-medium" :style="{ color: 'var(--text-secondary)' }">卡密</label>
          <div v-if="cardClaimEnabled" class="mb-2">
            <BaseButton type="button" variant="outline" size="sm" :loading="cardClaimLoading" @click="claimFreeCard">
              免费领取卡密
            </BaseButton>
          </div>
          <BaseInput
            id="cardCode"
            v-model="cardCode"
            type="text"
            placeholder="请输入卡密"
          />
        </div>

        <!-- Error/Success -->
        <div v-if="error" class="flex items-start gap-2 rounded-lg p-3" :style="{ background: 'var(--status-error)', opacity: 0.1 }">
          <div class="i-carbon-warning-filled mt-0.5 shrink-0 text-sm text-[var(--status-error)]" />
          <div class="text-sm text-[var(--status-error)]">
            {{ error }}
            <span v-if="lockoutRemaining > 0" class="block text-xs opacity-80">
              ({{ lockoutRemaining }} 分钟后解除)
            </span>
            <span v-if="rateLimitRemaining > 0" class="block text-xs opacity-80">
              ({{ rateLimitRemaining }} 秒后可重试)
            </span>
          </div>
        </div>
        <div v-if="success" class="flex items-start gap-2 rounded-lg p-3" :style="{ background: 'var(--accent-muted)' }">
          <div class="i-carbon-checkmark-filled mt-0.5 shrink-0 text-sm text-[var(--accent)]" />
          <span class="text-sm text-[var(--accent)]">{{ success }}</span>
        </div>

        <BaseButton type="submit" variant="primary" block :loading="loading">
          {{ isLogin ? '立即登录' : '立即注册' }}
        </BaseButton>
      </form>

      <!-- Switch Mode -->
      <div class="mt-6 text-center">
        <BaseButton variant="ghost" size="sm" @click="toggleMode">
          {{ isLogin ? '没有账号？立即注册' : '已有账号？立即登录' }}
        </BaseButton>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="text-xs" :style="{ color: 'var(--text-muted)' }">愿你的农场丰收满仓</p>
        <p class="mt-1 text-xs font-mono" :style="{ color: 'var(--text-muted)', opacity: 0.6 }">
          v{{ appVersion }}<span v-if="gameVersion" class="ml-2">游戏版本: {{ gameVersion }}</span>
        </p>
      </div>
    </div>

    <!-- Claim Modal -->
    <Teleport to="body">
      <Transition name="scale">
        <div v-if="showClaimModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="closeClaimModal">
          <div class="w-full max-w-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-5 shadow-xl" @click.stop>
            <div class="mb-4 text-center">
              <div :class="claimModalContent.success ? 'i-carbon-checkmark-filled text-[var(--status-success)]' : 'i-carbon-warning-filled text-[var(--status-warning)]'" class="text-3xl" />
            </div>
            <h3 class="mb-2 text-center text-base font-semibold" :style="{ color: 'var(--text-primary)' }">
              {{ claimModalContent.title }}
            </h3>
            <p class="mb-4 text-center text-sm" :style="{ color: 'var(--text-secondary)' }">
              {{ claimModalContent.message }}
            </p>
            <div v-if="claimModalContent.success && claimModalContent.cardCode" class="mb-4 rounded-lg p-3 text-center" :style="{ background: 'var(--surface-hover)' }">
              <div class="text-xs" :style="{ color: 'var(--text-muted)' }">卡密已自动填入</div>
              <div class="mt-1 font-mono text-sm font-medium" :style="{ color: 'var(--text-primary)' }">{{ claimModalContent.cardCode }}</div>
            </div>
            <BaseButton variant="primary" block @click="closeClaimModal">
              {{ claimModalContent.success ? '开始注册' : '我知道了' }}
            </BaseButton>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
