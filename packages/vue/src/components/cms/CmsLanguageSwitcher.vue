<script setup lang="ts">
import type { CmsSiteSchema } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import { useCmsT } from './context'
import { CMS_LINK_CLASS } from './link-class'

/** Links to the page in the site's other languages. */
const props = defineProps<{ site: CmsSiteSchema; class?: HTMLAttributes['class'] }>()

const t = useCmsT()
</script>

<template>
  <nav
    v-if="props.site.locales.length > 1"
    :aria-label="t('cms.language', {}, 'Language')"
    :class="props.class"
    data-slot="cms-language-switcher"
  >
    <ul class="flex flex-wrap items-center gap-1">
      <li v-for="locale in props.site.locales" :key="locale.code">
        <a
          :href="locale.url"
          :hreflang="locale.code"
          :lang="locale.code"
          :aria-current="locale.current ? 'true' : undefined"
          :class="cn(CMS_LINK_CLASS, 'px-2 py-1 uppercase')"
        >
          {{ locale.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
