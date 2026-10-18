<script setup lang="ts">
import { cmsLinkRel, type CmsMenuItemSchema } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { useCmsT } from './context'

const props = defineProps<{ item: CmsMenuItemSchema; class?: HTMLAttributes['class'] }>()

const t = useCmsT()
</script>

<template>
  <a
    v-if="props.item.url"
    :href="props.item.url"
    :target="props.item.newTab ? '_blank' : undefined"
    :rel="cmsLinkRel(props.item.newTab)"
    :aria-current="props.item.current ? 'page' : undefined"
    :data-active="props.item.active || undefined"
    :class="props.class"
  >
    {{ props.item.label }}
    <span v-if="props.item.newTab" class="sr-only">
      {{ t('cms.new_tab', {}, '(opens in a new tab)') }}</span
    >
  </a>
  <span v-else :class="props.class">{{ props.item.label }}</span>
</template>
