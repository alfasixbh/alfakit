<script setup lang="ts">
import type { CalendarWidgetSchema } from '@alfakit/core'
import { useT } from '../../context'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import Skeleton from '../ui/Skeleton.vue'

/** The server render and the first paint: the calendar's outline, without FullCalendar. */
const props = defineProps<{ widget: CalendarWidgetSchema }>()
const t = useT()
</script>

<template>
  <Card class="gap-4 py-4" aria-busy="true" data-slot="calendar-widget">
    <CardContent class="flex flex-col gap-4 px-5">
      <span class="sr-only">{{ t('calendar.loading', {}, 'Loading calendar') }}</span>
      <Skeleton v-if="props.widget.heading" class="h-5 w-1/3" aria-hidden="true" />
      <div class="flex items-center justify-between gap-3" aria-hidden="true">
        <Skeleton class="h-8 w-28" />
        <Skeleton class="h-6 w-40" />
        <Skeleton class="h-8 w-40" />
      </div>
      <Skeleton class="h-[28rem]" aria-hidden="true" />
    </CardContent>
  </Card>
</template>
