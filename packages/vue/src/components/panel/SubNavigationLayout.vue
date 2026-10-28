<script setup lang="ts">
import type { SubNavigationSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry } from '../../context'
import Slot from './Slot.vue'
import SubNavigation from './SubNavigation.vue'

/**
 * Places the sub-navigation next to (`start`/`end`) or above (`top`) the page content.
 * Replace the navigation with `createAlfakit({ components: { 'panel:sub-navigation': … } })`.
 */
const props = defineProps<{ navigation: SubNavigationSchema }>()
const registry = useRegistry()
const Nav = computed(() => registry.resolve('panel:sub-navigation') ?? SubNavigation)
</script>

<template>
  <template v-if="props.navigation.position === 'top'">
    <Slot name="page.sub-navigation.top.before" />
    <component :is="Nav" :navigation="props.navigation" />
    <Slot name="page.sub-navigation.top.after" />
    <slot />
  </template>
  <div v-else data-slot="sub-navigation-container" class="@container">
    <!-- The navigation goes beside the content once the page's content area (this
      `@container`) has 42rem, so the content keeps about 30rem next to it; narrower (beside
      the panel sidebar on a tablet), it is a scrolling row of links above (`end`: below)
      the content. -->
    <div
      data-slot="sub-navigation-layout"
      class="flex flex-col gap-6 @2xl:flex-row @2xl:items-start"
    >
      <template v-if="props.navigation.position !== 'end'">
        <Slot name="page.sub-navigation.start.before" />
        <component :is="Nav" :navigation="props.navigation" />
        <Slot name="page.sub-navigation.start.after" />
      </template>
      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <slot />
      </div>
      <template v-if="props.navigation.position === 'end'">
        <Slot name="page.sub-navigation.end.before" />
        <component :is="Nav" :navigation="props.navigation" />
        <Slot name="page.sub-navigation.end.after" />
      </template>
    </div>
  </div>
</template>
