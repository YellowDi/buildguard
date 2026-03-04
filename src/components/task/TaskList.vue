<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { TaskSection } from '../../types/task'
import { fetchTaskList } from '../../api/task'

const sections = ref<TaskSection[]>([])

onMounted(async () => {
  const data = await fetchTaskList()
  sections.value = data.sections
})
</script>

<template>
  <section class="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#EBEBEB]">
    <!-- Navigation Bar -->
    <div class="flex items-center px-4 pb-1 pt-3">
      <h1 class="text-[24px] font-bold leading-[32px] text-[#171717]">任务工作台</h1>
    </div>

    <!-- Scrollable Content -->
    <div class="flex flex-1 flex-col overflow-y-auto py-4">
      <template v-for="section in sections" :key="section.key">
        <!-- Section Title -->
        <div v-if="section.title" class="flex items-end px-4">
          <div class="flex flex-1 items-end pb-[9px] pt-2">
            <span class="text-[17px] font-semibold leading-[22px] text-[rgba(60,60,67,0.6)]">
              {{ section.title }}
            </span>
          </div>
        </div>

        <!-- Task Cards -->
        <div class="flex flex-col items-center px-4 pb-4">
          <div class="card-shadow w-full overflow-hidden rounded-xl bg-white">
            <div
              v-for="(task, index) in section.tasks"
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

                    <!-- Status Badge -->
                    <div class="flex shrink-0 items-center gap-1 self-start rounded-full border border-[#EBEBEB] bg-white px-1 py-1">
                      <i
                        :class="[
                          task.status === 'active' ? 'ri-loader-2-line text-[#171717]' :
                          task.status === 'pending' ? 'ri-time-fill text-[#FA7319]' :
                          'ri-checkbox-circle-fill text-[#1FC16B]'
                        ]"
                        class="text-[16px] leading-[16px]"
                      />
                      <span class="pr-1 text-[12px] font-medium leading-[16px] text-[#5C5C5C]">
                        {{ task.status === 'active' ? task.deadline :
                           task.status === 'pending' ? '待完成' : '已完成' }}
                      </span>
                    </div>
                  </div>
                  <span v-if="task.address" class="truncate text-[13px] leading-[20px] text-[#5C5C5C]">
                    {{ task.address }}
                  </span>
                </div>

                <!-- Action Button (active only) -->
                <button
                  v-if="task.status === 'active'"
                  type="button"
                  class="flex w-full items-center justify-center rounded-lg bg-[#262626] py-2"
                >
                  <span class="text-[14px] font-medium leading-[20px] text-white">开始巡检</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
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
</style>
