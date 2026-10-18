<script setup lang="ts">
import type { ActionContext, AnyActionSchema, Color } from '@alfakit/core'
import { bindsKeyBindings, formatKeyBinding, isActionGroup } from '@alfakit/core'
import { useActionRunner } from '../../context'
import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import DropdownMenuGroup from '../ui/DropdownMenuGroup.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuShortcut from '../ui/DropdownMenuShortcut.vue'
import DropdownMenuSub from '../ui/DropdownMenuSub.vue'
import DropdownMenuSubContent from '../ui/DropdownMenuSubContent.vue'
import DropdownMenuSubTrigger from '../ui/DropdownMenuSubTrigger.vue'

const props = defineProps<{ actions: AnyActionSchema[]; context: ActionContext }>()
const runner = useActionRunner()

const isDividedGroup = (action: AnyActionSchema | undefined) =>
  action !== undefined && isActionGroup(action) && action.dropdown === false

const itemClass = (color: Color | undefined) =>
  color && color !== 'danger' && color !== 'gray' ? colorClass(textColorClasses, color) : undefined
</script>

<template>
  <template
    v-for="(action, index) in props.actions"
    :key="isActionGroup(action) ? `sub-${index}` : action.name"
  >
    <!-- `dropdown(false)`: a section of this dropdown, divided from its neighbours. -->
    <DropdownMenuGroup
      v-if="isActionGroup(action) && action.dropdown === false"
      data-slot="dropdown-section"
    >
      <DropdownMenuSeparator v-if="index > 0" />
      <ActionGroupItems :actions="action.actions" :context="props.context" />
      <DropdownMenuSeparator
        v-if="index < props.actions.length - 1 && !isDividedGroup(props.actions[index + 1])"
      />
    </DropdownMenuGroup>
    <DropdownMenuSub v-else-if="isActionGroup(action)">
      <DropdownMenuSubTrigger>
        <Icon v-if="action.icon" :name="action.icon" />
        {{ action.label }}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <ActionGroupItems :actions="action.actions" :context="props.context" />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuItem
      v-else
      :disabled="action.disabled"
      :title="action.tooltip"
      :variant="action.color === 'danger' ? 'destructive' : 'default'"
      :class="itemClass(action.color)"
      @select="void runner.trigger(action, props.context)"
    >
      <Icon v-if="action.icon" :name="action.icon" />
      {{ action.label }}
      <Badge
        v-if="action.badge !== undefined && action.badge !== null"
        variant="outline"
        :class="cn('px-1.5 py-0', colorClass(badgeColorClasses, action.badgeColor, 'gray'))"
        >{{ action.badge }}</Badge
      >
      <DropdownMenuShortcut v-if="bindsKeyBindings(action, props.context) && action.keyBindings">{{
        formatKeyBinding(action.keyBindings[0] ?? '')
      }}</DropdownMenuShortcut>
    </DropdownMenuItem>
  </template>
</template>
