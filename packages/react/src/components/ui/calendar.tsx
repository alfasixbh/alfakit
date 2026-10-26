import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { DayPicker } from 'react-day-picker'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { buttonVariants } from './button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const t = useT()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      labels={{
        labelPrevious: () => t('form.previous_month', {}, 'Previous month'),
        labelNext: () => t('form.next_month', {}, 'Next month'),
        ...props.labels,
      }}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1 absolute inset-x-0 top-3 justify-between px-3 pointer-events-none',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'pointer-events-auto size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'pointer-events-auto size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-e-md first:[&:has([aria-selected])]:rounded-s-md last:[&:has([aria-selected])]:rounded-e-md',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-8 p-0 font-normal aria-selected:opacity-100',
        ),
        range_start:
          'day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground',
        range_end: 'day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
        today: 'bg-accent text-accent-foreground rounded-md',
        outside: 'day-outside text-muted-foreground aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className={cn('size-4', chevronClassName)} {...rest} />
          ) : (
            <ChevronRightIcon className={cn('size-4', chevronClassName)} {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
