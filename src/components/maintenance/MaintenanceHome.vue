<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserCard from '../user/UserCard.vue'
import { getStoredSession } from '../../auth/session'
import { fetchMaintenanceTaskList } from '../../api/maintenance'
import type { MaintenanceTask, MaintenanceTaskSection, MaintenanceTrade } from '../../types/maintenance'
import PlannedMaintenanceDrawer from './PlannedMaintenanceDrawer.vue'

const router = useRouter()
const currentSession = getStoredSession()

const currentUserName = computed(() => currentSession?.displayName || '李电工')
const currentUserAvatar = computed(() => currentSession?.avatarUrl || '/avatar-maintainer-default.png')
const currentTrade = computed<MaintenanceTrade>(() => currentSession?.specialty || 'electric')
const currentTradeLabel = computed(() => currentSession?.specialtyLabel || '电工')

const sections = ref<MaintenanceTaskSection[]>([])
const loading = ref(true)
const errorMessage = ref('')
const showParkFilter = ref(false)
const showPlannedDrawer = ref(false)
const selectedPark = ref<string | null>(null)
const filterBtnRef = ref<HTMLElement | null>(null)

const activeSection = computed(() => sections.value.find((section) => section.key === 'active'))
const pendingSection = computed(() => sections.value.find((section) => section.key === 'pending'))
const completedSection = computed(() => sections.value.find((section) => section.key === 'completed'))
const completedCount = computed(() => completedSection.value?.tasks.length ?? 0)
const plannedTasks = computed(() => {
  const active = activeSection.value?.tasks ?? []
  const pending = pendingSection.value?.tasks ?? []
  return [...active, ...pending]
})
const parkNames = computed(() => {
  const tasks = completedSection.value?.tasks ?? []
  return [...new Set(tasks.map((task) => task.parkName))]
})
const filteredCompletedTasks = computed(() => {
  const tasks = completedSection.value?.tasks ?? []
  if (!selectedPark.value) return tasks
  return tasks.filter((task) => task.parkName === selectedPark.value)
})

function toggleParkFilter() {
  showParkFilter.value = !showParkFilter.value
}

function selectPark(park: string | null) {
  selectedPark.value = park
  showParkFilter.value = false
}

function statusLabel(task: MaintenanceTask) {
  switch (task.status) {
    case 'active': return task.deadline || '处理中'
    case 'pending': return '待接单'
    case 'completed': return '已完成'
  }
}

function statusIcon(task: MaintenanceTask) {
  switch (task.status) {
    case 'active': return 'ri-loader-2-line'
    case 'pending': return 'ri-time-line'
    case 'completed': return 'ri-checkbox-circle-fill'
  }
}

function statusIconColor(task: MaintenanceTask) {
  switch (task.status) {
    case 'active': return 'text-[#171717] dark:text-[#E5E5E5]'
    case 'pending': return 'text-[#FA7319]'
    case 'completed': return 'text-[#1FC16B]'
  }
}

function onClickOutside(e: MouseEvent) {
  if (!showParkFilter.value) return
  const target = e.target as Node
  const popover = document.querySelector('.park-filter-popover')
  if (filterBtnRef.value?.contains(target) || popover?.contains(target)) return
  showParkFilter.value = false
}

function openDetail(taskId: number) {
  router.push(`/maintenance/task/${taskId}`)
}

function taskSummary(task: MaintenanceTask) {
  const buildingCount = task.buildingCount ?? 1
  const issueCount = task.issueCount ?? 1
  return `${buildingCount} 栋建筑 · ${issueCount} 个问题`
}

async function loadMaintenanceTasks() {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await fetchMaintenanceTaskList(currentTrade.value)
    sections.value = data.sections
  } catch {
    sections.value = []
    errorMessage.value = '维修任务加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside, true)
  await loadMaintenanceTasks()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
})
</script>

