<script setup lang="ts">
import { isSameDay, type DateValue } from '@internationalized/date'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
  useForwardPropsEmits,
  type CalendarRootEmits,
  type CalendarRootProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { buttonVariants } from './button'

const props = defineProps<
  CalendarRootProps & {
    class?: HTMLAttributes['class']
    /** "Today" in the field's timezone; reka-ui only knows the browser's. */
    today?: DateValue
  }
>()
const emits = defineEmits<CalendarRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class', 'today'), emits)
const t = useT()
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    v-bind="forwarded"
    data-slot="calendar"
    :class="cn('p-3', props.class)"
  >
    <CalendarHeader class="relative flex w-full items-center justify-center pt-1">
      <CalendarPrev
        :aria-label="t('form.previous_month', {}, 'Previous month')"
        :class="
          cn(
            buttonVariants({ variant: 'outline' }),
            'absolute start-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          )
        "
      >
        <ChevronLeftIcon class="size-4 rtl:rotate-180" />
      </CalendarPrev>
      <CalendarHeading class="text-sm font-medium" />
      <CalendarNext
        :aria-label="t('form.next_month', {}, 'Next month')"
        :class="
          cn(
            buttonVariants({ variant: 'outline' }),
            'absolute end-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          )
        "
      >
        <ChevronRightIcon class="size-4 rtl:rotate-180" />
      </CalendarNext>
    </CalendarHeader>
    <div class="mt-4 flex flex-col gap-y-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <CalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="w-full border-collapse space-y-1"
      >
        <CalendarGridHead>
          <CalendarGridRow class="flex">
            <CalendarHeadCell
              v-for="day in weekDays"
              :key="day"
              class="text-muted-foreground w-8 rounded-md text-[0.8rem] font-normal"
            >
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 flex w-full"
          >
            <CalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
              class="[&:has([data-selected])]:bg-accent relative size-8 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:rounded-md"
            >
              <CalendarCellTrigger
                :day="weekDate"
                :month="month.value"
                :class="
                  cn(
                    buttonVariants({ variant: 'ghost' }),
                    'size-8 p-0 font-normal',
                    props.today
                      ? isSameDay(weekDate, props.today) && 'bg-accent text-accent-foreground'
                      : 'data-[today]:bg-accent data-[today]:text-accent-foreground',
                    'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground data-[selected]:opacity-100',
                    'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
                    'data-[unavailable]:text-destructive data-[unavailable]:line-through',
                    'data-[outside-view]:text-muted-foreground',
                  )
                "
              />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
