<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Task } from '../../types/task'

const props = defineProps<{
  visible: boolean
  /** 进行中 + 待完成的计划任务（已按时间排序） */
  tasks: Task[]
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const sortedTasks = computed(() => {
  const list = [...props.tasks]
  return list.sort((a, b) => {
    const dateA = a.plannedAt || a.deadline || ''
    const dateB = b.plannedAt || b.deadline || ''
    return dateA.localeCompare(dateB) || a.id - b.id
  })
})

function formatPlanDate(task: Task): string {
  const raw = task.plannedAt || task.deadline || ''
  if (!raw) return '待定'
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${parseInt(m[2], 10)} 月 ${parseInt(m[3], 10)} 日`
  return raw
}

function goToTask(id: number) {
  emit('close')
  router.push(`/task/${id}`)
}

function onBackdropClick() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop: blocks touch scroll to underlying page -->
    <Transition name="overlay">
      <div
        v-if="visible"
        class="sheet-overlay fixed inset-0 z-50 bg-black/40"
        aria-hidden="true"
        @click="onBackdropClick"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="sheet">
      <div
        v-if="visible"
        class="drawer-panel z-50"
        style="max-height: 85vh"
        role="dialog"
        aria-modal="true"
        aria-label="未来计划检测任务"
      >
        <!-- Handle bar -->
        <div class="drawer-handle-wrap">
          <div class="drawer-handle-bar" />
        </div>

        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-[#EBEBEB] dark:border-white/10 px-4 pb-3">
          <h2 class="text-[17px] font-semibold leading-[22px] text-[#171717] dark:text-[#E5E5E5]">
            未来计划检测任务
          </h2>
          <button
            type="button"
            class="drawer-close-btn"
            aria-label="关闭"
            @click="emit('close')"
          >
            <i class="ri-close-line drawer-close-icon" />
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div v-if="sortedTasks.length === 0" class="py-8 text-center text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              暂无计划任务
            </div>
            <div v-else class="timeline">
              <div
                v-for="(task, index) in sortedTasks"
                :key="task.id"
                class="timeline-item flex items-start gap-4"
              >
                <div class="timeline-track flex shrink-0 flex-col items-center">
                  <div class="flex h-[16px] items-center justify-center">
                    <div
                      class="timeline-dot h-3 w-3 shrink-0 rounded-full border-2 border-[#262626] dark:border-[#E5E5E5] bg-white dark:bg-[#262626]"
                      :class="task.status === 'active' ? 'border-[#262626] dark:border-[#E5E5E5] bg-[#262626] dark:bg-[#E5E5E5]' : 'border-[#BFBFBF] dark:border-[#737373]'"
                    />
                  </div>
                  <div
                    v-if="index < sortedTasks.length - 1"
                    class="timeline-line mt-0.5 h-full min-h-[24px] w-px shrink-0 bg-[#E5E5E5] dark:bg-white/20"
                  />
                </div>
                <button
                  type="button"
                  class="timeline-content flex min-w-0 flex-1 flex-col gap-1 pb-5 text-left transition-colors active:opacity-80"
                  @click="goToTask(task.id)"
                >
                  <span class="text-[12px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                    {{ formatPlanDate(task) }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="min-w-0 flex-1 text-[15px] font-medium leading-[22px] text-[#171717] dark:text-[#E5E5E5]">
                      {{ task.parkName }}
                    </span>
                    <div
                      v-if="task.status === 'active'"
                      class="task-status-chip"
                    >
                      <i class="ri-loader-2-line text-[16px] leading-[16px] text-[#171717] dark:text-[#E5E5E5]" />
                      <span class="task-status-text">进行中</span>
                    </div>
                    <div
                      v-else
                      class="task-status-chip"
                    >
                      <i class="ri-time-fill text-[16px] leading-[16px] text-[#FA7319]" />
                      <span class="task-status-text">待完成</span>
                    </div>
                  </div>
                  <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                    {{ task.taskName }}
                  </span>
                </button>
              </div>
            </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
