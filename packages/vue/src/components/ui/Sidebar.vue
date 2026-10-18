<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import Sheet from './Sheet.vue'
import SheetContent from './SheetContent.vue'
import SheetDescription from './SheetDescription.vue'
import SheetHeader from './SheetHeader.vue'
import SheetTitle from './SheetTitle.vue'
import { SIDEBAR_WIDTH_MOBILE, useSidebar } from './use-sidebar'
import { useT } from '../../context'

const props = withDefaults(
  defineProps<{
    side?: 'left' | 'right'
    variant?: 'sidebar' | 'floating' | 'inset'
    collapsible?: 'offcanvas' | 'icon' | 'none'
    class?: HTMLAttributes['class']
  }>(),
  { side: 'left', variant: 'sidebar', collapsible: 'offcanvas' },
)
const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
const t = useT()
</script>

<template>
  <div
    v-if="props.collapsible === 'none'"
    data-slot="sidebar"
    :class="
      cn('bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col', props.class)
    "
  >
    <slot />
  </div>
  <Sheet v-else-if="isMobile" :open="openMobile" @update:open="setOpenMobile">
    <SheetContent
      data-sidebar="sidebar"
      data-slot="sidebar"
      data-mobile="true"
      class="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
      :style="{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }"
      :side="props.side"
    >
      <SheetHeader class="sr-only">
        <SheetTitle>{{ t('sidebar', {}, 'Sidebar') }}</SheetTitle>
        <SheetDescription>{{
          t('mobile_sidebar', {}, 'Displays the mobile sidebar.')
        }}</SheetDescription>
      </SheetHeader>
      <div class="flex h-full w-full flex-col"><slot /></div>
    </SheetContent>
  </Sheet>
  <div
    v-else
    class="text-sidebar-foreground group peer hidden md:block"
    :data-state="state"
    :data-collapsible="state === 'collapsed' ? props.collapsible : ''"
    :data-variant="props.variant"
    :data-side="props.side"
    data-slot="sidebar"
  >
    <div
      data-slot="sidebar-gap"
      :class="
        cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          props.variant === 'floating' || props.variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )
      "
    />
    <div
      data-slot="sidebar-container"
      :class="
        cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          props.side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          props.variant === 'floating' || props.variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          props.class,
        )
      "
    >
      <div
        data-sidebar="sidebar"
        data-slot="sidebar-inner"
        class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
