<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TaskDetail, Building, InspectionCategory, CheckItem, CheckItemStatus } from '../../types/task'
import { fetchTaskDetail } from '../../api/task'
import InspectionSheet from './InspectionSheet.vue'
import TaskReportDrawer from './TaskReportDrawer.vue'
import InspectionItemDetailDrawer, { type DetailEntry } from './InspectionItemDetailDrawer.vue'

const route = useRoute()
const router = useRouter()

const task = ref<TaskDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const notFound = ref(false)
const expandedCategoryIds = ref<number[]>([])
const sheetVisible = ref(false)
const activeItem = ref<CheckItem | null>(null)
const submitConfirmVisible = ref(false)
const reportDrawerVisible = ref(false)
const detailVisible = ref(false)
const detailEntry = ref<DetailEntry | null>(null)
/** 当前选中的建筑索引（多建筑时用于切换） */
const selectedBuildingIndex = ref(0)

const taskId = computed(() => Number(route.params.id))

/** 归一化建筑列表：有 buildings 用 buildings，否则用 categories 包装为「园区整体」单建筑 */
const buildingsList = computed((): Building[] => {
  const t = task.value
  if (!t) return []
  if (t.buildings?.length) return t.buildings
  if (t.categories?.length)
    return [{ id: 0, name: '园区整体', categories: t.categories }]
  return []
})

const currentBuilding = computed(() => buildingsList.value[selectedBuildingIndex.value] ?? null)

/** 整个任务（所有建筑）的巡检项总数与已检查数，用于顶部进度条 */
const totalItems = computed(() =>
  buildingsList.value.reduce(
    (sum, b) => sum + b.categories.reduce((s, c) => s + c.items.length, 0),
    0,
  )
)

const checkedItems = computed(() =>
  buildingsList.value.reduce(
    (sum, b) =>
      sum +
      b.categories.reduce(
        (s, c) => s + c.items.filter((i: CheckItem) => i.status !== 'unchecked').length,
        0,
      ),
    0,
  )
)

const progressPercent = computed(() =>
  totalItems.value === 0 ? 0 : Math.round((checkedItems.value / totalItems.value) * 100)
)

/** 当前建筑中第一个未检查项 id，用于「继续巡检」滚动定位 */
const firstUncheckedItemId = computed(() => {
  const b = currentBuilding.value
  if (!b) return null
  for (const cat of b.categories) {
    const item = cat.items.find((i: CheckItem) => i.status === 'unchecked')
    if (item) return item.id
  }
  return null
})

/** 包含第一个未检查项的分类 id，用于「继续巡检」时自动展开 */
const categoryIdContainingFirstUnchecked = computed(() => {
  const b = currentBuilding.value
  const targetId = firstUncheckedItemId.value
  if (!b || targetId == null) return null
  const cat = b.categories.find((c) =>
    c.items.some((i: CheckItem) => i.id === targetId),
  )
  return cat?.id ?? null
})

/** 当前建筑中第一个未检查项对象，用于「继续巡检」时自动弹开表单 */
const firstUncheckedItem = computed((): CheckItem | null => {
  const b = currentBuilding.value
  if (!b) return null
  for (const cat of b.categories) {
    const item = cat.items.find((i: CheckItem) => i.status === 'unchecked')
    if (item) return item
  }
  return null
})

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

/** 将 YYYY-MM-DD 格式化为「YYYY 年 M 月 D 日」 */
function formatCompletedAt(completedAt: string): string {
  const [y, m, d] = completedAt.split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return completedAt
  return `${y} 年 ${m} 月 ${d} 日`
}

/** 时间行展示文案：待完成为「开始 - 截止」；已完成为「完成巡检时间：日期」；否则为 deadline */
const deadlineDisplayText = computed(() => {
  const t = task.value
  if (!t) return ''
  if (t.status === 'completed' && t.completedAt)
    return `${formatCompletedAt(t.completedAt)} 完成巡检`
  const text = t.status === 'pending' && t.startDate
    ? `${t.startDate.trim()} - ${t.deadline}`
    : t.deadline
  return t.status === 'pending' ? text.replace(/前完成$/, '') : text
})

const DATE_REG = /(\d+)\s*月\s*(\d+)\s*日/g

