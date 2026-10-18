<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch, type HTMLAttributes } from 'vue'
import { useIsMobile } from '../../composables/use-mobile'
import { cn } from '../../lib/utils'
import {
  provideSidebar,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from './use-sidebar'

const props = withDefaults(
  defineProps<{ defaultOpen?: boolean; open?: boolean; class?: HTMLAttributes['class'] }>(),
  { defaultOpen: true, open: undefined },
)
const emits = defineEmits<{ 'update:open': [open: boolean] }>()

const isMobile = useIsMobile()
const openMobile = ref(false)
const internalOpen = ref(props.open ?? props.defaultOpen)

watch(
  () => props.open,
  (value) => {
    if (value !== undefined) internalOpen.value = value
  },
)

const setOpen = (value: boolean) => {
  internalOpen.value = value
  emits('update:open', value)
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
}

const setOpenMobile = (value: boolean) => {
  openMobile.value = value
}

const toggleSidebar = () =>
  isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!internalOpen.value)

onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Rich text editors use the same shortcut for bold: leave keys they handled alone.
    if (event.defaultPrevented || (event.target as HTMLElement | null)?.isContentEditable) return

    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      toggleSidebar()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  onScopeDispose(() => window.removeEventListener('keydown', handleKeyDown))
})

const state = computed(() => (internalOpen.value ? 'expanded' : 'collapsed'))

provideSidebar({
  state,
  open: internalOpen,
  setOpen,
  openMobile,
  setOpenMobile,
  isMobile,
  toggleSidebar,
})
</script>

<template>
  <div
    data-slot="sidebar-wrapper"
    :style="{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON }"
    :class="
      cn(
        'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
