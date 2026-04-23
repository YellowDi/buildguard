<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { TaskSection } from '../../types/task'
import { fetchTaskList } from '../../api/task'
import UserCard from '../user/UserCard.vue'
import PlannedTaskDrawer from './PlannedTaskDrawer.vue'
import { getStoredSession } from '../../auth/session'

const router = useRouter()

const sections = ref<TaskSection[]>([])
const loading = ref(true)
const errorMessage = ref('')

const activeSection = computed(() => sections.value.find(s => s.key === 'active'))
const pendingSection = computed(() => sections.value.find(s => s.key === 'pending'))
const completedSection = computed(() => sections.value.find(s => s.key === 'completed'))
const completedCount = computed(() => completedSection.value?.tasks.length ?? 0)
const currentUserName = ref('张检修')
const currentUserAvatar = ref('/avatar-inspector-default.png')
const isEmptyDemo = ref(false)

const scrollEl = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const archiveSentinel = ref<HTMLElement | null>(null)
const isStuck = ref(false)
/** 归档区域是否进入视口，用于懒渲染以减轻首屏压力 */
const archivedInView = ref(false)

const showParkFilter = ref(false)
const showPlannedDrawer = ref(false)
const selectedPark = ref<string | null>(null)
const filterBtnRef = ref<HTMLElement | null>(null)

const parkNames = computed(() => {
  const tasks = completedSection.value?.tasks ?? []
  return [...new Set(tasks.map(t => t.parkName))]
})

const plannedTasks = computed(() => {
  const active = activeSection.value?.tasks ?? []
  const pending = pendingSection.value?.tasks ?? []
  return [...active, ...pending]
})

const filteredCompletedTasks = computed(() => {
  const tasks = completedSection.value?.tasks ?? []
  if (!selectedPark.value) return tasks
  return tasks.filter(t => t.parkName === selectedPark.value)
})

function toggleParkFilter() {
  showParkFilter.value = !showParkFilter.value
}

function selectPark(park: string | null) {
  selectedPark.value = park
  showParkFilter.value = false
}

function onClickOutside(e: MouseEvent) {
  if (!showParkFilter.value) return
  const target = e.target as Node
  const popover = document.querySelector('.park-filter-popover')
  if (
    filterBtnRef.value?.contains(target) ||
    popover?.contains(target)
  ) return
  showParkFilter.value = false
}

let observer: IntersectionObserver | null = null
let archiveObserver: IntersectionObserver | null = null

function setupObservers() {
  observer?.disconnect()
  archiveObserver?.disconnect()
  observer = null
  archiveObserver = null
  isStuck.value = false
  archivedInView.value = false

  if (!sentinel.value || !scrollEl.value) return
  observer = new IntersectionObserver(
    ([entry]) => { isStuck.value = !entry.isIntersecting },
    { root: scrollEl.value, threshold: 0 },
  )
  observer.observe(sentinel.value)

  if (!archiveSentinel.value) return
  archiveObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) archivedInView.value = true
    },
    { root: scrollEl.value, rootMargin: '100px 0px', threshold: 0 },
  )
  archiveObserver.observe(archiveSentinel.value)
}

