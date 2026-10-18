<script setup lang="ts">
import type { CmsMenuItemSchema } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import CmsMenuLink from './CmsMenuLink.vue'
import { CMS_LINK_CLASS } from './link-class'

/** Nested items as plain lists (the mobile menu and the footer). */
const props = defineProps<{
  items: CmsMenuItemSchema[]
  class?: HTMLAttributes['class']
  itemClass?: HTMLAttributes['class']
}>()
</script>

<template>
  <ul :class="props.class">
    <li v-for="item in props.items" :key="item.id">
      <CmsMenuLink :item="item" :class="cn(CMS_LINK_CLASS, 'block', props.itemClass)" />
      <CmsMenuList
        v-if="item.children.length > 0"
        :items="item.children"
        class="ms-3 border-s ps-2"
        :item-class="props.itemClass"
      />
    </li>
  </ul>
</template>
