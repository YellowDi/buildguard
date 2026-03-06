<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDarkMode } from '../../composables/useDarkMode'

defineProps<{
  name: string
  completedCount: number
}>()

const emit = defineEmits<{
  logout: []
}>()

const router = useRouter()
const showPopover = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const blockHeight = ref(0)
const { isDark, toggle: toggleDarkMode } = useDarkMode()

function updateBlockHeight() {
  nextTick(() => {
    if (!cardRef.value || !popoverRef.value) return
    blockHeight.value = cardRef.value.offsetHeight + popoverRef.value.offsetHeight
  })
}

watch(showPopover, (v) => {
  if (v) updateBlockHeight()
})

function togglePopover() {
  showPopover.value = !showPopover.value
}

function onLogout() {
  showPopover.value = false
  emit('logout')
  router.push('/login')
}

function onClickOutside(e: MouseEvent) {
  if (!showPopover.value) return
  const target = e.target as Node
  const popover = document.querySelector('.user-card-popover')
  if (cardRef.value?.contains(target) || popover?.contains(target)) return
  showPopover.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
})
</script>

<template>
  <div class="relative w-fit">
    <!-- 融合用背景层：展开时衬在卡片+浮窗后面，高度随内容适配 -->
    <div
      v-show="showPopover"
      class="absolute inset-x-0 top-0 z-0 rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-[#262626] dark:ring-white/10"
      :style="blockHeight ? { height: `${blockHeight}px` } : undefined"
    />

    <div
      ref="cardRef"
      class="relative z-10 inline-flex cursor-pointer items-center gap-2 px-2 pt-2 transition-colors active:bg-black/5 dark:active:bg-white/10"
      :class="showPopover ? 'rounded-t-lg' : 'rounded-lg'"
      @click="togglePopover"
    >
      <div class="avatar-border h-[40px] w-[40px] shrink-0 rounded-[6px] bg-[#C4C4C4] dark:bg-[#404040]" />
      <div class="flex flex-col gap-0.5">
        <span class="text-[13px] font-medium leading-[18px] text-[#171717] dark:text-[#E5E5E5]">{{ name }}</span>
        <span class="text-[11px] leading-[14px] text-[#5C5C5C] dark:text-[#A3A3A3]">已完成 {{ completedCount }} 任务</span>
      </div>
      <i
        class="ri-arrow-down-s-line text-[16px] text-[#5C5C5C] transition-transform duration-300 ease-out dark:text-[#A3A3A3]"
        :class="showPopover ? 'rotate-180' : ''"
      />
    </div>

    <!-- 选项浮窗（absolute 悬浮不挤压内容；-mt-px 与卡片无缝隙，无独立描边/阴影与背景层融合） -->
    <Transition name="popover">
      <div
        ref="popoverRef"
        v-show="showPopover"
        class="user-card-popover absolute right-0 left-0 top-full z-50 -mt-px overflow-hidden rounded-b-lg bg-white dark:bg-[#262626]"
        :class="!showPopover && 'mt-1 rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10'"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-[#171717] transition-colors active:bg-black/5 dark:text-[#E5E5E5] dark:active:bg-white/10"
          @click="toggleDarkMode"
        >
          <i
            :class="isDark ? 'ri-sun-line' : 'ri-moon-line'"
            class="text-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]"
          />
          {{ isDark ? '关闭暗色模式' : '暗色模式' }}
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-[#171717] transition-colors active:bg-black/5 dark:text-[#E5E5E5] dark:active:bg-white/10"
          @click="onLogout"
        >
          <i class="ri-logout-box-r-line text-[16px] text-[#5C5C5C] dark:text-[#A3A3A3]" />
          退出登录
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.avatar-border {
  box-shadow: inset 0 0 0 1px #FFFFFF;
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
