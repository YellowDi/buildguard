<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { TaskSection } from '../../types/task'
import { fetchTaskList } from '../../api/task'

const sections = ref<TaskSection[]>([])

const activeSection = computed(() => sections.value.find(s => s.key === 'active'))
const pendingSection = computed(() => sections.value.find(s => s.key === 'pending'))
const completedSection = computed(() => sections.value.find(s => s.key === 'completed'))

const scrollEl = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const isStuck = ref(false)

const showParkFilter = ref(false)
const selectedPark = ref<string | null>(null)
const filterBtnRef = ref<HTMLElement | null>(null)

const parkNames = computed(() => {
  const tasks = completedSection.value?.tasks ?? []
  return [...new Set(tasks.map(t => t.parkName))]
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

watch(isStuck, (stuck) => {
  document.documentElement.classList.toggle('stuck', stuck)
})

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
  document.documentElement.classList.remove('stuck')
})
</script>

<template>
  <section
    class="task-section mx-auto flex h-screen w-full max-w-[430px] flex-col"
  >
    <!-- Navigation Bar -->
    <div
      class="task-nav flex items-center px-4 pb-1 pt-3"
    >
      <h1 class="text-[24px] font-bold leading-[32px] text-[#171717]">任务工作台</h1>
    </div>

    <!-- Scrollable Content -->
    <div ref="scrollEl" class="flex flex-1 flex-col overflow-y-auto pb-4">

      <!-- Combined Active + Pending Card -->
      <div class="flex flex-col items-center px-4 pb-4 pt-4">
        <div class="card-shadow w-full overflow-hidden rounded-xl bg-white">
          <!-- Active Tasks -->
          <div
            v-for="(task, index) in activeSection?.tasks"
            :key="task.id"
            class="px-4"
          >
            <div
              class="flex flex-col gap-4 py-4"
              :class="index > 0 ? 'border-t border-[#EBEBEB]' : ''"
            >
              <div class="flex flex-col">
                <div class="flex items-center">
                  <div class="flex min-w-0 flex-1 flex-col justify-center">
                    <span class="text-[16px] font-medium leading-[24px] text-[#171717]">
                      {{ task.parkName }}
                    </span>
                    <span class="text-[13px] leading-[20px] text-[#5C5C5C]">
                      {{ task.taskName }}
                    </span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] bg-white px-1 py-1">
                    <i class="ri-loader-2-line text-[16px] leading-[16px] text-[#171717]" />
                    <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">
                      {{ task.deadline }}
                    </span>
                  </div>
                </div>
                <span v-if="task.address" class="truncate text-[13px] leading-[20px] text-[#5C5C5C]">
                  {{ task.address }}
                </span>
              </div>
              <button
                type="button"
                class="flex w-full items-center justify-center rounded-lg bg-[#262626] py-2"
              >
                <span class="text-[14px] font-medium leading-[20px] text-white">开始巡检</span>
              </button>
            </div>
          </div>

          <!-- Segment Divider -->
          <div class="segment-divider" />

          <!-- Pending Tasks Section (lighter background) -->
          <div class="bg-[rgba(0,0,0,0.05)]">
            <div
              v-for="(task, index) in pendingSection?.tasks"
              :key="task.id"
              class="px-4"
            >
              <div
                class="flex flex-col py-4"
                :class="index > 0 ? 'border-t border-[#EBEBEB]' : ''"
              >
                <div class="flex items-center">
                  <div class="flex min-w-0 flex-1 flex-col justify-center">
                    <span class="text-[16px] font-medium leading-[24px] text-[#171717]">
                      {{ task.parkName }}
                    </span>
                    <span class="text-[13px] leading-[20px] text-[#5C5C5C]">
                      {{ task.taskName }}
                    </span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] bg-white px-1 py-1">
                    <i class="ri-time-fill text-[16px] leading-[16px] text-[#FA7319]" />
                    <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">待完成</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- View More Button Area -->
          <div class="border-t border-[#EBEBEB] p-4">
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg bg-[rgba(0,0,0,0.05)] py-2"
            >
              <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C]">查看更多计划任务</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sentinel for sticky detection -->
      <div ref="sentinel" class="h-0 w-0" aria-hidden="true" />

      <!-- Archived Section Title (sticky) -->
      <div
        class="task-sticky sticky top-0 z-10 flex items-end px-4"
      >
        <div class="flex flex-1 items-center pb-[9px] pt-2">
          <span class="text-[17px] font-semibold leading-[22px] text-[rgba(60,60,67,0.6)]">
            归档任务
          </span>
          <div class="relative ml-auto">
            <button
              ref="filterBtnRef"
              type="button"
              class="flex items-center gap-1 rounded-full px-2 py-1 transition-colors"
              :class="selectedPark ? 'bg-[#171717] text-white' : 'text-[rgba(60,60,67,0.6)]'"
              @click="toggleParkFilter"
            >
              <i class="ri-filter-3-line text-[16px] leading-[16px]" />
              <span v-if="selectedPark" class="max-w-[100px] truncate text-[12px] font-medium leading-[16px]">{{ selectedPark }}</span>
              <span v-else class="text-[12px] font-medium leading-[16px]">筛选</span>
            </button>
            <Transition name="filter-pop">
              <div
                v-if="showParkFilter"
                class="park-filter-popover absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden whitespace-nowrap rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] leading-[20px] transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  :class="!selectedPark ? 'font-medium text-[#171717]' : 'text-[#5C5C5C]'"
                  @click="selectPark(null)"
                >
                  <i
                    class="ri-checkbox-circle-fill text-[16px] leading-[16px]"
                    :class="!selectedPark ? 'text-[#171717]' : 'invisible'"
                  />
                  <span>全部园区</span>
                </button>
                <button
                  v-for="park in parkNames"
                  :key="park"
                  type="button"
                  class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] leading-[20px] transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                  :class="selectedPark === park ? 'font-medium text-[#171717]' : 'text-[#5C5C5C]'"
                  @click="selectPark(park)"
                >
                  <i
                    class="ri-checkbox-circle-fill text-[16px] leading-[16px]"
                    :class="selectedPark === park ? 'text-[#171717]' : 'invisible'"
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
          >
            <div
              class="flex items-center py-4"
              :class="index > 0 ? 'border-t border-[#EBEBEB]' : ''"
            >
              <div class="flex min-w-0 flex-1 flex-col justify-center">
                <span class="text-[16px] font-medium leading-[24px] text-[#171717]">
                  {{ task.parkName }}
                </span>
                <span class="text-[13px] leading-[20px] text-[#5C5C5C]">
                  {{ task.taskName }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-1 self-start rounded-[6px] border border-[#EBEBEB] bg-white px-1 py-1">
                <i class="ri-checkbox-circle-fill text-[16px] leading-[16px] text-[#1FC16B]" />
                <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">已完成</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style>
.task-section,
.task-nav,
.task-sticky {
  background-color: #EBEBEB;
  transition: background-color 200ms ease;
}

.task-sticky {
  border-bottom: 1px solid transparent;
  transition: background-color 200ms ease, border-color 200ms ease;
}

html.stuck .task-section,
html.stuck .task-nav,
html.stuck .task-sticky {
  background-color: #FFFFFF;
}

html.stuck .task-sticky {
  border-bottom-color: #EBEBEB;
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
