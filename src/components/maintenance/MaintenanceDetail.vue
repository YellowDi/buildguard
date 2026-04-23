<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchMaintenanceTaskDetail } from '../../api/maintenance'
import type {
  MaintenanceBuildingIssues,
  MaintenanceIssueCategory,
  MaintenanceIssue,
  MaintenanceTaskDetail,
} from '../../types/maintenance'
import MaintenanceExecutionDrawer from './MaintenanceExecutionDrawer.vue'
import MaintenanceIssueDrawer from './MaintenanceIssueDrawer.vue'
import MaintenanceResultDrawer from './MaintenanceResultDrawer.vue'

const route = useRoute()
const router = useRouter()

const task = ref<MaintenanceTaskDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const notFound = ref(false)
const beforeMedia = ref<string[]>([])
const afterMedia = ref<string[]>([])
const executionNote = ref('')
const executionDrawerVisible = ref(false)
const executionDrawerMode = ref<'before' | 'after'>('after')
const resultDrawerVisible = ref(false)
const resultConfirmable = ref(false)
const issueDrawerVisible = ref(false)
const selectedBuildingIndex = ref(0)
const selectedIssueId = ref<number | null>(null)
const expandedCategoryIds = ref<number[]>([])

const taskId = computed(() => Number(route.params.id))

const buildingsList = computed((): MaintenanceBuildingIssues[] => {
  const currentTask = task.value
  if (!currentTask) return []
  if (currentTask.buildings?.length) return currentTask.buildings

  return [{
    id: 0,
    name: currentTask.buildingName || '园区整体',
    issues: [{
      id: currentTask.id,
      title: currentTask.sourceInspectionItem,
      location: currentTask.location,
      issueCategory: currentTask.issueCategory,
      riskLevelLabel: currentTask.riskLevelLabel,
      sourceInspectionTask: currentTask.sourceInspectionTask,
      sourceFinding: currentTask.sourceFinding,
      sourceStatusLabel: currentTask.sourceStatusLabel,
      sourceStatus: currentTask.sourceStatus,
      dispatchReason: currentTask.dispatchReason,
      sourceDescription: currentTask.sourceDescription,
      sourceImpact: currentTask.sourceImpact,
      sourceRemark: currentTask.sourceRemark,
      sourcePhotos: currentTask.sourcePhotos,
    }],
  }]
})

const currentBuilding = computed(() =>
  buildingsList.value[selectedBuildingIndex.value] ?? null,
)

const currentCategories = computed((): MaintenanceIssueCategory[] => {
  const building = currentBuilding.value
  if (!building) return []
  if (building.categories?.length) return building.categories

  const categoryMap = new Map<string, MaintenanceIssueCategory>()
  for (const issue of building.issues) {
    const key = issue.inspectionCategoryName || issue.issueCategory || '其他问题'
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        id: building.id * 1000 + categoryMap.size + 1,
        name: key,
        description: issue.inspectionCategoryDescription,
        items: [],
      })
    }
    categoryMap.get(key)?.items.push(issue)
  }
  return Array.from(categoryMap.values())
})

const currentIssues = computed(() =>
  currentCategories.value.flatMap((category) => category.items),
)

const selectedIssue = computed(() => {
  const issues = currentIssues.value
  if (!issues.length) return null
  return issues.find((issue) => issue.id === selectedIssueId.value) ?? issues[0]
})

const statusLabel = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return '处理中'
    case 'pending': return '待接单'
    case 'completed': return '已完成'
  }
})

const statusIcon = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return 'ri-loader-2-line'
    case 'pending': return 'ri-time-line'
    case 'completed': return 'ri-checkbox-circle-fill'
  }
})

const statusIconColor = computed(() => {
  if (!task.value) return ''
  switch (task.value.status) {
    case 'active': return 'text-[#171717] dark:text-[#E5E5E5]'
    case 'pending': return 'text-[#FA7319]'
    case 'completed': return 'text-[#1FC16B]'
  }
})

const currentBuildingSummary = computed(() => {
  const building = currentBuilding.value
  if (!building) return ''
  const total = building.categories?.length
    ? building.categories.reduce((sum, category) => sum + category.items.length, 0)
    : building.issues.length
  return `${building.name} · ${total} 个问题`
})

