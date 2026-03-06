<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const canSubmit = computed(() => {
  return username.value.trim() !== '' && password.value.length >= 6 && !loading.value
})

async function onSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true
  try {
    // 占位：后续接入真实登录 API
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (username.value && password.value) {
      localStorage.setItem('buildguard-user', username.value.trim())
      router.replace('/')
    } else {
      error.value = '请输入用户名和密码'
    }
  } catch {
    error.value = '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    class="login-section mx-auto flex min-h-screen w-full max-w-[430px] flex-col"
  >
    <div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <!-- Logo 与标题 -->
      <div class="mb-10 flex flex-col items-center gap-4">
        <div
          class="h-14 w-14 flex-shrink-0 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-md"
          title="BuildGuard"
        />
        <div class="text-center">
          <h1 class="text-xl font-semibold text-[#171717] dark:text-[#E5E5E5]">BuildGuard</h1>
          <p class="mt-1 text-[13px] text-[#5C5C5C] dark:text-[#A3A3A3]">登录以继续使用</p>
        </div>
      </div>

      <!-- 登录卡片 -->
      <div
        class="card-shadow w-full overflow-hidden rounded-xl bg-white p-4 dark:bg-[#262626]"
      >
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div>
            <label
              for="username"
              class="mb-1.5 block text-[13px] font-medium text-[#171717] dark:text-[#E5E5E5]"
            >
              用户名
            </label>
            <div
              class="flex items-center gap-2 rounded-lg border border-[#EBEBEB] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#404040]"
            >
              <i class="ri-user-line text-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]" />
              <input
                id="username"
                v-model="username"
                type="text"
                autocomplete="username"
                placeholder="请输入用户名"
                class="min-w-0 flex-1 bg-transparent text-[15px] text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none dark:text-[#E5E5E5] dark:placeholder:text-[#737373]"
              />
            </div>
          </div>

          <div>
            <label
              for="password"
              class="mb-1.5 block text-[13px] font-medium text-[#171717] dark:text-[#E5E5E5]"
            >
              密码
            </label>
            <div
              class="flex items-center gap-2 rounded-lg border border-[#EBEBEB] bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#404040]"
            >
              <i class="ri-lock-line text-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]" />
              <input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="请输入密码（至少 6 位）"
                class="min-w-0 flex-1 bg-transparent text-[15px] text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none dark:text-[#E5E5E5] dark:placeholder:text-[#737373]"
              />
            </div>
          </div>

          <p
            v-if="error"
            class="flex items-center gap-1.5 text-[13px] text-red-500 dark:text-red-400"
          >
            <i class="ri-error-warning-line text-[16px]" />
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-medium transition-colors disabled:opacity-50"
            :class="
              canSubmit
                ? 'bg-brand-500 text-white active:bg-brand-400'
                : 'cursor-not-allowed bg-[#E5E5E5] text-[#737373] dark:bg-[#404040] dark:text-[#A3A3A3]'
            "
          >
            <i
              v-if="loading"
              class="ri-loader-4-line animate-spin text-[20px]"
            />
            <span>{{ loading ? '登录中…' : '登录' }}</span>
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 与首页进行中/待进行任务容器阴影一致 */
.card-shadow {
  box-shadow:
    0px 0px 0px 1px rgba(23, 23, 23, 0.08),
    0px 1px 1px -0.5px rgba(23, 23, 23, 0.04),
    0px 3px 3px -1.5px rgba(23, 23, 23, 0.04),
    0px 6px 6px -3px rgba(23, 23, 23, 0.04),
    0px 10px 10px -5px rgba(23, 23, 23, 0.04),
    0px 20px 20px -10px rgba(23, 23, 23, 0.04),
    inset 0px -1px 1px -0.5px rgba(23, 23, 23, 0.06);
}
.dark .card-shadow {
  box-shadow:
    0px 0px 0px 1px rgba(255, 255, 255, 0.08),
    0px 1px 1px -0.5px rgba(0, 0, 0, 0.2),
    0px 3px 3px -1.5px rgba(0, 0, 0, 0.18),
    0px 6px 6px -3px rgba(0, 0, 0, 0.16),
    0px 10px 10px -5px rgba(0, 0, 0, 0.14),
    0px 20px 20px -10px rgba(0, 0, 0, 0.12),
    inset 0px -1px 1px -0.5px rgba(255, 255, 255, 0.04);
}
</style>
