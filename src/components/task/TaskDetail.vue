<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { TaskDetail, InspectionCategory, CheckItem, CheckItemStatus } from '../../types/task'
import { fetchTaskDetail } from '../../api/task'
import InspectionSheet from './InspectionSheet.vue'

const route = useRoute()

const task = ref<TaskDetail | null>(null)
const expandedCategoryIds = ref<number[]>([])
const sheetVisible = ref(false)
const activeItem = ref<CheckItem | null>(null)

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

const statusIcon = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return 'ri-loader-2-line'
    case 'pending': return 'ri-time-fill'
    case 'completed': return 'ri-checkbox-circle-fill'
  }
})

const statusIconColor = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return 'text-[#171717]'
    case 'pending': return 'text-[#FA7319]'
    case 'completed': return 'text-[#1FC16B]'
  }
})

function toggleCategory(cat: InspectionCategory) {
  const ids = expandedCategoryIds.value
  if (ids.includes(cat.id)) {
    expandedCategoryIds.value = ids.filter((id) => id !== cat.id)
  } else {
    expandedCategoryIds.value = [...ids, cat.id]
  }
}

function categoryStats(cat: InspectionCategory) {
  const total = cat.items.length
  const done = cat.items.filter(i => i.status !== 'unchecked').length
  return { total, done }
}

function itemResultLabel(status: string) {
  switch (status) {
    case 'normal': return '一切正常'
    case 'focus': return '需重点关注'
    case 'risk': return '存在风险'
    default: return ''
  }
}

function itemStatusColor(status: string) {
  switch (status) {
    case 'normal': return 'text-[#1FC16B]'
    case 'focus': return 'text-[#FA7319]'
    case 'risk': return 'text-[#E5484D]'
    default: return 'text-[#5C5C5C]'
  }
}

function itemStatusIcon(status: string) {
  switch (status) {
    case 'normal': return 'ri-checkbox-circle-fill'
    case 'focus': return 'ri-alert-line'
    case 'risk': return 'ri-error-warning-fill'
    default: return ''
  }
}

function openSheet(item: CheckItem) {
  activeItem.value = item
  sheetVisible.value = true
}

function closeSheet() {
  sheetVisible.value = false
}

function onSheetSave(payload: { status: CheckItemStatus; photos: string[]; description: string; impact: string }) {
  if (activeItem.value) {
    activeItem.value.status = payload.status
    activeItem.value.photos = payload.photos
    activeItem.value.description = payload.description
    activeItem.value.impact = payload.impact
  }
  sheetVisible.value = false
}

function onExpandEnter(el: Element, done: () => void) {
  const element = el as HTMLElement
  element.style.overflow = 'hidden'
  element.style.height = '0'
  element.style.opacity = '0'
  element.offsetHeight
  element.style.transition = 'height 280ms cubic-bezier(0.25,0.1,0.25,1), opacity 200ms ease 40ms'
  element.style.height = `${element.scrollHeight}px`
  element.style.opacity = '1'
  element.addEventListener('transitionend', function handler(e: TransitionEvent) {
    if (e.propertyName === 'height') {
      element.removeEventListener('transitionend', handler)
      done()
    }
  })
}

function onExpandAfterEnter(el: Element) {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.height = ''
  element.style.overflow = ''
  element.style.opacity = ''
}

function onExpandLeave(el: Element, done: () => void) {
  const element = el as HTMLElement
  element.style.overflow = 'hidden'
  element.style.height = `${element.scrollHeight}px`
  element.style.opacity = '1'
  element.offsetHeight
  element.style.transition = 'height 220ms cubic-bezier(0.25,0.1,0.25,1), opacity 160ms ease'
  element.style.height = '0'
  element.style.opacity = '0'
  element.addEventListener('transitionend', function handler(e: TransitionEvent) {
    if (e.propertyName === 'height') {
      element.removeEventListener('transitionend', handler)
      done()
    }
  })
}

function onExpandAfterLeave(el: Element) {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.height = ''
  element.style.overflow = ''
  element.style.opacity = ''
}

onMounted(async () => {
  task.value = await fetchTaskDetail(taskId.value)
})
</script>

