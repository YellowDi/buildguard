<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TaskSection } from '../../types/task'
import { fetchTaskList } from '../../api/task'
import UserCard from '../user/UserCard.vue'
import PlannedTaskDrawer from './PlannedTaskDrawer.vue'

const route = useRoute()
const router = useRouter()

const sections = ref<TaskSection[]>([])

const activeSection = computed(() => sections.value.find(s => s.key === 'active'))
const pendingSection = computed(() => sections.value.find(s => s.key === 'pending'))
const completedSection = computed(() => sections.value.find(s => s.key === 'completed'))
const completedCount = computed(() => completedSection.value?.tasks.length ?? 0)

const scrollEl = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const isStuck = ref(false)

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

onMounted(async () => {
  const data = await fetchTaskList()
  sections.value = data.sections

  document.addEventListener('click', onClickOutside, true)

  await nextTick()
  if (sentinel.value && scrollEl.value) {
    observer = new IntersectionObserver(
      ([entry]) => { isStuck.value = !entry.isIntersecting },
      { root: scrollEl.value, threshold: 0 }
    )
    observer.observe(sentinel.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
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
        <div class="min-w-0 flex-1" />
        <UserCard name="黄某某" :completed-count="completedCount" />
      </div>

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
                  <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] dark:border-white/10 bg-white dark:bg-[#404040] px-1 py-1">
                    <i class="ri-loader-2-line text-[16px] leading-[16px] text-[#171717] dark:text-[#E5E5E5]" />
                    <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">
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
                class="flex w-full items-center justify-center rounded-lg bg-[#262626] dark:bg-[#E5E5E5] py-2"
                @click.stop="router.push(`/task/${task.id}`)"
              >
                <span class="text-[14px] font-medium leading-[20px] text-white dark:text-[#171717]">开始巡检</span>
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
                  <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] dark:border-white/10 bg-white dark:bg-[#404040] px-1 py-1">
                    <i class="ri-time-fill text-[16px] leading-[16px] text-[#FA7319]" />
                    <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">待完成</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- View More Button Area -->
          <div class="border-t border-[#EBEBEB] dark:border-white/10 p-4">
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg bg-[rgba(0,0,0,0.05)] dark:bg-white/[0.08] py-2"
              @click="showPlannedDrawer = true"
            >
              <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">查看更多计划任务</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sentinel for sticky detection -->
      <div ref="sentinel" class="h-0 w-0" aria-hidden="true" />

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

      <!-- Completed Tasks (no card background, no shadow) -->
      <div class="flex flex-col items-center px-4 pb-4">
        <div class="w-full overflow-hidden rounded-xl">
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
              <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] dark:border-white/10 bg-white dark:bg-[#404040] px-1 py-1">
                <i class="ri-checkbox-circle-fill text-[16px] leading-[16px] text-[#1FC16B]" />
                <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">已完成</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
