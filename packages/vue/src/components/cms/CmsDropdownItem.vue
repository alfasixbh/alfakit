<script setup lang="ts">
import type { CmsMenuItemSchema } from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { cn } from '../../lib/utils'
import CmsMenuLink from './CmsMenuLink.vue'
import { useCmsT } from './context'
import { CMS_LINK_CLASS } from './link-class'

/** A top-level item with a submenu: the link plus a disclosure button for its children. */
const props = defineProps<{ item: CmsMenuItemSchema }>()

const t = useCmsT()
const open = ref(false)
const id = useId()
const root = ref<HTMLLIElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)

function close(event: Event) {
  if (root.value && event.target instanceof Node && !root.value.contains(event.target))
    open.value = false
}

watch(open, (isOpen) => {
  if (typeof document === 'undefined') return

  if (isOpen) {
    document.addEventListener('mousedown', close)
    document.addEventListener('focusin', close)
  } else {
    document.removeEventListener('mousedown', close)
    document.removeEventListener('focusin', close)
  }
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return

  document.removeEventListener('mousedown', close)
  document.removeEventListener('focusin', close)
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    button.value?.focus()
  }
}
</script>

<template>
  <li ref="root" class="relative flex items-center" @keydown="onKeydown">
    <CmsMenuLink :item="props.item" :class="CMS_LINK_CLASS" />
    <button
      ref="button"
      type="button"
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ms-2 rounded-md p-1.5 outline-none focus-visible:ring-[3px]"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <ChevronDownIcon
        :class="cn('size-4 transition-transform', open && 'rotate-180')"
        aria-hidden="true"
      />
      <span class="sr-only">{{
        t('cms.toggle_submenu', { label: props.item.label }, `Show the ${props.item.label} submenu`)
      }}</span>
    </button>
    <ul
      :id="id"
      :hidden="!open"
      class="bg-popover text-popover-foreground absolute start-0 top-full z-40 mt-1 min-w-52 rounded-lg border p-1 shadow-md"
    >
      <li v-for="child in props.item.children" :key="child.id">
        <CmsMenuLink :item="child" :class="cn(CMS_LINK_CLASS, 'block')" />
        <ul v-if="child.children.length > 0" class="ms-3 border-s ps-1">
          <li v-for="grandchild in child.children" :key="grandchild.id">
            <CmsMenuLink :item="grandchild" :class="cn(CMS_LINK_CLASS, 'block')" />
          </li>
        </ul>
      </li>
    </ul>
  </li>
</template>
