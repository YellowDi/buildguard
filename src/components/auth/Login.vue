<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DEMO_USERS, authenticateDemoUser, resolveHomePath, saveSession, type DemoUser } from '../../auth/session'

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
    await new Promise((resolve) => setTimeout(resolve, 300))
    const user = authenticateDemoUser(username.value, password.value)
    if (!user) {
      error.value = '账号或密码错误，请使用下方测试账号或快捷登录。'
      return
    }
    saveSession(user)
    router.replace(resolveHomePath(user.role))
  } catch {
    error.value = '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function onQuickLogin(user: DemoUser) {
  if (loading.value) return
  error.value = ''
  saveSession(user)
  router.replace(resolveHomePath(user.role))
}
</script>

<template>
  <section
    class="login-section mx-auto flex min-h-screen w-full max-w-[430px] flex-col"
  >
    <div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <!-- Logo 与标题 -->
      <div class="mb-10 flex flex-col items-center gap-4">
        <img
          src="/temp_logo.png"
          alt="BuildGuard logo"
          class="h-14 w-14 flex-shrink-0 rounded-xl object-contain shadow-md"
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

        <div class="mt-4 rounded-xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-3 dark:border-white/10 dark:bg-[#1F1F1F]">
          <div>
            <div>
              <p class="text-[13px] font-medium text-[#171717] dark:text-[#E5E5E5]">快捷登录</p>
              <p class="mt-1 text-[12px] leading-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                临时测试入口。检修身份可查看检测数据；维修身份按工种查看对应维修任务。
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-col gap-2">
            <button
              v-for="user in DEMO_USERS"
              :key="user.id"
              type="button"
              class="flex w-full items-start justify-between rounded-xl border border-[#EBEBEB] bg-white px-3 py-3 text-left transition-colors active:bg-black/[0.03] dark:border-white/10 dark:bg-[#262626] dark:active:bg-white/5"
              @click="onQuickLogin(user)"
            >
              <div class="flex min-w-0 items-start gap-3">
                <img
                  :src="user.avatarUrl"
                  :alt="`${user.displayName} avatar`"
                  class="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                  <span class="text-[14px] font-medium text-[#171717] dark:text-[#E5E5E5]">
                    {{ user.displayName }}
                  </span>
                  <span class="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#5C5C5C] dark:bg-[#404040] dark:text-[#A3A3A3]">
                    {{ user.roleLabel }}
                  </span>
                  <span
                    v-if="user.specialtyLabel"
                    class="rounded-full bg-[#EEF6FF] px-2 py-0.5 text-[11px] font-medium text-[#006ADC] dark:bg-[#0E2847] dark:text-[#7DB9FF]"
                  >
                    {{ user.specialtyLabel }}
                  </span>
                  </div>
                  <p class="mt-1 text-[12px] leading-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                    {{ user.description }}
                  </p>
                  <p class="mt-1 text-[11px] leading-[16px] text-[#737373] dark:text-[#737373]">
                    账号 {{ user.username }} / 密码 {{ user.password }}
                  </p>
                </div>
              </div>
              <i class="ri-arrow-right-line mt-0.5 text-[16px] text-[#A3A3A3]" />
            </button>
          </div>
        </div>
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
