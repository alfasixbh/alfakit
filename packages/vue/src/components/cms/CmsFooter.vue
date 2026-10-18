<script setup lang="ts">
import type { CmsPayload } from '@alfakit/core'
import CmsLanguageSwitcher from './CmsLanguageSwitcher.vue'
import CmsMenuList from './CmsMenuList.vue'
import { useCmsT } from './context'

/** The site footer: the `footer` menu and the site name. */
const props = defineProps<{ cms: CmsPayload }>()

const t = useCmsT()
</script>

<template>
  <footer data-slot="cms-footer" class="border-t">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8"
    >
      <p class="font-semibold">{{ props.cms.site.name }}</p>
      <nav
        v-if="props.cms.menus.footer && props.cms.menus.footer.items.length > 0"
        :aria-label="t('cms.footer_navigation', {}, 'Footer navigation')"
      >
        <CmsMenuList
          :items="props.cms.menus.footer.items"
          class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4"
        />
      </nav>
      <CmsLanguageSwitcher :site="props.cms.site" class="sm:hidden" />
    </div>
  </footer>
</template>
