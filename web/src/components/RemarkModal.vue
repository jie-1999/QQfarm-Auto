<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const props = defineProps<{
  show: boolean
  account?: any
}>()

const emit = defineEmits(['close', 'saved'])

const name = ref('')
const loading = ref(false)
const errorMessage = ref('')

watch(() => props.show, (val) => {
  errorMessage.value = ''
  if (val && props.account) {
    name.value = props.account.name || ''
  }
})

async function save() {
  if (!props.account)
    return
  loading.value = true
  errorMessage.value = ''
  try {
    const payload = {
      id: props.account.id,
      name: name.value,
    }

    const res = await api.post('/api/accounts', payload)
    if (res.data.ok) {
      emit('saved')
      emit('close')
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
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="max-w-sm w-full overflow-hidden border border-[var(--border-default)] rounded-xl bg-[var(--surface-elevated)] shadow-lg">
      <div class="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
        <h3 class="text-lg text-[var(--text-primary)] font-semibold tracking-tight">
          修改备注
        </h3>
        <BaseButton variant="ghost" class="!p-1" @click="$emit('close')">
          <div class="i-carbon-close text-xl" />
        </BaseButton>
      </div>

      <div class="p-4 space-y-4">
        <div v-if="errorMessage" class="rounded-lg bg-[var(--status-error)]/10 p-3 text-sm text-[var(--status-error)]">
          {{ errorMessage }}
        </div>
        <BaseInput
          v-model="name"
          label="备注名称"
          placeholder="请输入备注名称"
          @keyup.enter="save"
        />

        <div class="flex justify-end gap-2">
          <BaseButton
            variant="outline"
            @click="$emit('close')"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            :loading="loading"
            @click="save"
          >
            保存
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
