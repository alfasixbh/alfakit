<script setup lang="ts">
import type { CmsMenuSchema } from '@alfakit/core'
import { MenuIcon, XIcon } from '@lucide/vue'
import { ref, useId } from 'vue'
import Button from '../ui/Button.vue'
import CmsDropdownItem from './CmsDropdownItem.vue'
import CmsMenuLink from './CmsMenuLink.vue'
import CmsMenuList from './CmsMenuList.vue'
import { useCmsT } from './context'
import { CMS_LINK_CLASS } from './link-class'

/**
 * The header navigation: items in a row from `md`, a disclosure menu below it. Items
 * with children get a submenu button (Escape or a click outside closes it).
 */
const props = defineProps<{ menu: CmsMenuSchema | null | undefined }>()

const t = useCmsT()
const open = ref(false)
const id = useId()
</script>

<template>
  <template v-if="props.menu && props.menu.items.length > 0">
    <nav
      :aria-label="t('cms.main_navigation', {}, 'Main navigation')"
      class="hidden md:block"
      data-slot="cms-nav"
    >
      <ul class="flex items-center gap-1">
        <template v-for="item in props.menu.items" :key="item.id">
          <CmsDropdownItem v-if="item.children.length > 0" :item="item" />
          <li v-else>
            <CmsMenuLink :item="item" :class="CMS_LINK_CLASS" />
          </li>
        </template>
      </ul>
    </nav>
    <slot />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="md:hidden"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <XIcon v-if="open" aria-hidden="true" />
      <MenuIcon v-else aria-hidden="true" />
      <span class="sr-only">{{
        open ? t('cms.close_menu', {}, 'Close menu') : t('cms.open_menu', {}, 'Open menu')
      }}</span>
    </Button>
    <nav
      :id="id"
      :hidden="!open"
      :aria-label="t('cms.main_navigation', {}, 'Main navigation')"
      class="bg-background absolute inset-x-0 top-full z-40 border-b px-4 pb-4 shadow-sm md:hidden"
      data-slot="cms-mobile-nav"
    >
      <CmsMenuList
        :items="props.menu.items"
        class="flex flex-col gap-1 pt-2"
        item-class="py-2.5 text-base"
      />
    </nav>
  </template>
  <slot v-else />
</template>
