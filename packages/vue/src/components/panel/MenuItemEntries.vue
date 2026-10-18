<script setup lang="ts">
import type { MenuItemSchema } from '@alfakit/core'
import { groupMenuItems } from '@alfakit/core'
import { computed } from 'vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import MenuItemEntry from './MenuItemEntry.vue'

/** Menu entries with a separator between their groups. */
const props = defineProps<{ items: MenuItemSchema[]; menu?: 'userMenu' | 'tenantMenu' }>()
const groups = computed(() => groupMenuItems(props.items))
</script>

<template>
  <template v-for="(group, groupIndex) in groups" :key="groupIndex">
    <DropdownMenuSeparator v-if="groupIndex > 0" />
    <MenuItemEntry
      v-for="(item, index) in group"
      :key="index"
      :item="item"
      :menu="props.menu ?? 'userMenu'"
    />
  </template>
</template>
