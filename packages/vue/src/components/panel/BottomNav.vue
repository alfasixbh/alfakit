<script setup lang="ts">
import NavLabel from './NavLabel.vue'
import {
  PREFETCH_CACHE_FOR,
  bottomNavigationItems,
  isNavigationItemActive,
  navigationItemUrl,
  type NavigationItemSchema,
} from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { MenuIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'

/**
 * The mobile preset's bottom navigation bar (`Panel::mobile()`): the top-level items, with
 * the rest behind a "More" button that opens a sheet. Hidden from `md` up; replace it
 * everywhere with `createAlfakit({ components: { 'panel:bottom-nav': … } })`.
 */
const panel = usePanel()
const t = useT()
const open = ref(false)
const items = computed(() => bottomNavigationItems(panel.value.navigation))
const overflowActive = computed(() => items.value.overflow.some(isNavigationItemActive))
const overflowLinks = computed(() =>
  items.value.overflow.flatMap((item) => [item, ...(item.children ?? [])]),
)
const url = (item: NavigationItemSchema): string => navigationItemUrl(item) ?? '#'
</script>

<template>
  <nav
    v-if="items.primary.length > 0 || items.overflow.length > 0"
    data-slot="bottom-nav"
    :aria-label="t('navigation', {}, 'Navigation')"
    class="md:hidden"
  >
    <template v-for="item in items.primary" :key="item.url ?? item.label">
      <a
        v-if="item.openInNewTab"
        v-bind="item.extraAttributes ?? {}"
        :href="url(item)"
        target="_blank"
        rel="noopener noreferrer"
        data-slot="bottom-nav-item"
        class="min-w-0"
      >
        <Icon v-if="item.icon" :name="item.icon" />
        <NavLabel class="max-w-full truncate" :text="item.label" :html="item.labelHtml" />
      </a>
      <Link
        v-else
        v-bind="item.extraAttributes ?? {}"
        :href="url(item)"
        prefetch
        :cache-for="PREFETCH_CACHE_FOR"
        data-slot="bottom-nav-item"
        :data-active="isNavigationItemActive(item) ? 'true' : undefined"
        :aria-current="isNavigationItemActive(item) ? 'page' : undefined"
        class="min-w-0"
      >
        <Icon v-if="item.icon" :name="item.icon" />
        <NavLabel class="max-w-full truncate" :text="item.label" :html="item.labelHtml" />
      </Link>
    </template>
    <Sheet v-if="items.overflow.length > 0" :open="open" @update:open="open = $event">
      <button
        type="button"
        data-slot="bottom-nav-item"
        :data-active="overflowActive ? 'true' : undefined"
        aria-haspopup="dialog"
        :aria-expanded="open"
        class="min-w-0 bg-transparent"
        @click="open = true"
      >
        <Icon name="alfakit::panels.topbar.open-sidebar-button" :fallback="MenuIcon" />
        <span class="max-w-full truncate">{{ t('more', {}, 'More') }}</span>
      </button>
      <SheetContent side="bottom" class="max-h-[80dvh] overflow-y-auto rounded-t-xl p-0">
        <SheetHeader class="border-b">
          <SheetTitle>{{ t('more', {}, 'More') }}</SheetTitle>
        </SheetHeader>
        <nav
          :aria-label="t('navigation', {}, 'Navigation')"
          class="flex flex-col gap-1 p-3 text-sm"
        >
          <Link
            v-for="item in overflowLinks"
            :key="item.url ?? item.label"
            :href="url(item)"
            :data-active="isNavigationItemActive(item) ? 'true' : undefined"
            class="hover:bg-accent data-[active=true]:bg-accent flex min-h-11 items-center gap-3 rounded-md px-3 font-medium [&_svg]:size-4"
            @click="open = false"
          >
            <Icon v-if="item.icon" :name="item.icon" />
            <NavLabel :text="item.label" :html="item.labelHtml" />
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  </nav>
</template>
