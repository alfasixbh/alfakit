<script setup lang="ts">
import type { CmsPayload } from '@alfakit/core'
import CmsLanguageSwitcher from './CmsLanguageSwitcher.vue'
import CmsNav from './CmsNav.vue'

/** The site header: the site name, the `main` menu and the language links. */
const props = defineProps<{ cms: CmsPayload }>()
</script>

<template>
  <header
    data-slot="cms-header"
    class="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur"
  >
    <div
      class="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
    >
      <a
        :href="props.cms.site.url"
        class="focus-visible:ring-ring/50 rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-[3px]"
      >
        <img
          v-if="props.cms.site.design?.logo"
          :src="props.cms.site.design.logo.url"
          :alt="props.cms.site.design.logo.alt"
          data-slot="cms-logo"
          class="h-9 w-auto max-w-48 object-contain"
        />
        <template v-else>{{ props.cms.site.name }}</template>
      </a>
      <div class="flex items-center gap-2">
        <CmsNav :menu="props.cms.menus.main">
          <CmsLanguageSwitcher :site="props.cms.site" class="hidden sm:block" />
        </CmsNav>
      </div>
    </div>
  </header>
</template>
