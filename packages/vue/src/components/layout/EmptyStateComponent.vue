<script setup lang="ts">
import type { EmptyStateComponentSchema } from '@alfakit/core'
import { colorClass, iconBackgroundColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'
import MixedContent from './MixedContent.vue'

const props = defineProps<{ component: EmptyStateComponentSchema }>()
const context = usePageActionContext()
</script>

<template>
  <div
    data-slot="empty-state"
    :class="
      cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        props.component.contained && 'rounded-xl border border-dashed',
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <div
      v-if="props.component.icon"
      :class="
        cn(
          'flex size-12 items-center justify-center rounded-full',
          colorClass(iconBackgroundColorClasses, props.component.color),
        )
      "
    >
      <Icon :name="props.component.icon" class="size-6" />
    </div>
    <h3 v-if="props.component.heading" class="text-base font-semibold">
      {{ props.component.heading }}
    </h3>
    <div
      v-if="props.component.description"
      class="text-muted-foreground max-w-md text-sm"
      v-html="props.component.description"
    />
    <ActionList
      v-if="props.component.actions && props.component.actions.length > 0"
      :actions="props.component.actions"
      :context="context"
      class="mt-2 justify-center"
    />
    <MixedContent
      :items="props.component.footer"
      name="empty-state-footer"
      class="justify-center"
    />
  </div>
</template>