/** 从 "X 月 Y 日" 解析为当年日期（仅取 0 点） */
function parseMonthDay(str: string): Date | null {
  const m = str.match(/(\d+)\s*月\s*(\d+)\s*日/)
  if (!m) return null
  const year = new Date().getFullYear()
  return new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10))
}

/** 从 deadline 字符串中解析出开始、截止日期（支持 "3 月 1 日 - 3 月 31 日前完成" 或单日期） */
function parseDeadlineRange(deadline: string): { start: Date | null; end: Date | null } {
  const matches = [...deadline.matchAll(DATE_REG)]
  if (matches.length >= 2) {
    const start = parseMonthDay(matches[0][0])
    const end = parseMonthDay(matches[1][0])
    return { start, end }
  }
  if (matches.length === 1) {
    const end = parseMonthDay(matches[0][0])
    return { start: null, end }
  }
  return { start: null, end: null }
}

/** 根据任务状态与时间返回小标签文案：待完成用「还有xx天开始」；进行中用「还剩xx天」等；已完成不显示 */
function timeRemainingLabel(t: TaskDetail): string | null {
  if (t.status === 'completed') return null
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const { start, end } = parseDeadlineRange(t.deadline)
  const startDate = t.startDate ? parseMonthDay(t.startDate) : start
  const endDate = end ?? (t.deadline ? parseMonthDay(t.deadline) : null)

  if (t.status === 'pending') {
    const startForPending = startDate ?? start
    if (!startForPending) return null
    const diffMs = startForPending.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
    if (diffDays < 0) return '已可开始'
    if (diffDays === 0) return '今天开始'
    return `还有${diffDays}天开始`
  }

  if (!endDate) return null
  const diffMs = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return '已逾期'
  if (diffDays === 0) return '今天到期'
  return `还剩${diffDays}天`
}