const detailTimeText = computed(() => {
  if (!task.value) return ''
  if (task.value.status === 'completed' && task.value.completedAt) return `${task.value.completedAt} 完成维修`
  if (task.value.status === 'pending' && task.value.plannedAt) return `计划开始 ${task.value.plannedAt}`
  return task.value.deadline || ''
})

function parseTaskDate(value: string): Date | null {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  }
  const monthDayMatch = value.match(/(\d+)\s*月\s*(\d+)\s*日/)
  if (!monthDayMatch) return null
  const year = new Date().getFullYear()
  return new Date(year, Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]))
}

const timeRemainingLabel = computed(() => {
  const currentTask = task.value
  if (!currentTask || currentTask.status === 'completed') return null

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  if (currentTask.status === 'pending') {
    const startDate = currentTask.plannedAt ? parseTaskDate(currentTask.plannedAt) : null
    if (!startDate) return null
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays < 0) return '已可开始'
    if (diffDays === 0) return '今天开始'
    return `还有${diffDays}天开始`
  }

  const endDate = currentTask.deadline ? parseTaskDate(currentTask.deadline) : null
  if (!endDate) return null
  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return '已逾期'
  if (diffDays === 0) return '今天到期'
  return `还剩${diffDays}天`
})

type BottomAction = {
  key: 'call' | 'navigate' | 'start' | 'report' | 'summary'
  label: string
  primary?: boolean
  icon?: string
  fillRemaining?: boolean
}

const bottomActions = computed((): BottomAction[] => {
  if (!task.value) return []
  switch (task.value.status) {
    case 'pending':
      return [
        { key: 'start', label: '开始维修', primary: true, icon: 'ri-play-circle-line', fillRemaining: true },
        { key: 'navigate', label: '导航过去', icon: 'ri-map-pin-line' },
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
      ]
    case 'active':
      return [
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
        { key: 'report', label: '填写维修结果', primary: true, icon: 'ri-file-list-3-line', fillRemaining: true },
      ]
    case 'completed':
      return [
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
        { key: 'summary', label: '查看维修报告', primary: true, icon: 'ri-file-list-3-line', fillRemaining: true },
      ]
  }
})

const hasFillRemainingAction = computed(() =>
  bottomActions.value.some((action) => action.fillRemaining),
)

function buildingStats(building: MaintenanceBuildingIssues) {
  return {
    total: building.categories?.length
      ? building.categories.reduce((sum, category) => sum + category.items.length, 0)
      : building.issues.length,
  }
}

function issueStatusLabel(issue: MaintenanceIssue) {
  if (issue.sourceStatusLabel) return issue.sourceStatusLabel
  switch (issue.sourceStatus) {
    case 'normal': return '一切正常'
    case 'focus': return '需重点关注'
    case 'risk': return '存在风险'
    default: return ''
  }
}

function issueStatusColor(issue: MaintenanceIssue) {
  switch (issue.sourceStatus) {
    case 'normal': return 'text-[#1FC16B]'
    case 'focus': return 'text-[#FA7319]'
    case 'risk': return 'text-[#E5484D]'
    default: return 'text-[#5C5C5C] dark:text-[#A3A3A3]'
  }
}

function issueStatusIcon(issue: MaintenanceIssue) {
  switch (issue.sourceStatus) {
    case 'normal': return 'ri-checkbox-circle-fill'
    case 'focus': return 'ri-alert-line'
    case 'risk': return 'ri-error-warning-fill'
    default: return 'ri-information-line'
  }
}

function selectBuilding(index: number) {
  if (index === selectedBuildingIndex.value) return
  selectedBuildingIndex.value = index
  expandedCategoryIds.value = []
  selectedIssueId.value = currentCategories.value[0]?.items[0]?.id ?? null
}

function openIssueDrawer(issue: MaintenanceIssue) {
  selectedIssueId.value = issue.id
  issueDrawerVisible.value = true
}

function toggleCategory(category: MaintenanceIssueCategory) {
  const ids = expandedCategoryIds.value
  if (ids.includes(category.id)) {
    expandedCategoryIds.value = ids.filter((id) => id !== category.id)
  } else {
    expandedCategoryIds.value = [...ids, category.id]
  }
}

function categoryStats(category: MaintenanceIssueCategory) {
  return {
    total: category.items.length,
  }
}

function onCall() {
  if (!task.value?.phone) return
  window.location.href = `tel:${task.value.phone}`
}

function onNavigate() {
  if (!task.value?.address) return
  const query = encodeURIComponent(task.value.address)
  window.open(`https://maps.google.com/maps?q=${query}`, '_blank', 'noopener')
}

