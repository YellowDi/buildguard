<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBodyScrollLock } from '../../composables/useBodyScrollLock'
import type { MaintenanceIssue } from '../../types/maintenance'
import type { TaskStatus } from '../../types/task'

const props = defineProps<{
  visible: boolean
  buildingName: string
  issue: MaintenanceIssue | null
  taskStatus: TaskStatus
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action'): void
}>()

const { lock, unlock } = useBodyScrollLock()

watch(() => props.visible, (val) => {
  if (val) lock()
  else unlock()
}, { immediate: true })

const footerActionLabel = computed(() => {
  switch (props.taskStatus) {
    case 'pending':
      return '开始维修'
    case 'active':
      return '填写维修结果'
    case 'completed':
      return '查看维修报告'
  }
})

function statusLabel(status?: MaintenanceIssue['sourceStatus']) {
  switch (status) {
    case 'normal':
      return '一切正常'
    case 'focus':
      return '需重点关注'
    case 'risk':
      return '存在风险'
    default:
      return props.issue?.sourceStatusLabel ?? ''
  }
}

function statusColor(status?: MaintenanceIssue['sourceStatus']) {
  switch (status) {
    case 'normal':
      return 'text-[#1FC16B]'
    case 'focus':
      return 'text-[#FA7319]'
    case 'risk':
      return 'text-[#E5484D]'
    default:
      return 'text-[#5C5C5C] dark:text-[#A3A3A3]'
  }
}

function statusIcon(status?: MaintenanceIssue['sourceStatus']) {
  switch (status) {
    case 'normal':
      return 'ri-checkbox-circle-fill'
    case 'focus':
      return 'ri-alert-line'
    case 'risk':
      return 'ri-error-warning-fill'
    default:
      return 'ri-information-line'
  }
}

const sourceInstructionText = computed(() =>
  props.issue
    ? [props.issue.dispatchReason, props.issue.sourceFinding, props.issue.sourceRemark].filter(Boolean).join('；')
    : '',
)
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="visible"
        class="sheet-overlay fixed inset-0 z-[70] bg-black/40"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="sheet">
      <div
        v-if="visible && issue"
        class="drawer-panel z-[70]"
        style="max-height: 90vh"
      >
        <div class="drawer-handle-wrap">
          <div class="drawer-handle-bar" />
        </div>

        <div class="flex items-center justify-between px-4 pb-3">
          <div class="min-w-0 flex-1 pr-2">
            <h3 class="text-[16px] font-semibold leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
              来源检测问题
            </h3>
            <p class="mt-0.5 truncate text-[12px] leading-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              {{ buildingName }} · {{ issue.location }}
            </p>
          </div>
          <button
            type="button"
            class="drawer-close-btn shrink-0"
            @click="emit('close')"
          >
            <i class="ri-close-line drawer-close-icon" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <i class="ri-file-list-3-line text-[18px] leading-[18px] text-[#A3A3A3]" />
              <span class="text-[14px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ issue.sourceInspectionTask }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i :class="[statusIcon(issue.sourceStatus), 'text-[18px] leading-[18px]', statusColor(issue.sourceStatus)]" />
              <span class="text-[14px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ issue.issueCategory }} · {{ issue.riskLevelLabel }}
              </span>
            </div>
          </div>

          <div class="mt-4 rounded-xl bg-[#F5F5F5] px-3 py-3 dark:bg-[#404040]">
            <div class="flex items-center gap-2">
              <span class="text-[14px] font-medium leading-[20px] text-[#171717] dark:text-[#E5E5E5]">{{ issue.title }}</span>
              <span
                class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium dark:bg-[#262626]"
                :class="statusColor(issue.sourceStatus)"
              >
                {{ statusLabel(issue.sourceStatus) }}
              </span>
            </div>
            <p v-if="sourceInstructionText" class="mt-2 text-[13px] leading-[20px] text-[#737373] dark:text-[#A3A3A3]">
              {{ sourceInstructionText }}
            </p>
          </div>

          <div class="mt-3">
            <span class="mb-1.5 block text-[13px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">问题描述</span>
            <div class="rounded-xl bg-[#F5F5F5] px-3 py-3 dark:bg-[#404040]">
              <p class="text-[14px] leading-[22px] text-[#171717] dark:text-[#E5E5E5]">
                {{ issue.sourceDescription }}
              </p>
            </div>
          </div>

          <div class="mt-3">
            <span class="mb-1.5 block text-[13px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">影响评估</span>
            <div class="rounded-xl bg-[#F5F5F5] px-3 py-3 dark:bg-[#404040]">
              <p class="text-[14px] leading-[22px] text-[#171717] dark:text-[#E5E5E5]">
                {{ issue.sourceImpact }}
              </p>
            </div>
          </div>

          <div v-if="issue.sourcePhotos?.length" class="mt-3 grid grid-cols-2 gap-2">
            <img
              v-for="photo in issue.sourcePhotos"
              :key="photo"
              :src="photo"
              alt="检测现场照片"
              class="h-[120px] w-full rounded-xl object-cover"
            />
          </div>
        </div>

        <div class="shrink-0 border-t border-[#F0F0F0] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] dark:border-white/10">
          <button
            type="button"
            class="btn-base btn-primary btn-md w-full"
            @click="emit('action')"
          >
            <span>{{ footerActionLabel }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
