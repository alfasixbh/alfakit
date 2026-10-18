<script setup lang="ts">
import type { MenuItemSchema } from '@alfakit/core'
import { menuActionContext } from '@alfakit/core'
import { Link, router } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useActionRunner, usePageSchema } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import NewTabHint from '../../lib/NewTabHint.vue'

/**
 * An entry in the user or tenant menu: colour, icon, new tab and POST links, or an
 * `Action` (server logic, modals) run through the action endpoint as a menu action.
 */
const props = withDefaults(
  defineProps<{ item: MenuItemSchema; menu?: 'userMenu' | 'tenantMenu' }>(),
  { menu: 'userMenu' },
)
const runner = useActionRunner()
const page = usePageSchema()
// Unknown values get no class (custom names get theirs).
const itemColor = computed(() =>
  cn(props.item.color && colorClass(textColorClasses, props.item.color, props.item.color)),
)

function runAction(): void {
  if (props.item.action) {
    void runner.trigger(props.item.action, menuActionContext(page.value?.token ?? '', props.menu))
  }
}
</script>

<template>
  <DropdownMenuItem
    v-if="props.item.action"
    :disabled="props.item.action.disabled"
    :title="props.item.action.tooltip"
    @select="runAction"
  >
    <Icon v-if="props.item.icon" :name="props.item.icon" :class="itemColor" />
    <span :class="itemColor">{{ props.item.label }}</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    v-else-if="props.item.method === 'post'"
    @select="props.item.url && router.post(props.item.url)"
  >
    <Icon v-if="props.item.icon" :name="props.item.icon" :class="itemColor" />
    <span :class="itemColor">{{ props.item.label }}</span>
  </DropdownMenuItem>
  <DropdownMenuItem v-else as-child>
    <a
      v-if="props.item.openInNewTab"
      :href="props.item.url"
      target="_blank"
      rel="noopener noreferrer"
      class="w-full"
    >
      <Icon v-if="props.item.icon" :name="props.item.icon" :class="itemColor" />
      <span :class="itemColor">{{ props.item.label }}</span>
      <NewTabHint />
    </a>
    <Link v-else :href="props.item.url ?? '#'" class="w-full">
      <Icon v-if="props.item.icon" :name="props.item.icon" :class="itemColor" />
      <span :class="itemColor">{{ props.item.label }}</span>
    </Link>
  </DropdownMenuItem>
</template>
