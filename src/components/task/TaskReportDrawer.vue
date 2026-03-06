<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TaskDetail, Building, InspectionCategory, CheckItem } from '../../types/task'
import InspectionItemDetailDrawer, { type DetailEntry } from './InspectionItemDetailDrawer.vue'
import { useBodyScrollLock } from '../../composables/useBodyScrollLock'

const props = defineProps<{
  visible: boolean
  task: TaskDetail | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

type ViewMode = 'building' | 'risk'
const viewMode = ref<ViewMode>('risk')

/** 叠层详情浮窗：选中项与显隐（不关闭报告浮窗） */
const detailEntry = ref<DetailEntry | null>(null)
const detailVisible = ref(false)

function openItemDetail(entry: { building: Building; cat: InspectionCategory; item: CheckItem }) {
  detailEntry.value = {
    buildingName: entry.building.name,
    categoryName: entry.cat.name,
    item: entry.item,
  }
  detailVisible.value = true
}

function closeItemDetail() {
  detailVisible.value = false
  detailEntry.value = null
}

const { lock, unlock } = useBodyScrollLock()

watch(() => props.visible, (val) => {
  if (val) lock()
  else unlock()
}, { immediate: true })

function itemResultLabel(status: string) {
  switch (status) {
    case 'normal': return '一切正常'
    case 'focus': return '需重点关注'
    case 'risk': return '存在风险'
    default: return '未检查'
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
    default: return 'ri-checkbox-blank-circle-line'
  }
}

function statusBgColor(status: string) {
  switch (status) {
    case 'normal': return 'bg-[#F0FDF4] dark:bg-[#1FC16B]/15'
    case 'focus': return 'bg-[#FFF7ED] dark:bg-[#FA7319]/15'
    case 'risk': return 'bg-[#FEF2F2] dark:bg-[#E5484D]/15'
    default: return 'bg-[#F5F5F5] dark:bg-white/10'
  }
}

/** 归一化建筑列表 */
const buildingsList = computed((): Building[] => {
  const t = props.task
  if (!t) return []
  if (t.buildings?.length) return t.buildings
  if (t.categories?.length)
    return [{ id: 0, name: '园区整体', categories: t.categories }]
  return []
})

/** 按风险分组：存在风险 → 需重点关注 → 一切正常，每项带建筑名 */
const byRiskGroups = computed(() => {
  const buildings = buildingsList.value
  const risk: { building: Building; cat: InspectionCategory; item: CheckItem }[] = []
  const focus: { building: Building; cat: InspectionCategory; item: CheckItem }[] = []
  const normal: { building: Building; cat: InspectionCategory; item: CheckItem }[] = []
  for (const b of buildings) {
    for (const cat of b.categories) {
      for (const item of cat.items) {
        if (item.status === 'unchecked') continue
        const entry = { building: b, cat, item }
        if (item.status === 'risk') risk.push(entry)
        else if (item.status === 'focus') focus.push(entry)
        else normal.push(entry)
      }
    }
  }
  return [
    { key: 'risk' as const, label: '存在风险', count: risk.length, items: risk },
    { key: 'focus' as const, label: '需重点关注', count: focus.length, items: focus },
    { key: 'normal' as const, label: '一切正常', count: normal.length, items: normal },
  ]
})

function formatCompletedAt(completedAt: string | undefined): string {
  if (!completedAt) return ''
  const [y, m, d] = completedAt.split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return completedAt
  return `${y} 年 ${m} 月 ${d} 日`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="visible"
        class="sheet-overlay fixed inset-0 z-[60] bg-black/40"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="sheet">
      <div
        v-if="visible && task"
        class="drawer-panel z-[60]"
        style="max-height: 92vh"
      >
        <div class="drawer-handle-wrap">
          <div class="drawer-handle-bar" />
        </div>

        <div class="flex items-center justify-between px-4 pb-3">
          <div>
            <h3 class="text-[16px] font-semibold leading-[24px] text-[#171717] dark:text-[#E5E5E5]">
              巡检报告
            </h3>
            <p v-if="task.completedAt" class="mt-0.5 text-[12px] leading-[18px] text-[#5C5C5C] dark:text-[#A3A3A3]">
              {{ formatCompletedAt(task.completedAt) }} 完成
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

        <!-- 切换：按风险 / 按建筑 -->
        <div class="flex gap-2 px-4 pb-3">
          <button
            type="button"
            class="flex-1 rounded-lg border py-2.5 text-[14px] font-medium leading-[20px] transition-colors"
            :class="viewMode === 'risk'
              ? 'border-[#171717] dark:border-[#E5E5E5] bg-[#171717] dark:bg-[#E5E5E5] text-white dark:text-[#171717]'
              : 'border-[#E5E5E5] dark:border-white/20 bg-[#FAFAFA] dark:bg-[#404040] text-[#5C5C5C] dark:text-[#A3A3A3]'"
            @click="viewMode = 'risk'"
          >
            按风险
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border py-2.5 text-[14px] font-medium leading-[20px] transition-colors"
            :class="viewMode === 'building'
              ? 'border-[#171717] dark:border-[#E5E5E5] bg-[#171717] dark:bg-[#E5E5E5] text-white dark:text-[#171717]'
              : 'border-[#E5E5E5] dark:border-white/20 bg-[#FAFAFA] dark:bg-[#404040] text-[#5C5C5C] dark:text-[#A3A3A3]'"
            @click="viewMode = 'building'"
          >
            按建筑
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <!-- 按建筑 -->
          <div v-if="viewMode === 'building'" class="flex flex-col gap-4">
            <div
              v-for="b in buildingsList"
              :key="b.id"
              class="rounded-xl border border-[#EBEBEB] dark:border-white/10 overflow-hidden bg-[#FAFAFA] dark:bg-[#404040]/50"
            >
              <div class="px-3 py-2.5 text-[15px] font-semibold leading-[22px] text-[#171717] dark:text-[#E5E5E5] border-b border-[#EBEBEB] dark:border-white/10">
                {{ b.name }}
              </div>
              <div class="p-2 flex flex-col gap-2">
                <div
                  v-for="cat in b.categories"
                  :key="cat.id"
                  class="rounded-lg bg-white dark:bg-[#262626] p-2.5"
                >
                  <div class="text-[13px] font-medium leading-[20px] text-[#5C5C5C] dark:text-[#A3A3A3] mb-2">
                    {{ cat.name }}
                  </div>
                  <ul class="flex flex-col gap-1.5">
                    <li
                      v-for="item in cat.items"
                      :key="item.id"
                      class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06]"
                      :class="item.status !== 'unchecked' ? statusBgColor(item.status) : ''"
                      @click="openItemDetail({ building: b, cat, item })"
                    >
                      <i
                        v-if="item.status !== 'unchecked'"
                        :class="[itemStatusIcon(item.status), 'text-[16px] leading-[16px] shrink-0', itemStatusColor(item.status)]"
                      />
                      <span class="min-w-0 flex-1 text-[14px] leading-[20px] text-[#171717] dark:text-[#E5E5E5]">
                        {{ item.name }}
                      </span>
                      <span
                        v-if="item.status !== 'unchecked'"
                        class="shrink-0 text-[12px] font-medium"
                        :class="itemStatusColor(item.status)"
                      >
                        {{ itemResultLabel(item.status) }}
                      </span>
                      <i class="ri-arrow-right-s-line shrink-0 text-[18px] leading-[18px] text-[#A3A3A3]" />
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- 按风险 -->
          <div v-if="viewMode === 'risk'" class="flex flex-col gap-4">
            <div
              v-for="group in byRiskGroups"
              :key="group.key"
              class="rounded-xl border px-1 pb-1"
              :class="[
                group.key === 'risk' ? 'border-[#E5484D]/30 dark:border-[#E5484D]/40 bg-[#FEF2F2] dark:bg-[#E5484D]/15' : '',
                group.key === 'focus' ? 'border-[#FA7319]/30 dark:border-[#FA7319]/40 bg-[#FFF7ED] dark:bg-[#FA7319]/15' : '',
                group.key === 'normal' ? 'border-[#EBEBEB] dark:border-white/10 bg-[#F0FDF4] dark:bg-[#1FC16B]/15' : ''
              ]"
            >
              <div class="flex items-center justify-between px-3 py-2.5">
                <span
                  class="text-[14px] font-semibold leading-[20px]"
                  :class="group.key === 'risk' ? 'text-[#E5484D]' : group.key === 'focus' ? 'text-[#FA7319]' : 'text-[#1FC16B]'"
                >
                  {{ group.label }}
                </span>
                <span class="text-[12px] font-medium tabular-nums text-[#5C5C5C] dark:text-[#A3A3A3]">
                  {{ group.count }} 项
                </span>
              </div>
              <ul class="report-risk-inner divide-y divide-[#EBEBEB] dark:divide-white/10 rounded-lg bg-white dark:bg-[#262626] overflow-hidden">
                <li
                  v-for="(entry, idx) in group.items"
                  :key="`${entry.building.id}-${entry.item.id}-${idx}`"
                  class="cursor-pointer px-3 py-2.5 transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.06]"
                  @click="openItemDetail(entry)"
                >
                  <div class="flex items-center gap-2">
                    <i
                      :class="[itemStatusIcon(entry.item.status), 'text-[16px] leading-[16px] shrink-0', itemStatusColor(entry.item.status)]"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="text-[14px] font-medium leading-[20px] text-[#171717] dark:text-[#E5E5E5]">
                        {{ entry.item.name }}
                      </div>
                      <div v-if="entry.building.name !== '园区整体'" class="text-[12px] leading-[18px] text-[#5C5C5C] dark:text-[#A3A3A3] mt-0.5">
                        {{ entry.building.name }} · {{ entry.cat.name }}
                      </div>
                    </div>
                    <i class="ri-arrow-right-s-line shrink-0 text-[18px] leading-[18px] text-[#A3A3A3]" />
                  </div>
                </li>
                <li v-if="group.items.length === 0" class="px-3 py-4 text-center text-[13px] text-[#A3A3A3]">
                  无
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 叠层：巡检子项详情（叠在报告浮窗之上，关闭时仅关本层） -->
    <InspectionItemDetailDrawer
      :visible="detailVisible"
      :entry="detailEntry"
      @close="closeItemDetail"
    />
  </Teleport>
</template>