function openRepairResultDrawer() {
  if (!task.value || task.value.status === 'completed') return
  executionDrawerMode.value = 'after'
  executionDrawerVisible.value = true
}

function markTaskStarted() {
  if (!task.value || task.value.status !== 'pending') return
  task.value.status = 'active'
  task.value.steps.forEach((step, index) => {
    step.status = index === 0 ? 'active' : 'pending'
  })
}

function handleIssueAction() {
  if (!task.value) return
  issueDrawerVisible.value = false

  if (task.value.status === 'completed') {
    resultConfirmable.value = false
    resultDrawerVisible.value = true
    return
  }

  if (task.value.status === 'pending') {
    markTaskStarted()
  }

  openRepairResultDrawer()
}

function onViewSummary() {
  resultConfirmable.value = false
  resultDrawerVisible.value = true
}

function onSaveExecutionRecord(payload: { beforeMedia: string[]; afterMedia: string[]; executionNote: string }) {
  if (!task.value) return

  beforeMedia.value = payload.beforeMedia
  afterMedia.value = payload.afterMedia
  executionNote.value = payload.executionNote
  task.value.beforeMedia = payload.beforeMedia
  task.value.afterMedia = payload.afterMedia
  task.value.executionNote = payload.executionNote
  executionDrawerVisible.value = false
  resultConfirmable.value = true
  resultDrawerVisible.value = true
}

function onConfirmReport() {
  if (!task.value) return
  task.value.status = 'completed'
  task.value.completedAt = new Date().toISOString().slice(0, 10)
  task.value.steps.forEach((step) => { step.status = 'done' })
  resultConfirmable.value = false
  resultDrawerVisible.value = false
}

async function handleBottomAction(action: BottomAction['key']) {
  switch (action) {
    case 'call':
      onCall()
      break
    case 'navigate':
      onNavigate()
      break
    case 'start':
      if (selectedIssue.value) openIssueDrawer(selectedIssue.value)
      break
    case 'report':
      openRepairResultDrawer()
      break
    case 'summary':
      onViewSummary()
      break
  }
}

