<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TaskDetail, InspectionCategory } from '../../types/task'
import { fetchTaskDetail } from '../../api/task'

const route = useRoute()
const router = useRouter()

const task = ref<TaskDetail | null>(null)
const expandedCategoryId = ref<number | null>(null)

const taskId = computed(() => Number(route.params.id))

const totalItems = computed(() =>
  task.value?.categories.reduce((sum, cat) => sum + cat.items.length, 0) ?? 0
)

const checkedItems = computed(() =>
  task.value?.categories.reduce(
    (sum, cat) => sum + cat.items.filter(i => i.status !== 'unchecked').length,
    0,
  ) ?? 0
)

const progressPercent = computed(() =>
  totalItems.value === 0 ? 0 : Math.round((checkedItems.value / totalItems.value) * 100)
)

const statusLabel = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return '进行中'
    case 'pending': return '待完成'
    case 'completed': return '已完成'
  }
})

const statusColor = computed(() => {
  if (!task.value) return {}
  switch (task.value.status) {
    case 'active': return { icon: 'text-[#171717]', bg: 'bg-white border border-[#EBEBEB]' }
    case 'pending': return { icon: 'text-[#FA7319]', bg: 'bg-white border border-[#EBEBEB]' }
    case 'completed': return { icon: 'text-[#1FC16B]', bg: 'bg-white border border-[#EBEBEB]' }
  }
})

const statusIcon = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return 'ri-loader-2-line'
    case 'pending': return 'ri-time-fill'
    case 'completed': return 'ri-checkbox-circle-fill'
  }
})

function toggleCategory(cat: InspectionCategory) {
  expandedCategoryId.value = expandedCategoryId.value === cat.id ? null : cat.id
}

function categoryStats(cat: InspectionCategory) {
  const total = cat.items.length
  const done = cat.items.filter(i => i.status !== 'unchecked').length
  const failed = cat.items.filter(i => i.status === 'failed').length
  return { total, done, failed }
}

function goBack() {
  router.push('/')
}

onMounted(async () => {
  task.value = await fetchTaskDetail(taskId.value)
  if (task.value?.categories.length) {
    expandedCategoryId.value = task.value.categories[0].id
  }
})
</script>

<template>
  <section class="detail-section mx-auto flex h-screen w-full max-w-[430px] flex-col bg-[#EBEBEB]">
    <!-- Top Navigation -->
    <div class="flex items-center gap-3 px-4 pb-1 pt-3">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:bg-black/5"
        @click="goBack"
      >
        <i class="ri-arrow-left-s-line text-[24px] leading-[24px] text-[#171717]" />
      </button>
      <h1 class="text-[17px] font-semibold leading-[22px] text-[#171717]">任务详情</h1>
    </div>

    <!-- Scrollable Content -->
    <div class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">

      <!-- Task Info Card -->
      <div v-if="task" class="card-shadow flex flex-col gap-4 rounded-xl bg-white p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="text-[18px] font-semibold leading-[26px] text-[#171717]">
              {{ task.parkName }}
            </span>
            <span class="mt-0.5 text-[14px] leading-[20px] text-[#5C5C5C]">
              {{ task.taskName }}
            </span>
          </div>
          <div
            class="flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-1"
            :class="statusColor?.bg"
          >
            <i :class="[statusIcon, 'text-[16px] leading-[16px]', statusColor?.icon]" />
            <span class="pr-0.5 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <i class="ri-map-pin-line text-[16px] leading-[16px] text-[#A3A3A3]" />
            <span class="text-[13px] leading-[18px] text-[#5C5C5C]">{{ task.address }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="ri-calendar-line text-[16px] leading-[16px] text-[#A3A3A3]" />
            <span class="text-[13px] leading-[18px] text-[#5C5C5C]">{{ task.deadline }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="ri-user-3-line text-[16px] leading-[16px] text-[#A3A3A3]" />
            <span class="text-[13px] leading-[18px] text-[#5C5C5C]">巡检人：{{ task.inspector }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-medium leading-[18px] text-[#5C5C5C]">巡检进度</span>
            <span class="text-[13px] font-medium tabular-nums leading-[18px] text-[#171717]">
              {{ checkedItems }}/{{ totalItems }}
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="progressPercent === 100 ? 'bg-[#1FC16B]' : 'bg-[#171717]'"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Inspection Categories -->
      <div v-if="task" class="flex flex-col gap-3">
        <h2 class="text-[15px] font-semibold leading-[20px] text-[rgba(60,60,67,0.6)]">巡检项目</h2>

        <div
          v-for="cat in task.categories"
          :key="cat.id"
          class="card-shadow overflow-hidden rounded-xl bg-white"
        >
          <!-- Category Header -->
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-black/[0.02]"
            @click="toggleCategory(cat)"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5]">
              <i :class="[cat.icon, 'text-[18px] leading-[18px] text-[#171717]']" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="text-[15px] font-medium leading-[20px] text-[#171717]">{{ cat.name }}</span>
              <span class="text-[12px] leading-[16px] text-[#A3A3A3]">
                {{ categoryStats(cat).done }}/{{ categoryStats(cat).total }} 已检查
                <template v-if="categoryStats(cat).failed > 0">
                  · <span class="text-[#E5484D]">{{ categoryStats(cat).failed }} 异常</span>
                </template>
              </span>
            </div>
            <i
              class="ri-arrow-down-s-line text-[20px] leading-[20px] text-[#A3A3A3] transition-transform duration-200"
              :class="expandedCategoryId === cat.id ? 'rotate-180' : ''"
            />
          </button>

          <!-- Category Items (expandable) -->
          <Transition name="expand">
            <div v-if="expandedCategoryId === cat.id" class="border-t border-[#F0F0F0]">
              <div
                v-for="(item, idx) in cat.items"
                :key="item.id"
                class="flex items-start gap-3 px-4 py-3"
                :class="idx > 0 ? 'border-t border-[#F5F5F5]' : ''"
              >
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <i
                    v-if="item.status === 'passed'"
                    class="ri-checkbox-circle-fill text-[20px] leading-[20px] text-[#1FC16B]"
                  />
                  <i
                    v-else-if="item.status === 'failed'"
                    class="ri-close-circle-fill text-[20px] leading-[20px] text-[#E5484D]"
                  />
                  <div
                    v-else
                    class="h-[18px] w-[18px] rounded-full border-2 border-[#D4D4D4]"
                  />
                </div>
                <div class="flex min-w-0 flex-1 flex-col">
                  <span
                    class="text-[14px] leading-[20px]"
                    :class="item.status === 'unchecked' ? 'text-[#5C5C5C]' : 'text-[#171717]'"
                  >
                    {{ item.name }}
                  </span>
                  <span
                    v-if="item.remark"
                    class="mt-1 text-[12px] leading-[16px] text-[#E5484D]"
                  >
                    {{ item.remark }}
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="!task" class="flex flex-1 items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <i class="ri-loader-4-line animate-spin text-[32px] text-[#A3A3A3]" />
          <span class="text-[14px] text-[#A3A3A3]">加载中…</span>
        </div>
      </div>

    </div>

    <!-- Bottom Action (for active tasks) -->
    <div v-if="task?.status === 'active'" class="border-t border-[#EBEBEB] bg-white px-4 pb-8 pt-3">
      <button
        type="button"
        class="flex w-full items-center justify-center rounded-xl bg-[#262626] py-3"
      >
        <span class="text-[15px] font-medium leading-[20px] text-white">继续巡检</span>
      </button>
    </div>
  </section>
</template>

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

.expand-enter-active,
.expand-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