<template>
  <section class="task-section mx-auto flex h-screen w-full max-w-[430px] flex-col">
    <div class="flex flex-1 flex-col overflow-y-auto pb-4">
      <div class="flex items-center justify-between px-4 pt-3">
        <div class="min-w-0 flex flex-1 items-center gap-2">
          <img
            src="/temp_logo.png"
            alt="BuildGuard logo"
            class="h-10 w-10 flex-shrink-0 rounded-lg object-contain shadow-sm"
            title="BuildGuard"
          />
          <span class="truncate text-base font-semibold text-[#171717] dark:text-[#E5E5E5]">
            BuildGuard
          </span>
        </div>
        <UserCard :name="currentUserName" :avatar-url="currentUserAvatar" :completed-count="completedCount" />
      </div>

      <div v-if="loading" class="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <i class="ri-loader-4-line animate-spin text-[30px] text-[#A3A3A3]" />
        <p class="mt-2 text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">正在加载维修任务…</p>
      </div>

      <div v-else-if="errorMessage" class="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <i class="ri-error-warning-line text-[30px] text-[#E5484D]" />
        <p class="mt-2 text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ errorMessage }}</p>
        <button
          type="button"
          class="btn-base btn-primary mt-4 h-10 px-4 text-[14px] leading-[20px]"
          @click="loadMaintenanceTasks"
        >
          重试
        </button>
      </div>

      <div v-else-if="sections.every((section) => section.tasks.length === 0)" class="px-4 pt-4">
        <div class="card-shadow rounded-xl bg-white p-4 dark:bg-[#262626]">
          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-1 text-[12px] font-medium text-[#5C5C5C] dark:bg-[#404040] dark:text-[#A3A3A3]">
              维修身份
            </div>
            <div class="inline-flex items-center rounded-full bg-[#EEF6FF] px-2 py-1 text-[12px] font-medium text-[#006ADC] dark:bg-[#0E2847] dark:text-[#7DB9FF]">
              {{ currentTradeLabel }}
            </div>
          </div>
          <h1 class="mt-3 text-[18px] font-semibold leading-[26px] text-[#171717] dark:text-[#E5E5E5]">
            维修任务工作台
          </h1>
          <p class="mt-2 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
            维修工单由检修异常项派发而来，当前账号仅展示{{ currentTradeLabel }}相关任务。
          </p>
        </div>

        <div class="card-shadow mt-4 flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-white px-6 py-10 text-center dark:bg-[#262626]">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F5] dark:bg-[#404040]">
            <i class="ri-tools-line text-[28px] text-[#5C5C5C] dark:text-[#A3A3A3]" />
          </div>
          <h2 class="mt-4 text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
            暂无{{ currentTradeLabel }}维修任务
          </h2>
          <p class="mt-2 max-w-[240px] text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
            当前没有分配给{{ currentTradeLabel }}的维修任务，你可以稍后刷新或切换其他演示账号查看。
          </p>
        </div>
      </div>

      <template v-else>
        <div class="flex flex-col items-center px-4 pb-4 pt-4">
          <div class="card-shadow w-full overflow-hidden rounded-xl bg-white dark:bg-[#262626]">
            <div
              v-for="(task, index) in activeSection?.tasks"
              :key="task.id"
              class="cursor-pointer px-4"
              @click="openDetail(task.id)"
            >
                <div class="flex flex-col gap-4 py-4" :class="index > 0 ? 'border-t border-[#EBEBEB] dark:border-white/10' : ''">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <span class="block text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                        {{ task.parkName }}
                      </span>
                      <span class="block text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                        {{ taskSummary(task) }}
                      </span>
                    </div>
                    <div class="task-status-chip">
                      <i :class="[statusIcon(task), 'text-[16px] leading-[16px]', statusIconColor(task)]" />
                      <span class="task-status-text">{{ statusLabel(task) }}</span>
                    </div>
                  </div>

                <button
                  type="button"
                  class="btn-base btn-primary h-10 w-full px-4 text-[14px] leading-[20px]"
                  @click.stop="openDetail(task.id)"
                >
                  查看维修详情
                </button>
              </div>
            </div>

            <div class="segment-divider" />

            <div class="bg-[rgba(0,0,0,0.05)] dark:bg-white/[0.06]">
              <div
                v-for="(task, index) in pendingSection?.tasks"
                :key="task.id"
                class="cursor-pointer px-4 transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
                @click="openDetail(task.id)"
              >
                <div class="flex flex-col gap-3 py-4" :class="index > 0 ? 'border-t border-[#EBEBEB] dark:border-white/10' : ''">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <span class="block text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                        {{ task.parkName }}
                      </span>
                      <span class="block text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                        {{ taskSummary(task) }}
                      </span>
                    </div>
                    <div class="task-status-chip">
                      <i :class="[statusIcon(task), 'text-[16px] leading-[16px]', statusIconColor(task)]" />
                      <span class="task-status-text">{{ statusLabel(task) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-[#EBEBEB] dark:border-white/10 p-4">
              <button
                type="button"
                class="btn-base btn-surface h-10 w-full px-4 text-[14px] leading-[20px]"
                @click="showPlannedDrawer = true"
              >
                <span>查看更多计划维修任务</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-end px-4 pt-1">
          <div class="flex flex-1 items-center pb-[9px] pt-2">
            <span class="text-[17px] font-semibold leading-[22px] text-[rgba(60,60,67,0.6)] dark:text-[#A3A3A3]">
              维修记录
            </span>
            <div class="relative ml-auto">
              <button
                ref="filterBtnRef"
                type="button"
                class="flex items-center gap-1 rounded-full px-2 py-1 transition-colors"
                :class="selectedPark ? 'bg-[#171717] dark:bg-[#E5E5E5] text-white dark:text-[#171717]' : 'text-[rgba(60,60,67,0.6)] dark:text-[#A3A3A3]'"
                @click="toggleParkFilter"
              >
                <i class="ri-filter-3-line text-[16px] leading-[16px]" />
                <span v-if="selectedPark" class="max-w-[100px] truncate text-[12px] font-medium leading-[16px]">{{ selectedPark }}</span>
                <span v-else class="text-[12px] font-medium leading-[16px]">筛选</span>
              </button>
              <Transition name="filter-pop">
                <div
                  v-if="showParkFilter"
                  class="park-filter-popover absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden whitespace-nowrap rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 dark:bg-[#262626] dark:ring-white/10"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] leading-[20px] transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-white/10"
                    :class="!selectedPark ? 'font-medium text-[#171717] dark:text-[#E5E5E5]' : 'text-[#5C5C5C] dark:text-[#A3A3A3]'"
                    @click="selectPark(null)"
                  >
                    <i
                      class="ri-checkbox-circle-fill text-[16px] leading-[16px]"
                      :class="!selectedPark ? 'text-[#171717] dark:text-[#E5E5E5]' : 'invisible'"
                    />
                    <span>全部园区</span>
                  </button>
                  <button
                    v-for="park in parkNames"
                    :key="park"
                    type="button"
                    class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] leading-[20px] transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-white/10"
                    :class="selectedPark === park ? 'font-medium text-[#171717] dark:text-[#E5E5E5]' : 'text-[#5C5C5C] dark:text-[#A3A3A3]'"
                    @click="selectPark(park)"
                  >
                    <i
                      class="ri-checkbox-circle-fill text-[16px] leading-[16px]"
                      :class="selectedPark === park ? 'text-[#171717] dark:text-[#E5E5E5]' : 'invisible'"
                    />
                    <span>{{ park }}</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div v-if="completedSection?.tasks.length" class="px-4 pb-4">
          <div class="w-full overflow-hidden rounded-xl">
            <div
              v-for="(task, index) in filteredCompletedTasks"
              :key="task.id"
              class="cursor-pointer transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.06]"
              @click="openDetail(task.id)"
            >
              <div class="flex items-center py-4" :class="index > 0 ? 'border-t border-black/[0.08] dark:border-white/10' : ''">
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                  <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                    {{ task.parkName }}
                  </span>
                  <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                    {{ taskSummary(task) }}
                  </span>
                </div>
                <div class="task-status-chip">
                  <i :class="[statusIcon(task), 'text-[16px] leading-[16px]', statusIconColor(task)]" />
                  <span class="task-status-text">{{ statusLabel(task) }}</span>
                </div>
              </div>
            </div>
            <div
              v-if="filteredCompletedTasks.length === 0"
              class="py-5 text-center text-[13px] text-[#A3A3A3]"
            >
              当前筛选下暂无维修记录
            </div>
          </div>
        </div>
      </template>
    </div>

    <PlannedMaintenanceDrawer
      :visible="showPlannedDrawer"
      :tasks="plannedTasks"
      @close="showPlannedDrawer = false"
    />
  </section>
</template>

<style>
.task-section {
  background-color: #EBEBEB;
}

.dark .task-section {
  background-color: #171717;
}
</style>

<style scoped>
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

.segment-divider {
  height: 1px;
  background-image: repeating-linear-gradient(
    to right,
    rgba(0, 0, 0, 0.1) 0,
    rgba(0, 0, 0, 0.1) 4px,
    transparent 4px,
    transparent 8px
  );
}

.filter-pop-enter-active,
.filter-pop-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
  transform-origin: top right;
}
.filter-pop-enter-from,
.filter-pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
