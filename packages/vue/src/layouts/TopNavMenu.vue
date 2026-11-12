<script setup lang="ts">
import type { NavigationItemSchema } from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import DropdownMenu from '../components/ui/DropdownMenu.vue'
import DropdownMenuContent from '../components/ui/DropdownMenuContent.vue'
import DropdownMenuTrigger from '../components/ui/DropdownMenuTrigger.vue'
import NavLabel from '../components/panel/NavLabel.vue'
import NavMenuItems from '../components/panel/NavMenuItems.vue'
import { Icon } from '../lib/icons'

/** A top-navigation dropdown: a labelled group or an item with children. */
const props = defineProps<{
  label: string
  /** `label` is sanitised HTML (an `Htmlable` navigation label). */
  labelHtml?: boolean
  icon?: string
  items: NavigationItemSchema[]
  active: boolean
  /** `NavigationItem::extraAttributes()` of an item with children. */
  attributes?: NavigationItemSchema['extraAttributes']
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      v-bind="props.attributes ?? {}"
      data-slot="topnav-link"
      :data-active="props.active ? 'true' : undefined"
      class="text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground data-[state=open]:text-foreground inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none [&_svg]:size-4"
    >
      <Icon v-if="props.icon" :name="props.icon" />
      <NavLabel :text="props.label" :html="props.labelHtml" />
      <ChevronDownIcon class="opacity-60" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="min-w-48">
      <NavMenuItems :items="props.items" />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
