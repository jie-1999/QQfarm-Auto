<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { useWxLoginStore } from '@/stores/wx-login'

const props = defineProps<{
  show: boolean
  editData?: any
}>()

const emit = defineEmits(['close', 'saved'])

const wxLoginStore = useWxLoginStore()

// 标签页：wx-微信扫码, manual-手动填码
const activeTab = ref<'wx' | 'manual'>('manual')
const loading = ref(false)
const errorMessage = ref('')

// 微信扫码相关
const wxAccountName = ref('')

// 表单数据
const form = reactive({
  name: '',
  code: '',
  platform: 'qq' as 'qq' | 'wx',
  wxid: '',
})

// 微信扫码轮询
const { pause: stopWxCheck, resume: startWxCheck } = useIntervalFn(async () => {
  if (wxLoginStore.status !== 'qr_ready' && wxLoginStore.status !== 'confirming') {
    return
  }
  const result = await wxLoginStore.checkLogin()
  if (result.success && result.wxid) {
    stopWxCheck()
    // 获取Code并添加账号
    const codeResult = await wxLoginStore.getFarmCode()
    if (codeResult.success && codeResult.code) {
      const name = wxAccountName.value.trim() || result.nickname || `微信账号${Date.now()}`
      // 检查是否启用自动添加账号
      if (wxLoginStore.config.autoAddAccount) {
        await addAccount({
          id: props.editData?.id,
          name: props.editData ? (props.editData.name || name) : name,
          code: codeResult.code,
          platform: 'wx',
          loginType: 'wx_qr',
          wxid: result.wxid,
        })
      }
      else {
        // 不自动添加，只显示 code 让用户手动复制
        form.code = codeResult.code
        form.platform = 'wx'
        activeTab.value = 'manual'
      }
    }
  }
}, 2000, { immediate: false })

// 获取微信二维码
async function loadWxQRCode() {
  if (activeTab.value !== 'wx')
    return
  wxLoginStore.resetState()
  const success = await wxLoginStore.getQRCode()
  if (success) {
    startWxCheck()
  }
}

// 添加账号
async function addAccount(data: any) {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await api.post('/api/accounts', data)
    if (res.data.ok) {
      emit('saved')
      close()
    }
    else {
      errorMessage.value = `保存失败: ${res.data.error}`
    }
  }
  catch (e: any) {
    errorMessage.value = `保存失败: ${e.response?.data?.error || e.message}`
  }
  finally {
    loading.value = false
  }
}

// 手动提交
async function submitManual() {
  errorMessage.value = ''
  if (!form.code) {
    errorMessage.value = '请输入Code'
    return
  }

  let code = form.code.trim()
  const match = code.match(/[?&]code=([^&]+)/i)
  if (match && match[1]) {
    code = decodeURIComponent(match[1])
    form.code = code
  }

  let payload: any = {}
  if (props.editData) {
    const onlyNameChanged = form.name !== props.editData.name
      && form.code === (props.editData.code || '')
      && form.platform === (props.editData.platform || 'qq')

    if (onlyNameChanged) {
      payload = { id: props.editData.id, name: form.name }
    }
    else {
      payload = {
        id: props.editData.id,
        name: form.name,
        code,
        platform: form.platform,
        loginType: 'manual',
        wxid: form.platform === 'wx' ? form.wxid.trim() : '',
        openid: form.platform === 'wx' ? form.wxid.trim() : '',
      }
    }
  }
  else {
    payload = {
      name: form.name,
      code,
      platform: form.platform,
      loginType: 'manual',
      wxid: form.platform === 'wx' ? form.wxid.trim() : '',
      openid: form.platform === 'wx' ? form.wxid.trim() : '',
    }
  }

  await addAccount(payload)
}

// 微信二维码图片
const wxQrImageSrc = computed(() => {
  if (!wxLoginStore.qrCode)
    return ''
  if (wxLoginStore.qrCode.startsWith('data:'))
    return wxLoginStore.qrCode
  if (wxLoginStore.qrCode.startsWith('http'))
    return wxLoginStore.qrCode
  return `data:image/png;base64,${wxLoginStore.qrCode}`
})