async function loadTask(id: number) {
  loading.value = true
  errorMessage.value = ''
  notFound.value = false
  executionDrawerVisible.value = false
  resultDrawerVisible.value = false
  resultConfirmable.value = false
  issueDrawerVisible.value = false
  task.value = null

  if (!Number.isFinite(id) || id <= 0) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const data = await fetchMaintenanceTaskDetail(id)
    if (!data) {
      notFound.value = true
      return
    }
    task.value = data
    beforeMedia.value = data.beforeMedia ? [...data.beforeMedia] : []
    afterMedia.value = data.afterMedia ? [...data.afterMedia] : []
    executionNote.value = data.executionNote ?? ''
    selectedBuildingIndex.value = 0
    expandedCategoryIds.value = []
    selectedIssueId.value = data.buildings?.[0]?.categories?.[0]?.items?.[0]?.id
      ?? data.buildings?.[0]?.issues?.[0]?.id
      ?? data.id
  } catch {
    errorMessage.value = '维修任务加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

watch(
  () => buildingsList.value.length,
  (len) => {
    if (len > 0 && selectedBuildingIndex.value >= len) {
      selectedBuildingIndex.value = 0
    }
  },
)

watch(
  currentBuilding,
  async (building) => {
    if (!building) {
      expandedCategoryIds.value = []
      selectedIssueId.value = null
      return
    }
    const categories = currentCategories.value
    expandedCategoryIds.value = categories.length ? [categories[0].id] : []
    const issueIds = new Set(categories.flatMap((category) => category.items.map((item) => item.id)))
    if (!selectedIssueId.value || !issueIds.has(selectedIssueId.value)) {
      await nextTick()
      selectedIssueId.value = categories[0]?.items[0]?.id ?? null
    }
  },
  { immediate: true },
)

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

watch(taskId, (id) => { loadTask(id) }, { immediate: true })
</script>

<template>
  <section class="mx-auto flex h-screen w-full max-w-[430px] flex-col bg-[#EBEBEB] dark:bg-[#171717]">
    <div class="flex flex-1 flex-col overflow-y-auto px-4">
      <template v-if="loading">
        <div class="flex flex-1 items-center justify-center">
          <div class="flex flex-col items-center gap-2">
            <i class="ri-loader-4-line animate-spin text-[32px] text-[#A3A3A3]" />
            <span class="text-[14px] text-[#A3A3A3]">加载中…</span>
          </div>
        </div>
      </template>

      <template v-else-if="errorMessage">
        <div class="flex flex-1 flex-col items-center justify-center gap-3 py-10">
          <i class="ri-error-warning-line text-[32px] text-[#E5484D]" />
          <p class="text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ errorMessage }}</p>
          <button
            type="button"
            class="btn-base btn-primary h-10 px-4 text-[14px] leading-[20px]"
            @click="loadTask(taskId)"
          >
            重试
          </button>
        </div>
      </template>

      <template v-else-if="notFound">
        <div class="flex flex-1 flex-col items-center justify-center gap-3 py-10">
          <i class="ri-file-search-line text-[32px] text-[#A3A3A3]" />
          <p class="text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">维修任务不存在或已被删除</p>
          <button
            type="button"
            class="btn-base btn-primary h-10 px-4 text-[14px] leading-[20px]"
            @click="router.replace('/maintenance')"
          >
            返回维修工作台
          </button>
        </div>
      </template>

      <template v-else-if="task">
        <div class="card-shadow mt-4 flex flex-col rounded-xl bg-white p-4 dark:bg-[#262626]">
          <div class="flex items-start">
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
                {{ task.parkName }}
              </span>
              <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ task.taskName }}
              </span>
            </div>
            <div class="task-status-chip">
              <i :class="[statusIcon, 'text-[16px] leading-[16px]', statusIconColor]" />
              <span class="task-status-text">{{ statusLabel }}</span>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <i class="ri-map-pin-line text-[20px] leading-[20px] text-[#A3A3A3]" />
              <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ currentBuildingSummary }}
              </span>
            </div>
            <div v-if="task.address" class="flex items-center gap-2">
              <i class="ri-road-map-line text-[20px] leading-[20px] text-[#A3A3A3]" />
              <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ task.address }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <i class="ri-calendar-line text-[20px] leading-[20px] text-[#A3A3A3]" />
              <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ detailTimeText }}
              </span>
              <span
                v-if="timeRemainingLabel"
                class="rounded-md bg-[#F5F5F5] px-1.5 py-0.5 text-[11px] font-medium leading-[16px] text-[#5C5C5C] dark:bg-[#404040] dark:text-[#A3A3A3]"
              >
                {{ timeRemainingLabel }}
              </span>
            </div>
          </div>
        </div>

        <div class="segment-divider my-4 shrink-0" />

        <div class="mb-4 grid grid-cols-3 gap-2.5">
          <button
            v-for="(building, idx) in buildingsList"
            :key="building.id"
            type="button"
            class="building-tab flex min-w-0 flex-col items-start rounded-md px-3 py-3 text-left transition-all duration-200"
            :class="selectedBuildingIndex === idx ? 'building-tab--active' : 'building-tab--inactive'"
            @click="selectBuilding(idx)"
          >
            <span
              class="block text-[14px] font-semibold leading-[20px]"
              :class="selectedBuildingIndex === idx ? 'text-white dark:text-[#171717]' : 'text-[#171717] dark:text-[#E5E5E5]'"
            >
              {{ building.name }}
            </span>
            <span
              class="mt-0.5 block text-[12px] tabular-nums leading-[16px]"
              :class="selectedBuildingIndex === idx ? 'text-white/80 dark:text-[#171717]/80' : 'text-[#5C5C5C] dark:text-[#A3A3A3]'"
            >
              {{ buildingStats(building).total }} 个问题
            </span>
          </button>
        </div>

        <h2 class="text-[16px] font-bold leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
          {{ currentBuilding ? `${currentBuilding.name} · 检测问题` : '检测问题' }}
        </h2>

        <div v-if="currentCategories.length" class="mt-4 flex flex-col gap-4">
          <div
            v-for="category in currentCategories"
            :key="category.id"
            class="card-shadow overflow-hidden rounded-xl bg-white dark:bg-[#262626]"
          >
            <button
              type="button"
              class="flex w-full px-4 text-left transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
              :class="expandedCategoryIds.includes(category.id) ? 'flex-col pt-4 pb-4' : 'h-[56px] items-center'"
              @click="toggleCategory(category)"
            >
              <div class="flex w-full items-center gap-2">
                <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">{{ category.name }}</span>
                <span class="min-w-0 flex-1 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                  {{ categoryStats(category).total }} 个问题
                </span>
                <i
                  class="ri-arrow-down-s-line shrink-0 text-[22px] leading-[22px] text-[#A3A3A3] transition-transform duration-300 ease-out"
                  :class="expandedCategoryIds.includes(category.id) ? 'rotate-180' : ''"
                />
              </div>
              <p
                v-if="expandedCategoryIds.includes(category.id) && category.description"
                class="mt-1 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]"
              >
                {{ category.description }}
              </p>
            </button>

            <Transition
              :css="false"
              @enter="onExpandEnter"
              @after-enter="onExpandAfterEnter"
              @leave="onExpandLeave"
              @after-leave="onExpandAfterLeave"
            >
              <div v-if="expandedCategoryIds.includes(category.id)">
                <div class="mx-4 h-px bg-[rgba(0,0,0,0.1)] dark:bg-white/10" />

                <div
                  v-for="(issue, index) in category.items"
                  :key="issue.id"
                  class="mx-4"
                >
                  <div v-if="index > 0" class="segment-divider" />
                  <button
                    type="button"
                    class="flex h-[54px] w-full items-center gap-2 text-left transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
                    @click="openIssueDrawer(issue)"
                  >
                    <div class="flex h-5 w-5 shrink-0 items-center justify-center">
                      <i
                        :class="[issueStatusIcon(issue), 'text-[20px] leading-[20px]', issueStatusColor(issue)]"
                      />
                    </div>

                    <span class="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-[#171717] dark:text-[#E5E5E5]">
                      {{ issue.title }}
                    </span>

                    <span
                      class="shrink-0 text-[13px] leading-[20px]"
                      :class="issueStatusColor(issue)"
                    >
                      {{ issueStatusLabel(issue) }}
                    </span>

                    <i class="ri-arrow-right-s-line shrink-0 text-[20px] leading-[20px] text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-else class="mt-4 rounded-xl bg-white px-4 py-5 text-[14px] leading-[20px] text-[#5C5C5C] dark:bg-[#262626] dark:text-[#A3A3A3]">
          当前建筑暂无待处理问题。
        </div>

        <div class="pb-8" />
      </template>
    </div>

    <div
      v-if="task && bottomActions.length"
      class="bottom-actions shrink-0 bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] dark:bg-[#262626]"
    >
      <div class="flex gap-2">
        <button
          v-for="action in bottomActions"
          :key="action.key"
          type="button"
          class="btn-base btn-md whitespace-nowrap"
          :class="[
            action.fillRemaining || !hasFillRemainingAction ? 'min-w-0 flex-1' : 'shrink-0',
            action.primary ? 'btn-primary' : 'btn-secondary',
          ]"
          :disabled="(action.key === 'call' && !task.phone) || (action.key === 'navigate' && !task.address)"
          @click="handleBottomAction(action.key)"
        >
          <i v-if="action.icon" :class="[action.icon, 'text-[18px]']" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>

    <MaintenanceIssueDrawer
      :visible="issueDrawerVisible"
      :building-name="currentBuilding?.name ?? task?.buildingName ?? '园区整体'"
      :issue="selectedIssue"
      :task-status="task?.status ?? 'pending'"
      @close="issueDrawerVisible = false"
      @action="handleIssueAction"
    />

    <MaintenanceExecutionDrawer
      :visible="executionDrawerVisible"
      :mode="executionDrawerMode"
      :before-media="beforeMedia"
      :after-media="afterMedia"
      :execution-note="executionNote"
      @close="executionDrawerVisible = false"
      @save="onSaveExecutionRecord"
    />

    <MaintenanceResultDrawer
      :visible="resultDrawerVisible"
      :task="task"
      :confirmable="resultConfirmable"
      @close="resultDrawerVisible = false"
      @confirm="onConfirmReport"
    />
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

.building-tab--active {
  background: linear-gradient(145deg, #171717 0%, #2d2d2d 100%);
}

.dark .building-tab--active {
  background: linear-gradient(145deg, #E5E5E5 0%, #D4D4D4 100%);
}

.building-tab--inactive {
  background: #F5F5F5;
}

.dark .building-tab--inactive {
  background: #404040;
}

.building-tab--inactive:active {
  background: #EBEBEB;
}

.dark .building-tab--inactive:active {
  background: #525252;
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
