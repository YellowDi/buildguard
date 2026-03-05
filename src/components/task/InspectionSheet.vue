<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { CheckItem, CheckItemStatus } from '../../types/task'

const props = defineProps<{
  visible: boolean
  item: CheckItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { status: CheckItemStatus; photos: string[]; description: string; impact: string }): void
}>()

const selectedStatus = ref<CheckItemStatus>('passed')
const photos = ref<string[]>([])
const description = ref('')
const impact = ref('')

let savedScrollY = 0

function lockBodyScroll() {
  savedScrollY = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.style.touchAction = 'none'
  document.body.style.overflow = 'hidden'
  document.body.style.touchAction = 'none'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function unlockBodyScroll() {
  document.documentElement.style.overflow = ''
  document.documentElement.style.touchAction = ''
  document.body.style.overflow = ''
  document.body.style.touchAction = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, savedScrollY)
}

watch(() => props.visible, (val) => {
  if (val) {
    lockBodyScroll()
    if (props.item) {
      selectedStatus.value = props.item.status === 'unchecked' ? 'passed' : props.item.status
      photos.value = props.item.photos ? [...props.item.photos] : []
      description.value = props.item.description ?? ''
      impact.value = props.item.impact ?? ''
    }
  } else {
    unlockBodyScroll()
  }
})

onBeforeUnmount(() => {
  if (props.visible) unlockBodyScroll()
})

function triggerUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = () => {
    if (!input.files) return
    for (const file of Array.from(input.files)) {
      const url = URL.createObjectURL(file)
      photos.value.push(url)
    }
  }
  input.click()
}

function removePhoto(idx: number) {
  photos.value.splice(idx, 1)
}

function handleSave() {
  emit('save', {
    status: selectedStatus.value,
    photos: [...photos.value],
    description: description.value,
    impact: impact.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop: blocks touch scroll to underlying page -->
    <Transition name="overlay">
      <div
        v-if="visible"
        class="sheet-overlay fixed inset-0 z-50 bg-black/40"
        @click="emit('close')"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[430px] flex-col rounded-t-2xl bg-white"
        style="max-height: 85vh"
      >
        <!-- Handle bar -->
        <div class="flex justify-center pt-2 pb-1">
          <div class="h-1 w-9 rounded-full bg-[#D4D4D4]" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 pb-3">
          <h3 class="text-[16px] font-semibold leading-[24px] text-[#171717]">
            {{ item?.name }}
          </h3>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5F5F5] transition-colors active:bg-[#E5E5E5]"
            @click="emit('close')"
          >
            <i class="ri-close-line text-[16px] leading-[16px] text-[#5C5C5C]" />
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-4 pb-6">

          <!-- Status Tabs -->
          <div class="mb-5">
            <span class="mb-2 block text-[13px] font-medium leading-[20px] text-[#5C5C5C]">情况状态</span>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border transition-all duration-200"
                :class="selectedStatus === 'passed'
                  ? 'border-[#1FC16B] bg-[#F0FDF4] text-[#1FC16B]'
                  : 'border-[#E5E5E5] bg-white text-[#5C5C5C]'"
                @click="selectedStatus = 'passed'"
              >
                <i class="ri-checkbox-circle-fill text-[18px] leading-[18px]" />
                <span class="text-[14px] font-medium leading-[20px]">正常</span>
              </button>
              <button
                type="button"
                class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border transition-all duration-200"
                :class="selectedStatus === 'failed'
                  ? 'border-[#E5484D] bg-[#FEF2F2] text-[#E5484D]'
                  : 'border-[#E5E5E5] bg-white text-[#5C5C5C]'"
                @click="selectedStatus = 'failed'"
              >
                <i class="ri-close-circle-fill text-[18px] leading-[18px]" />
                <span class="text-[14px] font-medium leading-[20px]">异常</span>
              </button>
            </div>
          </div>

          <!-- Photo Upload -->
          <div class="mb-5">
            <span class="mb-2 block text-[13px] font-medium leading-[20px] text-[#5C5C5C]">现场照片</span>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(photo, idx) in photos"
                :key="idx"
                class="group relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-lg"
              >
                <img
                  :src="photo"
                  alt="现场照片"
                  class="h-full w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white transition-colors active:bg-black/70"
                  @click="removePhoto(idx)"
                >
                  <i class="ri-close-line text-[12px] leading-[12px]" />
                </button>
              </div>
              <button
                type="button"
                class="flex h-[80px] w-[80px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#D4D4D4] bg-[#FAFAFA] transition-colors active:bg-[#F0F0F0]"
                @click="triggerUpload"
              >
                <i class="ri-camera-line text-[22px] leading-[22px] text-[#A3A3A3]" />
                <span class="text-[11px] leading-[14px] text-[#A3A3A3]">上传照片</span>
              </button>
            </div>
          </div>

          <!-- Problem Description -->
          <div class="mb-5">
            <span class="mb-2 block text-[13px] font-medium leading-[20px] text-[#5C5C5C]">问题描述</span>
            <textarea
              v-model="description"
              class="h-[88px] w-full resize-none rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-[16px] leading-[22px] text-[#171717] outline-none transition-colors placeholder:text-[#A3A3A3] focus:border-[#171717] focus:bg-white"
              placeholder="请描述发现的问题…"
            />
          </div>

          <!-- Impact Assessment -->
          <div class="mb-2">
            <span class="mb-2 block text-[13px] font-medium leading-[20px] text-[#5C5C5C]">影响评估</span>
            <textarea
              v-model="impact"
              class="h-[88px] w-full resize-none rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-[16px] leading-[22px] text-[#171717] outline-none transition-colors placeholder:text-[#A3A3A3] focus:border-[#171717] focus:bg-white"
              placeholder="请评估该问题可能造成的影响…"
            />
          </div>
        </div>

        <!-- Bottom action -->
        <div class="shrink-0 border-t border-[#F0F0F0] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <button
            type="button"
            class="flex h-11 w-full items-center justify-center rounded-lg bg-[#171717] transition-colors active:bg-[#333333]"
            @click="handleSave"
          >
            <span class="text-[15px] font-medium leading-[20px] text-white">提交结果</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop: prevent touch scroll from reaching page underneath */
.sheet-overlay {
  touch-action: none;
  overflow: hidden;
}

/* Backdrop fade */
.overlay-enter-active {
  transition: opacity 320ms ease;
}
.overlay-leave-active {
  transition: opacity 180ms ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

/* Sheet: slide up from bottom + scale up */
@keyframes sheet-in {
  0% {
    transform: translateY(60%) scale(0.8);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes sheet-out {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(60%) scale(0.8);
    opacity: 0;
  }
}

.sheet-enter-active {
  animation: sheet-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transform-origin: bottom center;
}

.sheet-leave-active {
  animation: sheet-out 220ms cubic-bezier(0.4, 0, 0.7, 0.2) both;
  transform-origin: bottom center;
}
</style>
