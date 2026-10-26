<script lang="ts">
  import { uniqueKey, valueKey } from '../../../lib/keys'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { isSameDay, type DateValue } from '@internationalized/date'
  import { Calendar as CalendarPrimitive } from 'bits-ui'
  import { useT } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'
  import { buttonVariants } from '../button/button'

  type SingleProps = Extract<CalendarPrimitive.RootProps, { type: 'single' }>
  type Props = Omit<SingleProps, 'type' | 'children' | 'child'> & {
    /** "Today" in the field's timezone; Bits UI only knows the browser's. */
    today?: DateValue
  }

  let {
    ref = $bindable(null),
    value = $bindable(),
    placeholder = $bindable(),
    class: className,
    weekdayFormat = 'short',
    today,
    ...rest
  }: Props = $props()

  const t = useT()

  // Bits UI maps ArrowLeft/ArrowRight to previous/next day whatever the direction. In a
  // right-to-left grid we swap the keys and replay the event, so the arrows follow the layout.
  const replayed = new WeakSet<Event>()

  const onkeydowncapture = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (
      replayed.has(event) ||
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
      !target?.hasAttribute('data-bits-day') ||
      (target.closest('[dir]')?.getAttribute('dir') ?? 'ltr') !== 'rtl'
    ) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const swapped = new KeyboardEvent('keydown', {
      key: event.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    })
    replayed.add(swapped)
    target.dispatchEvent(swapped)
  }
</script>

<div class="contents" {onkeydowncapture}>
  <CalendarPrimitive.Root
    bind:ref
    bind:value
    bind:placeholder
    type="single"
    {weekdayFormat}
    data-slot="calendar"
    class={cn('p-3', className)}
    {...rest}
  >
    {#snippet children({ months, weekdays })}
      <CalendarPrimitive.Header class="relative flex w-full items-center justify-between pt-1">
        <CalendarPrimitive.PrevButton
          class={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          )}
        >
          <!-- Bits UI sets its own English label after the props, so the button is ours. -->
          {#snippet child({ props })}
            <button {...props} aria-label={t('form.previous_month', {}, 'Previous month')}>
              <ChevronLeftIcon class="size-4 rtl:rotate-180" />
            </button>
          {/snippet}
        </CalendarPrimitive.PrevButton>
        <CalendarPrimitive.Heading class="text-sm font-medium" />
        <CalendarPrimitive.NextButton
          class={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          )}
        >
          <!-- Bits UI sets its own English label after the props, so the button is ours. -->
          {#snippet child({ props })}
            <button {...props} aria-label={t('form.next_month', {}, 'Next month')}>
              <ChevronRightIcon class="size-4 rtl:rotate-180" />
            </button>
          {/snippet}
        </CalendarPrimitive.NextButton>
      </CalendarPrimitive.Header>
      <div class="mt-4 flex flex-col gap-4 sm:flex-row">
        {#each months as month (month.value.toString())}
          <CalendarPrimitive.Grid class="w-full border-collapse space-y-1 select-none">
            <CalendarPrimitive.GridHead>
              <CalendarPrimitive.GridRow class="flex">
                {#each weekdays as weekday, weekdayIndex (uniqueKey(weekdays, weekdayIndex, valueKey))}
                  <CalendarPrimitive.HeadCell
                    class="text-muted-foreground w-8 rounded-md text-[0.8rem] font-normal"
                  >
                    {weekday}
                  </CalendarPrimitive.HeadCell>
                {/each}
              </CalendarPrimitive.GridRow>
            </CalendarPrimitive.GridHead>
            <CalendarPrimitive.GridBody>
              {#each month.weeks as weekDates, weekIndex (weekIndex)}
                <CalendarPrimitive.GridRow class="mt-2 flex w-full">
                  {#each weekDates as date (date.toString())}
                    <CalendarPrimitive.Cell
                      {date}
                      month={month.value}
                      class="[&:has([data-selected])]:bg-accent relative size-8 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:rounded-md"
                    >
                      <CalendarPrimitive.Day
                        class={cn(
                          buttonVariants({ variant: 'ghost' }),
                          today
                            ? isSameDay(date, today) && 'bg-accent text-accent-foreground'
                            : 'data-[today]:bg-accent data-[today]:text-accent-foreground',
                          'data-[disabled]:text-muted-foreground data-[outside-month]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[unavailable]:text-destructive size-8 p-0 font-normal data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[outside-month]:pointer-events-none data-[outside-month]:opacity-50 data-[selected]:opacity-100 data-[unavailable]:line-through',
                        )}
                      />
                    </CalendarPrimitive.Cell>
                  {/each}
                </CalendarPrimitive.GridRow>
              {/each}
            </CalendarPrimitive.GridBody>
          </CalendarPrimitive.Grid>
        {/each}
      </div>
    {/snippet}
  </CalendarPrimitive.Root>
</div>
