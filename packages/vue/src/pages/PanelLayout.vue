<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry } from '../context'
import BlankLayout from '../layouts/BlankLayout.vue'
import { layoutKind } from './hosted-layout'

/** The page's registered layout (`layout:app`, `layout:auth`…) around the slot. */
const props = defineProps<{ page: PageSchema }>()
const registry = useRegistry()
const kind = computed(() => layoutKind(props.page))

// Each layout can be replaced: createAlfakit({ components: { 'layout:app': MyLayout } }).
// `createAlfakit()` registers the panel's layouts (`panelLayouts`), the starter kit its content
// layout; importing the panel layouts here would put the sidebar in every starter kit page.
const Layout = computed(() => registry.resolve(`layout:${kind.value}`) ?? BlankLayout)
</script>

<template>
  <component
    :is="Layout"
    v-if="kind === 'auth'"
    :heading="props.page.heading ?? props.page.title"
    :subheading="props.page.subheading"
    :page="props.page"
  >
    <slot />
  </component>
  <component
    :is="Layout"
    v-else-if="kind === 'app'"
    :breadcrumbs="props.page.breadcrumbs"
    :max-content-width="props.page.maxContentWidth"
    :page="props.page"
  >
    <slot />
  </component>
  <component :is="Layout" v-else :page="props.page">
    <slot />
  </component>
</template>