async function loadTaskList() {
  loading.value = true
  errorMessage.value = ''
  selectedPark.value = null
  showParkFilter.value = false

  try {
    const session = getStoredSession()
    if (session?.demoMode === 'empty') {
      sections.value = []
      return
    }
    const data = await fetchTaskList()
    sections.value = data.sections
  } catch {
    sections.value = []
    errorMessage.value = '任务列表加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
  await nextTick()
  setupObservers()
}

onMounted(async () => {
  const session = getStoredSession()
  currentUserName.value = session?.displayName || '张检修'
  currentUserAvatar.value = session?.avatarUrl || '/avatar-inspector-default.png'
  isEmptyDemo.value = session?.demoMode === 'empty'
  document.addEventListener('click', onClickOutside, true)
  await loadTaskList()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  archiveObserver?.disconnect()
  document.removeEventListener('click', onClickOutside, true)
})
</script>

<template>
  <section
    class="task-section mx-auto flex h-screen w-full max-w-[430px] flex-col"
  >
    <!-- Scrollable Content -->
    <div ref="scrollEl" class="flex flex-1 flex-col overflow-y-auto pb-4">

      <!-- 顶部：左侧 logo 位，右侧用户卡片 -->
      <div class="flex items-center justify-between px-4 pt-3">
        <div class="min-w-0 flex-1 flex items-center gap-2">
          <img
            src="/temp_logo.png"
            alt="BuildGuard logo"
            class="h-10 w-10 flex-shrink-0 rounded-lg object-contain shadow-sm"
            title="BuildGuard"
          />
          <span class="text-base font-semibold text-[#171717] dark:text-[#E5E5E5] truncate">BuildGuard</span>
        </div>
        <UserCard :name="currentUserName" :avatar-url="currentUserAvatar" :completed-count="completedCount" />
      </div>

      <div v-if="loading" class="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <i class="ri-loader-4-line animate-spin text-[30px] text-[#A3A3A3]" />
        <p class="mt-2 text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">正在加载任务列表…</p>
      </div>

      <div v-else-if="errorMessage" class="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <i class="ri-error-warning-line text-[30px] text-[#E5484D]" />
        <p class="mt-2 text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ errorMessage }}</p>
        <button
          type="button"
          class="btn-base btn-primary mt-4 h-10 px-4 text-[14px] leading-[20px]"
          @click="loadTaskList"
        >
          重试
        </button>
      </div>

      <div v-else-if="sections.length === 0" class="px-4 pt-4">
        <div class="card-shadow rounded-xl bg-white p-4 dark:bg-[#262626]">
          <div class="inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-1 text-[12px] font-medium text-[#5C5C5C] dark:bg-[#404040] dark:text-[#A3A3A3]">
            检修身份
          </div>
          <h1 class="mt-3 text-[18px] font-semibold leading-[26px] text-[#171717] dark:text-[#E5E5E5]">
            检修任务工作台
          </h1>
          <p class="mt-2 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
            {{ isEmptyDemo
              ? '当前账号专用于空状态样式演示，方便确认检修工作台在无任务时的布局和文案表现。'
              : '当前暂无可处理的检修任务，后续接入新任务后会在这里展示待处理、进行中和已完成数据。'
            }}
          </p>
        </div>

        <div class="card-shadow mt-4 flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-white px-6 py-10 text-center dark:bg-[#262626]">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F5] dark:bg-[#404040]">
            <i class="ri-survey-line text-[28px] text-[#5C5C5C] dark:text-[#A3A3A3]" />
          </div>
          <h2 class="mt-4 text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
            暂无检修任务
          </h2>
          <p class="mt-2 max-w-[240px] text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
            {{ isEmptyDemo
              ? '这是检修身份的空状态演示账号。后续如果接入新的检修任务数据，这里会替换为真实任务列表与处理入口。'
              : '当前没有检修任务需要处理。你可以稍后刷新，或切换到其他演示账号查看已有任务数据。'
            }}
          </p>
        </div>
      </div>

      <template v-else>
      <!-- Combined Active + Pending Card -->
      <div class="flex flex-col items-center px-4 pb-4 pt-0">
        <div class="card-shadow w-full overflow-hidden rounded-xl bg-white dark:bg-[#262626]">
          <!-- Active Tasks -->
          <div
            v-for="(task, index) in activeSection?.tasks"
            :key="task.id"
            class="cursor-pointer px-4"
            @click="router.push(`/task/${task.id}`)"
          >
            <div
              class="flex flex-col gap-4 py-4"
              :class="index > 0 ? 'border-t border-[#EBEBEB] dark:border-white/10' : ''"
            >
              <div class="flex flex-col">
                <div class="flex items-center">
                  <div class="flex min-w-0 flex-1 flex-col justify-center">
                    <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                      {{ task.parkName }}
                    </span>
                    <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                      {{ task.taskName }}
                    </span>
                  </div>
                  <div class="task-status-chip">
                    <i class="ri-loader-2-line text-[16px] leading-[16px] text-[#171717] dark:text-[#E5E5E5]" />
                    <span class="task-status-text">
                      {{ task.deadline }}
                    </span>
                  </div>
                </div>
                <span v-if="task.address" class="truncate text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                  {{ task.address }}
                </span>
              </div>
              <button
                type="button"
                class="btn-base btn-primary h-10 w-full px-4 text-[14px] leading-[20px]"
                @click.stop="router.push(`/task/${task.id}`)"
              >
                <span>开始检测</span>
              </button>
            </div>
          </div>

          <!-- Segment Divider -->
          <div class="segment-divider" />

          <!-- Pending Tasks Section (lighter background) -->
          <div class="bg-[rgba(0,0,0,0.05)] dark:bg-white/[0.06]">
            <div
              v-for="(task, index) in pendingSection?.tasks"
              :key="task.id"
              class="cursor-pointer px-4 transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
              @click="router.push(`/task/${task.id}`)"
            >
              <div
                class="flex flex-col py-4"
                :class="index > 0 ? 'border-t border-[#EBEBEB] dark:border-white/10' : ''"
              >
                <div class="flex items-center">
                  <div class="flex min-w-0 flex-1 flex-col justify-center">
                    <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                      {{ task.parkName }}
                    </span>
                    <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                      {{ task.taskName }}
                    </span>
                  </div>
                  <div class="task-status-chip">
                    <i class="ri-time-fill text-[16px] leading-[16px] text-[#FA7319]" />
                    <span class="task-status-text">待完成</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- View More Button Area -->
          <div class="border-t border-[#EBEBEB] dark:border-white/10 p-4">
            <button
              type="button"
              class="btn-base btn-surface h-10 w-full px-4 text-[14px] leading-[20px]"
              @click="showPlannedDrawer = true"
            >
              <span>查看更多计划任务</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sentinel for sticky detection -->
      <div ref="sentinel" class="h-0 w-0" aria-hidden="true" />

      <!-- 归档懒加载：进入视口才渲染列表 -->
      <div ref="archiveSentinel" class="h-0 w-0" aria-hidden="true" />

      <!-- Archived Section Title (sticky) -->
      <div
        class="task-sticky sticky top-0 z-10 flex items-end px-4"
        :class="{ 'is-stuck': isStuck }"
      >
        <div class="flex flex-1 items-center pb-[9px] pt-2">
          <span class="text-[17px] font-semibold leading-[22px] text-[rgba(60,60,67,0.6)] dark:text-[#A3A3A3]">
            归档任务
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
                class="park-filter-popover absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden whitespace-nowrap rounded-xl bg-white dark:bg-[#262626] py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
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

      <!-- Completed Tasks：未进入视口显示骨架，进入视口后懒渲染真实列表 -->
      <div class="flex flex-col items-center px-4 pb-4">
        <div class="w-full overflow-hidden rounded-xl">
          <!-- 骨架：与任务行同高同结构，减少布局偏移 -->
          <template v-if="!archivedInView">
            <div
              v-for="i in 5"
              :key="'skeleton-' + i"
              class="flex items-center py-4"
              :class="i > 1 ? 'border-t border-black/[0.08] dark:border-white/10' : ''"
            >
              <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
                <div class="h-5 w-24 rounded bg-black/[0.08] dark:bg-white/15 animate-pulse" />
                <div class="h-4 w-32 rounded bg-black/[0.06] dark:bg-white/10 animate-pulse" />
              </div>
              <div class="h-7 w-16 shrink-0 rounded-[6px] bg-black/[0.08] dark:bg-white/15 animate-pulse" />
            </div>
          </template>
          <template v-else>
            <div
              v-for="(task, index) in filteredCompletedTasks"
              :key="task.id"
              class="cursor-pointer transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.06]"
              @click="router.push(`/task/${task.id}`)"
            >
              <div
                class="flex items-center py-4"
                :class="index > 0 ? 'border-t border-black/[0.08] dark:border-white/10' : ''"
              >
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                  <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                    {{ task.parkName }}
                  </span>
                  <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                    {{ task.taskName }}
                  </span>
                </div>
                <div class="task-status-chip">
                  <i class="ri-checkbox-circle-fill text-[16px] leading-[16px] text-[#1FC16B]" />
                  <span class="task-status-text">已完成</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      </template>

    </div>

    <PlannedTaskDrawer
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

/* 未吸顶时无背景，避免裁掉上方卡片的阴影 */
.task-sticky {
  border-bottom: 1px solid transparent;
  transition: border-color 200ms ease, background-color 200ms ease;
}

.task-sticky.is-stuck {
  background-color: #EBEBEB;
  border-bottom-color: rgba(0, 0, 0, 0.12);
}

.dark .task-sticky.is-stuck {
  background-color: #171717;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}
</style>

<style scoped>
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
</style>