/** 底部操作按钮配置：按任务状态展示不同按钮 */
type BottomAction = { key: string; label: string; primary?: boolean; icon?: string; fillRemaining?: boolean }
const bottomActions = computed((): BottomAction[] => {
  const t = task.value
  if (!t) return []
  switch (t.status) {
    case 'pending':
      // 待完成：开始巡检、导航过去、电话联系
      return [
        { key: 'start', label: '开始巡检', primary: true, icon: 'ri-play-circle-line' },
        { key: 'navigate', label: '导航过去', icon: 'ri-map-pin-line' },
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
      ]
    case 'active':
      // 进行中：电话联系（左窄）+ 主操作（右撑满）。全部完成时为「提交」，否则「继续巡检」
      if (progressPercent.value === 100) {
        return [
          { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
          { key: 'submit', label: '提交', primary: true, icon: 'ri-check-double-line', fillRemaining: true },
        ]
      }
      return [
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
        { key: 'continue', label: '继续巡检', primary: true, icon: 'ri-play-circle-line', fillRemaining: true },
      ]
    case 'completed':
      // 已完成：电话联系（左窄）+ 查看报告（右撑满）
      return [
        { key: 'call', label: '电话联系', icon: 'ri-phone-line' },
        { key: 'report', label: '查看报告', primary: true, icon: 'ri-file-list-3-line', fillRemaining: true },
      ]
    default:
      return [{ key: 'call', label: '电话联系', icon: 'ri-phone-line' }]
  }
})

/** 是否存在「撑满剩余宽度」的按钮（进行中继续巡检 / 已完成查看报告），用于底部栏宽度分配 */
const hasFillRemainingAction = computed(() =>
  bottomActions.value.some((a) => a.fillRemaining)
)

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

/** 每栋建筑的巡检进度，用于切换按钮上展示 */
function buildingStats(b: Building) {
  const total = b.categories.reduce((s, c) => s + c.items.length, 0)
  const done = b.categories.reduce(
    (s, c) => s + c.items.filter((i: CheckItem) => i.status !== 'unchecked').length,
    0,
  )
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

function openItemDetail(cat: InspectionCategory, item: CheckItem) {
  const buildingName = currentBuilding.value?.name ?? '园区整体'
  detailEntry.value = {
    buildingName,
    categoryName: cat.name,
    item,
  }
  detailVisible.value = true
}

function closeSheet() {
  sheetVisible.value = false
}

function closeItemDetail() {
  detailVisible.value = false
  detailEntry.value = null
}

function handleItemClick(cat: InspectionCategory, item: CheckItem) {
  if (task.value?.status === 'completed') {
    openItemDetail(cat, item)
    return
  }
  openSheet(item)
}

function selectBuilding(index: number) {
  if (index === selectedBuildingIndex.value) return
  selectedBuildingIndex.value = index
  expandedCategoryIds.value = []
}

/** 底部操作：导航过去 */
function onNavigate() {
  const t = task.value
  if (!t?.address) return
  const q = encodeURIComponent(t.address)
  window.open(`https://maps.google.com/maps?q=${q}`, '_blank', 'noopener')
}

/** 底部操作：电话联系 */
function onCall() {
  const t = task.value
  if (!t?.phone) return
  window.location.href = `tel:${t.phone}`
}

/** 底部操作：继续巡检（展开分类 → 滚动到第一项 → 自动弹开巡检表单） */
async function onContinue() {
  const catId = categoryIdContainingFirstUnchecked.value
  if (catId != null && !expandedCategoryIds.value.includes(catId)) {
    expandedCategoryIds.value = [...expandedCategoryIds.value, catId]
    await nextTick()
  }
  const firstUnchecked = document.querySelector('[data-unchecked-item]')
  firstUnchecked?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const item = firstUncheckedItem.value
  if (item) {
    await nextTick()
    openSheet(item)
  }
}

/** 底部操作：查看报告，打开巡检结果概览浮窗 */
function onReport() {
  reportDrawerVisible.value = true
}

/** 结果确认浮窗：确认提交，将任务标记为已完成 */
function onSubmitConfirm() {
  if (task.value) {
    task.value.status = 'completed'
    task.value.completedAt = new Date().toISOString().slice(0, 10)
    submitConfirmVisible.value = false
    // TODO: 调用提交接口
  }
}

/** 底部操作：开始巡检（待完成状态下将任务设为进行中） */
function onStartInspection() {
  if (task.value?.status !== 'pending') return
  task.value.status = 'active'
  // TODO: 调用接口更新任务状态后，底部栏会切换为「继续巡检」「电话联系」
}

function handleBottomAction(key: string) {
  switch (key) {
    case 'start':
      onStartInspection()
      break
    case 'navigate':
      onNavigate()
      break
    case 'call':
      onCall()
      break
    case 'continue':
      onContinue()
      break
    case 'submit':
      submitConfirmVisible.value = true
      break
    case 'report':
      onReport()
      break
    default:
      break
  }
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

watch(
  () => buildingsList.value.length,
  (len) => {
    if (len > 0 && selectedBuildingIndex.value >= len)
      selectedBuildingIndex.value = 0
  },
)

async function loadTask(id: number) {
  loading.value = true
  errorMessage.value = ''
  notFound.value = false
  task.value = null

  if (!Number.isFinite(id) || id <= 0) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const data = await fetchTaskDetail(id)
    if (!data) {
      notFound.value = true
      return
    }
    task.value = data
    selectedBuildingIndex.value = 0
    expandedCategoryIds.value = []
  } catch {
    errorMessage.value = '任务加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function retryLoad() {
  loadTask(taskId.value)
}

watch(taskId, (id) => { loadTask(id) }, { immediate: true })
</script>

<template>
  <section class="mx-auto flex h-screen w-full max-w-[430px] flex-col bg-[#EBEBEB] dark:bg-[#171717]">
    <!-- Scrollable Content -->
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
            class="rounded-lg bg-[#171717] px-4 py-2 text-[14px] font-medium text-white transition-colors active:bg-[#333333] dark:bg-[#E5E5E5] dark:text-[#171717] dark:active:bg-[#D4D4D4]"
            @click="retryLoad"
          >
            重试
          </button>
        </div>
      </template>

      <template v-else-if="notFound">
        <div class="flex flex-1 flex-col items-center justify-center gap-3 py-10">
          <i class="ri-file-search-line text-[32px] text-[#A3A3A3]" />
          <p class="text-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">任务不存在或已被删除</p>
          <button
            type="button"
            class="rounded-lg bg-[#171717] px-4 py-2 text-[14px] font-medium text-white transition-colors active:bg-[#333333] dark:bg-[#E5E5E5] dark:text-[#171717] dark:active:bg-[#D4D4D4]"
            @click="router.replace('/')"
          >
            返回任务列表
          </button>
        </div>
      </template>

      <template v-else-if="task">
      <!-- Task Info Card -->
      <div class="card-shadow mt-4 flex flex-col rounded-xl bg-white dark:bg-[#262626] p-4">
        <!-- Title Row -->
        <div class="flex items-start">
          <div class="flex min-w-0 flex-1 flex-col">
            <!-- parkName: font_2:03875 = 16px Medium, paint_2:1736 = #171717 -->
            <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
              {{ task.parkName }}
            </span>
            <!-- taskName: font_3:03453 = 13px Regular, paint_2:2909 = #5C5C5C -->
            <span class="text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              {{ task.taskName }}
            </span>
          </div>
          <!-- Status Badge -->
          <div class="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#EBEBEB] dark:border-white/10 bg-white dark:bg-[#404040] px-1 py-1">
            <i :class="[statusIcon, 'text-[16px] leading-[16px]', statusIconColor]" />
            <!-- font_2:1771 = 12px Medium, paint_2:2909 = #5C5C5C -->
            <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <!-- Key Fields -->
        <div class="mt-4 flex flex-col gap-2">
          <!-- Address: map-pin-line 20x20, text 14px Medium #5C5C5C -->
          <div class="flex items-center gap-2">
            <i class="ri-map-pin-line text-[20px] leading-[20px] text-[#A3A3A3]" />
            <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ task.address }}</span>
          </div>
          <!-- 时间：待完成且有开始时间为「开始 - 截止」，否则仅截止时间 -->
          <div class="flex items-center gap-2">
            <i class="ri-calendar-line text-[20px] leading-[20px] text-[#A3A3A3]" />
            <span class="text-[14px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">{{ deadlineDisplayText }}</span>
            <span
              v-if="timeRemainingLabel(task)"
              class="rounded-md bg-[#F5F5F5] dark:bg-[#404040] px-1.5 py-0.5 text-[11px] font-medium leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]"
            >
              {{ timeRemainingLabel(task) }}
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-4 flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <!-- font_2:1735 = 14px Medium, paint_2:1736 = #171717 -->
            <span class="text-[14px] font-medium leading-[20px] text-[#171717] dark:text-[#E5E5E5]">巡检进度</span>
            <!-- font_2:07947 = 12px Regular, paint_2:2909 = #5C5C5C -->
            <span class="text-[12px] tabular-nums leading-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              {{ checkedItems }} / {{ totalItems }}
            </span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-[#EBEBEB] dark:bg-[#404040]">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="progressPercent === 100 ? 'bg-[#1FC16B]' : 'bg-[#171717] dark:bg-[#E5E5E5]'"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Segment Divider -->
      <div class="segment-divider my-4 shrink-0" />
      
      <!-- Building Switcher（多建筑时显示） -->
      <div v-if="buildingsList.length > 1" class="mb-4 grid grid-cols-3 gap-2.5">
          <button
            v-for="(b, idx) in buildingsList"
            :key="b.id"
            type="button"
            class="building-tab flex min-w-0 flex-col items-start rounded-md px-3 py-3 text-left transition-all duration-200"
            :class="selectedBuildingIndex === idx
              ? 'building-tab--active'
              : 'building-tab--inactive'"
            @click="selectBuilding(idx)"
          >
            <span
              class="block text-[14px] font-semibold leading-[20px]"
              :class="selectedBuildingIndex === idx ? 'text-white dark:text-[#171717]' : 'text-[#171717] dark:text-[#E5E5E5]'"
            >
              {{ b.name }}
            </span>
            <span
              class="mt-0.5 block text-[12px] tabular-nums leading-[16px]"
              :class="selectedBuildingIndex === idx ? 'text-white/80 dark:text-[#171717]/80' : 'text-[#5C5C5C] dark:text-[#A3A3A3]'"
            >
              {{ buildingStats(b).done }}/{{ buildingStats(b).total }} 已检查
            </span>
          </button>
      </div>

      <!-- Section Title: font_2:1777 = 16px Bold, paint_2:1736 = #171717 -->
      <h2 class="text-[16px] font-bold leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
        {{ currentBuilding ? `${currentBuilding.name} · 巡检项目` : '巡检项目' }}
      </h2>

      <!-- Inspection Category Accordions（当前建筑） -->
      <div v-if="currentBuilding" class="mt-4 flex flex-col gap-4 pb-8">
        <div
          v-for="cat in currentBuilding.categories"
          :key="cat.id"
          class="card-shadow overflow-hidden rounded-xl bg-white dark:bg-[#262626]"
        >
          <!-- Category Header -->
          <button
            type="button"
            class="flex w-full px-4 text-left transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
            :class="expandedCategoryIds.includes(cat.id) ? 'flex-col pt-4 pb-4' : 'h-[56px] items-center'"
            @click="toggleCategory(cat)"
          >
            <div class="flex w-full items-center gap-2">
              <span class="text-[16px] font-medium leading-[24px] text-[#171717] dark:text-[#E5E5E5]">{{ cat.name }}</span>
              <span class="min-w-0 flex-1 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]">
                {{ categoryStats(cat).done }}/{{ categoryStats(cat).total }} 已检查
              </span>
              <i
                class="ri-arrow-down-s-line shrink-0 text-[22px] leading-[22px] text-[#A3A3A3] transition-transform duration-300 ease-out"
                :class="expandedCategoryIds.includes(cat.id) ? 'rotate-180' : ''"
              />
            </div>
            <p
              v-if="expandedCategoryIds.includes(cat.id) && cat.description"
              class="mt-1 text-[13px] leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3]"
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
              <div class="mx-4 h-px bg-[rgba(0,0,0,0.1)] dark:bg-white/10" />

              <div
                v-for="(item, idx) in cat.items"
                :key="item.id"
                class="mx-4"
              >
                <div v-if="idx > 0" class="segment-divider" />
                <button
                  type="button"
                  class="flex h-[54px] w-full items-center gap-2 text-left transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.04]"
                  :data-unchecked-item="item.status === 'unchecked' && item.id === firstUncheckedItemId ? '' : undefined"
                  @click="handleItemClick(cat, item)"
                >
                  <div class="flex h-5 w-5 shrink-0 items-center justify-center">
                    <i
                      v-if="item.status !== 'unchecked'"
                      :class="[itemStatusIcon(item.status), 'text-[20px] leading-[20px]', itemStatusColor(item.status)]"
                    />
                    <div
                      v-else
                      class="h-[18px] w-[18px] rounded-full border-2 border-[#D4D4D4] dark:border-[#525252]"
                    />
                  </div>

                  <span class="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-[#171717] dark:text-[#E5E5E5]">
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
      </template>

    </div>

    <!-- 底部操作栏：按任务状态展示不同按钮 -->
    <div
      v-if="task && bottomActions.length"
      class="bottom-actions shrink-0 border-t border-[rgba(0,0,0,0.08)] dark:border-white/10 bg-white dark:bg-[#262626] p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
    >
      <div class="flex gap-2">
        <button
          v-for="action in bottomActions"
          :key="action.key"
          type="button"
          class="flex h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-[14px] font-medium leading-[20px] transition-colors active:opacity-90"
          :class="[
            action.fillRemaining || !hasFillRemainingAction ? 'min-w-0 flex-1' : 'shrink-0',
            action.primary
              ? 'bg-[#171717] dark:bg-[#E5E5E5] text-white dark:text-[#171717]'
              : 'bg-[rgba(0,0,0,0.06)] dark:bg-white/10 text-[#5C5C5C] dark:text-[#A3A3A3]'
          ]"
          :disabled="action.key === 'call' && !task.phone"
          @click="handleBottomAction(action.key)"
        >
          <i v-if="action.icon" :class="[action.icon, 'text-[18px]']" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>

    <InspectionSheet
      :visible="sheetVisible"
      :item="activeItem"
      @close="closeSheet"
      @save="onSheetSave"
    />

    <TaskReportDrawer
      :visible="submitConfirmVisible"
      :task="task"
      title="确认巡检结果"
      helper-text="请核对下方巡检结果，确认无误后点击「确认提交」完成本次巡检。"
      :show-completed-at="false"
      :show-confirm-footer="true"
      @close="submitConfirmVisible = false"
      @confirm="onSubmitConfirm"
    />

    <TaskReportDrawer
      :visible="reportDrawerVisible"
      :task="task"
      @close="reportDrawerVisible = false"
    />

    <InspectionItemDetailDrawer
      :visible="detailVisible"
      :entry="detailEntry"
      @close="closeItemDetail"
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