function close() {
  stopWxCheck()
  wxLoginStore.resetState()
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    errorMessage.value = ''
    if (props.editData) {
      activeTab.value = 'manual'
      form.name = props.editData.name || ''
      form.code = props.editData.code || ''
      form.platform = props.editData.platform || 'qq'
      form.wxid = props.editData.wxid || props.editData.openid || ''
      wxAccountName.value = props.editData.name || ''
    }
    else {
      activeTab.value = wxLoginStore.config.enabled ? 'wx' : 'manual'
      form.name = ''
      form.code = ''
      form.platform = 'qq'
      form.wxid = ''
      wxAccountName.value = ''
    }
  }
  else {
    stopWxCheck()
    wxLoginStore.resetState()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'wx') {
    loadWxQRCode()
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="max-h-[90vh] max-w-md w-full overflow-hidden border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] shadow-xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
        <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
          {{ editData ? '编辑账号' : '添加账号' }}
        </h3>
        <BaseButton variant="ghost" class="!p-1" @click="close">
          <div class="i-carbon-close text-xl text-[var(--text-secondary)]" />
        </BaseButton>
      </div>

      <div class="max-h-[calc(90vh-80px)] overflow-y-auto p-4">
        <!-- 错误信息 -->
        <div v-if="errorMessage" class="mb-4 rounded-lg bg-[var(--status-error)]/10 p-3 text-sm text-[var(--status-error)]">
          {{ errorMessage }}
        </div>

        <!-- Tabs -->
        <div class="mb-4 flex border-b border-[var(--border-subtle)]">
          <button
            v-if="editData || !wxLoginStore.config.enabled"
            class="flex-1 py-2 text-center text-sm font-medium transition-colors"
            :class="activeTab === 'manual' ? 'border-b-2' : 'opacity-60'"
            :style="{
              color: activeTab === 'manual' ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: 'var(--accent)',
            }"
            @click="activeTab = 'manual'"
          >
            手动填码
          </button>
          <button
            v-if="wxLoginStore.config.enabled"
            class="flex-1 py-2 text-center text-sm font-medium transition-colors"
            :class="activeTab === 'wx' ? 'border-b-2' : 'opacity-60'"
            :style="{
              color: activeTab === 'wx' ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: 'var(--accent)',
            }"
            @click="activeTab = 'wx'"
          >
            微信扫码
          </button>
        </div>

        <!-- 微信扫码 Tab -->
        <div v-if="activeTab === 'wx'" class="space-y-4">
          <BaseInput
            v-model="wxAccountName"
            label="账号备注（可选）"
            placeholder="留空使用微信昵称"
          />

          <div class="flex flex-col items-center justify-center py-4 space-y-4">
            <div
              v-if="wxQrImageSrc"
              class="border border-[var(--border-default)] rounded-lg bg-[var(--surface-elevated)] p-2"
            >
              <img :src="wxQrImageSrc" class="h-48 w-48">
            </div>
            <div
              v-else
              class="h-48 w-48 flex items-center justify-center rounded-lg bg-[var(--surface-hover)]"
            >
              <div v-if="wxLoginStore.isLoading" i-svg-spinners-90-ring-with-bg class="text-3xl text-[var(--accent)]" />
              <span v-else class="text-sm text-[var(--text-muted)]">点击获取二维码</span>
            </div>

            <p class="text-center text-sm text-[var(--text-secondary)]">
              {{ wxLoginStore.statusMessage }}
            </p>

            <p v-if="wxLoginStore.errorMessage" class="text-center text-sm text-[var(--status-error)]">
              {{ wxLoginStore.errorMessage }}
            </p>

            <BaseButton variant="secondary" size="sm" :loading="wxLoginStore.isLoading" @click="loadWxQRCode">
              刷新二维码
            </BaseButton>
          </div>

          <div class="text-center text-xs text-[var(--text-muted)]">
            使用微信扫描二维码登录，登录成功后将自动添加账号
          </div>
        </div>

        <!-- 手动填码 Tab -->
        <div v-if="activeTab === 'manual'" class="space-y-4">
          <BaseInput
            v-model="form.name"
            label="账号备注（可选）"
            placeholder="留空默认账号"
          />

          <BaseTextarea
            v-model="form.code"
            label="Code"
            placeholder="请输入登录 Code"
            :rows="3"
          />

          <BaseInput
            v-if="form.platform === 'wx'"
            v-model="form.wxid"
            label="微信 OpenID（免扫码刷新 Code 用）"
            placeholder="粘贴 yyb-go 账号列表中的 openid"
          />

          <div v-if="!editData" class="flex gap-4">
            <label class="flex cursor-pointer items-center gap-2">
              <input
                v-model="form.platform"
                type="radio"
                value="qq"
                class="h-4 w-4"
                :style="{ accentColor: 'var(--accent)' }"
              >
              <span class="text-sm text-[var(--text-secondary)]">QQ小程序</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2">
              <input
                v-model="form.platform"
                type="radio"
                value="wx"
                class="h-4 w-4"
                :style="{ accentColor: 'var(--accent)' }"
              >
              <span class="text-sm text-[var(--text-secondary)]">微信小程序</span>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <BaseButton variant="outline" @click="close">
              取消
            </BaseButton>
            <BaseButton variant="primary" :loading="loading" @click="submitManual">
              {{ editData ? '保存' : '添加' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
