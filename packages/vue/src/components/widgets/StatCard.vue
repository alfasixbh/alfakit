<script setup lang="ts">
import { isolationDirection, type StatSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import {
  colorClass,
  cssColor,
  iconBackgroundColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Card from '../ui/Card.vue'
import Sparkline from './Sparkline.vue'
import NewTabHint from '../../lib/NewTabHint.vue'

const props = defineProps<{ stat: StatSchema }>()
</script>

<template>
  <component
    :is="props.stat.url ? (props.stat.openUrlInNewTab ? 'a' : Link) : 'div'"
    v-bind="
      props.stat.url
        ? props.stat.openUrlInNewTab
          ? { href: props.stat.url, target: '_blank', rel: 'noopener noreferrer' }
          : { href: props.stat.url }
        : {}
    "
    class="contents"
  >
    <Card
      :class="
        cn(
          'relative gap-2 overflow-hidden px-5 py-4',
          props.stat.url && 'hover:bg-accent/40 transition-colors',
        )
      "
      v-bind="props.stat.extraAttributes"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-sm font-medium"
            ><bdi>{{ props.stat.label }}</bdi></span
          >
          <span
            v-if="(props.stat.value === null || props.stat.value === '') && props.stat.placeholder"
            class="text-muted-foreground text-2xl font-semibold tracking-tight"
            data-slot="stat-placeholder"
            >{{ props.stat.placeholder }}</span
          >
          <span
            v-else
            :class="
              cn(
                'text-2xl font-semibold tracking-tight',
                props.stat.color && textColorClasses[props.stat.color],
              )
            "
            ><bdi :dir="isolationDirection(props.stat.value)">{{ props.stat.value }}</bdi></span
          >
          <span
            v-if="props.stat.description"
            :class="
              cn(
                'inline-flex items-center gap-1 text-xs',
                props.stat.descriptionColor
                  ? textColorClasses[props.stat.descriptionColor]
                  : 'text-muted-foreground',
              )
            "
          >
            <Icon
              v-if="props.stat.descriptionIcon && props.stat.descriptionIconPosition !== 'after'"
              :name="props.stat.descriptionIcon"
              class="size-3.5"
            />
            <!-- Mixed-direction text (a Latin "-3% this month" in Arabic) keeps its order. -->
            <bdi :dir="isolationDirection(props.stat.description)">{{
              props.stat.description
            }}</bdi>
            <Icon
              v-if="props.stat.descriptionIcon && props.stat.descriptionIconPosition === 'after'"
              :name="props.stat.descriptionIcon"
              class="size-3.5"
            />
          </span>
        </div>
        <span
          v-if="props.stat.icon"
          :class="
            cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              colorClass(iconBackgroundColorClasses, props.stat.color, 'gray'),
            )
          "
        >
          <Icon :name="props.stat.icon" class="size-5" />
        </span>
      </div>
      <Sparkline
        v-if="props.stat.chart && props.stat.chart.length > 1"
        :data="props.stat.chart"
        :color="cssColor(props.stat.chartColor ?? props.stat.color)"
      />
    </Card>
    <NewTabHint v-if="props.stat.url && props.stat.openUrlInNewTab" />
  </component>
</template>
