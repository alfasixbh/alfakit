<script setup lang="ts">
import type { DebugNode } from '@alfakit/core'
import { ChevronRightIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import CollapsibleTrigger from '../ui/CollapsibleTrigger.vue'

/** One node of the debug panel's schema tree, collapsible when it has children. */
const props = defineProps<{ node: DebugNode; depth: number }>()
const t = useT()
const open = ref(props.depth < 2)
const children = computed(() => props.node.children ?? [])
const details = computed(() =>
  Object.entries(props.node.details ?? {}).filter(
    ([, value]) => value !== null && value !== false && value !== '',
  ),
)
const badge = computed(() =>
  props.node.authorized === false
    ? t('debug.unauthorized', {}, 'unauthorized')
    : (props.node.reason ?? t('debug.hidden', {}, 'hidden')),
)
</script>

<template>
  <li :style="{ paddingInlineStart: `${props.depth * 12}px` }">
    <Collapsible v-if="children.length > 0" v-model:open="open">
      <CollapsibleTrigger class="hover:bg-muted/60 w-full rounded text-start">
        <div
          :class="
            cn(
              'flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5',
              !props.node.visible && 'text-muted-foreground',
            )
          "
        >
          <ChevronRightIcon
            :class="
              cn(
                'size-3.5 shrink-0 transition-transform rtl:rotate-180',
                open && 'rotate-90 rtl:rotate-90',
              )
            "
          />
          <span :class="cn('font-semibold', !props.node.visible && 'line-through')">{{
            props.node.type
          }}</span>
          <span v-if="props.node.key" class="truncate">{{ props.node.key }}</span>
          <span
            v-if="props.node.label && props.node.label !== props.node.key"
            class="text-muted-foreground truncate"
            >“{{ props.node.label }}”</span
          >
          <span v-for="[name, value] in details" :key="name" class="text-muted-foreground truncate">
            {{ value === true ? name : `${name}=${String(value)}` }}
          </span>
          <Badge
            v-if="!props.node.visible"
            :variant="props.node.authorized === false ? 'destructive' : 'outline'"
            class="ms-auto shrink-0 font-sans"
            >{{ badge }}</Badge
          >
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="space-y-0.5">
          <DebugTreeNode
            v-for="(child, index) in children"
            :key="`${child.key ?? child.type}-${index}`"
            :node="child"
            :depth="1"
          />
        </ul>
      </CollapsibleContent>
    </Collapsible>
    <div
      v-else
      :class="
        cn(
          'flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5',
          !props.node.visible && 'text-muted-foreground',
        )
      "
    >
      <span class="size-3.5 shrink-0" />
      <span :class="cn('font-semibold', !props.node.visible && 'line-through')">{{
        props.node.type
      }}</span>
      <span v-if="props.node.key" class="truncate">{{ props.node.key }}</span>
      <span
        v-if="props.node.label && props.node.label !== props.node.key"
        class="text-muted-foreground truncate"
        >“{{ props.node.label }}”</span
      >
      <span v-for="[name, value] in details" :key="name" class="text-muted-foreground truncate">
        {{ value === true ? name : `${name}=${String(value)}` }}
      </span>
      <Badge
        v-if="!props.node.visible"
        :variant="props.node.authorized === false ? 'destructive' : 'outline'"
        class="ms-auto shrink-0 font-sans"
        >{{ badge }}</Badge
      >
    </div>
  </li>
</template>
