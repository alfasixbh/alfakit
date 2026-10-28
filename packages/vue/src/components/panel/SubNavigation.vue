<script setup lang="ts">
import type { SubNavigationSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import Slot from './Slot.vue'
import SubNavigationLink from './SubNavigationLink.vue'

/** The links of a page's sub-navigation (cluster pages or record pages). */
const props = defineProps<{ navigation: SubNavigationSchema }>()
const t = useT()
const label = computed(() => t('sub_navigation', {}, 'Page navigation'))
const items = computed(() => props.navigation.groups.flatMap((group) => group.items))
</script>

<template>
  <nav
    v-if="props.navigation.position === 'top'"
    :aria-label="label"
    data-slot="sub-navigation"
    data-position="top"
    class="relative flex gap-1 overflow-x-auto border-b pb-2"
  >
    <SubNavigationLink
      v-for="item in items"
      :key="`${item.label}-${item.url ?? ''}`"
      :item="item"
      :tab="true"
    />
  </nav>
  <nav
    v-else
    :aria-label="label"
    data-slot="sub-navigation"
    :data-position="props.navigation.position"
    class="flex w-full shrink-0 flex-row gap-4 overflow-x-auto border-b pb-2 @2xl:w-56 @2xl:flex-col @2xl:overflow-visible @2xl:border-b-0 @2xl:pb-0"
  >
    <Slot name="page.sub-navigation.sidebar.before" />
    <div
      v-for="(group, index) in props.navigation.groups"
      :key="group.label ?? `group-${index}`"
      class="flex shrink-0 flex-row items-center gap-1 @2xl:flex-col @2xl:items-stretch"
    >
      <p
        v-if="group.label"
        class="text-muted-foreground flex items-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap"
      >
        <Icon v-if="group.icon" :name="group.icon" class="size-3.5" />
        {{ group.label }}
      </p>
      <ul class="flex flex-row gap-0.5 @2xl:flex-col">
        <li v-for="item in group.items" :key="`${item.label}-${item.url ?? ''}`">
          <SubNavigationLink :item="item" :tab="false" />
        </li>
      </ul>
    </div>
    <Slot name="page.sub-navigation.sidebar.after" />
  </nav>
</template>