<template>
  <section class="mx-auto flex h-screen w-full max-w-[430px] flex-col bg-[#EBEBEB]">
    <!-- Scrollable Content -->
    <div class="flex flex-1 flex-col overflow-y-auto px-4">

      <!-- Task Info Card -->
      <div v-if="task" class="card-shadow mt-4 flex flex-col rounded-xl bg-white p-4">
        <!-- Title Row -->
        <div class="flex items-start">
          <div class="flex min-w-0 flex-1 flex-col">
            <!-- parkName: font_2:03875 = 16px Medium, paint_2:1736 = #171717 -->
            <span class="text-[16px] font-medium leading-[24px] text-[#171717]">
              {{ task.parkName }}
            </span>
            <!-- taskName: font_3:03453 = 13px Regular, paint_2:2909 = #5C5C5C -->
            <span class="text-[13px] leading-[20px] text-[#5C5C5C]">
              {{ task.taskName }}
            </span>
          </div>
          <!-- Status Badge -->
          <div class="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#EBEBEB] bg-white px-1 py-1">
            <i :class="[statusIcon, 'text-[16px] leading-[16px]', statusIconColor]" />
            <!-- font_2:1771 = 12px Medium, paint_2:2909 = #5C5C5C -->
            <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <!-- Key Fields -->
        <div class="mt-4 flex flex-col gap-2">
          <!-- Address: map-pin-line 20x20, text 14px Medium #5C5C5C -->
          <div class="flex items-center gap-2">
            <i class="ri-map-pin-line text-[20px] leading-[20px] text-[#A3A3A3]" />
            <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C]">{{ task.address }}</span>
          </div>
          <!-- Deadline: calendar-line 20x20, text 14px Medium #5C5C5C -->
          <div class="flex items-center gap-2">
            <i class="ri-calendar-line text-[20px] leading-[20px] text-[#A3A3A3]" />
            <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C]">{{ task.deadline }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-4 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <!-- font_2:1735 = 14px Medium, paint_2:1736 = #171717 -->
            <span class="text-[14px] font-medium leading-[20px] text-[#171717]">巡检进度</span>
            <!-- font_2:07947 = 12px Regular, paint_2:2909 = #5C5C5C -->
            <span class="text-[12px] tabular-nums leading-[16px] text-[#5C5C5C]">
              {{ checkedItems }} / {{ totalItems }}
            </span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-[#EBEBEB]">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="progressPercent === 100 ? 'bg-[#1FC16B]' : 'bg-[#171717]'"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="task" class="mt-4 flex gap-2">
        <button
          type="button"
          class="flex h-10 flex-1 items-center justify-center rounded-md bg-[rgba(0,0,0,0.05)]"
        >
          <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C]">导航过去</span>
        </button>
        <button
          type="button"
          class="flex h-10 flex-1 items-center justify-center rounded-md bg-[rgba(0,0,0,0.05)]"
        >
          <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C]">电话联系</span>
        </button>
      </div>

      <!-- Segment Divider -->
      <div v-if="task" class="segment-divider my-4 shrink-0" />

      <!-- Section Title: font_2:1777 = 16px Bold, paint_2:1736 = #171717 -->
      <h2 v-if="task" class="text-[16px] font-bold leading-[24px] text-[#171717]">巡检项目</h2>

      <!-- Inspection Category Accordions -->
      <div v-if="task" class="mt-4 flex flex-col gap-4 pb-8">
        <div
          v-for="cat in task.categories"
          :key="cat.id"
          class="card-shadow overflow-hidden rounded-xl bg-white"
        >
          <!-- Category Header -->
          <button
            type="button"
            class="flex w-full px-4 text-left transition-colors active:bg-black/[0.02]"
            :class="expandedCategoryIds.includes(cat.id) ? 'flex-col pt-4 pb-4' : 'h-[56px] items-center'"
            @click="toggleCategory(cat)"
          >
            <div class="flex w-full items-center gap-2">
              <span class="text-[16px] font-medium leading-[24px] text-[#171717]">{{ cat.name }}</span>
              <span class="min-w-0 flex-1 text-[13px] leading-[20px] text-[#5C5C5C]">
                {{ categoryStats(cat).done }}/{{ categoryStats(cat).total }} 已检查
              </span>
              <i
                class="ri-arrow-down-s-line shrink-0 text-[22px] leading-[22px] text-[#A3A3A3] transition-transform duration-300 ease-out"
                :class="expandedCategoryIds.includes(cat.id) ? 'rotate-180' : ''"
              />
            </div>
            <p
              v-if="expandedCategoryIds.includes(cat.id) && cat.description"
              class="mt-1 text-[13px] leading-[20px] text-[#5C5C5C]"
            >
              {{ cat.description }}
            </p>
          </button>

          <!-- Category Items (expandable) -->
          <Transition
            :css="false"
            @enter="onExpandEnter"
            @after-enter="onExpandAfterEnter"
            @leave="onExpandLeave"
            @after-leave="onExpandAfterLeave"
          >
            <div v-if="expandedCategoryIds.includes(cat.id)">
              <div class="mx-4 h-px bg-[rgba(0,0,0,0.1)]" />

              <div
                v-for="(item, idx) in cat.items"
                :key="item.id"
                class="mx-4"
              >
                <div v-if="idx > 0" class="segment-divider" />
                <button
                  type="button"
                  class="flex h-[54px] w-full items-center gap-2 text-left transition-colors active:bg-black/[0.02]"
                  @click="openSheet(item)"
                >
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center">
                    <i
                      v-if="item.status !== 'unchecked'"
                      :class="[itemStatusIcon(item.status), 'text-[20px] leading-[20px]', itemStatusColor(item.status)]"
                    />
                    <div
                      v-else
                      class="h-[18px] w-[18px] rounded-full border-2 border-[#D4D4D4]"
                    />
                  </div>

                  <span class="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-[#171717]">
                    {{ item.name }}
                  </span>

                  <span
                    v-if="item.status !== 'unchecked'"
                    class="shrink-0 text-[13px] leading-[20px]"
                    :class="itemStatusColor(item.status)"
                  >
                    {{ itemResultLabel(item.status) }}
                  </span>

                  <i class="ri-arrow-right-s-line shrink-0 text-[20px] leading-[20px] text-[#A3A3A3]" />
                </button>
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

    <InspectionSheet
      :visible="sheetVisible"
      :item="activeItem"
      @close="closeSheet"
      @save="onSheetSave"
    />
  </section>
</template>

<style scoped>
/* token: card-shadow/medium */
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
