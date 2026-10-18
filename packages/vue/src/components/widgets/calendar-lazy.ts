import { lazyComponent } from '../../lib/lazy'
import CalendarSkeleton from './CalendarSkeleton.vue'

/** The calendar widget; FullCalendar loads the first time a calendar is shown. */
export const CalendarWidget = lazyComponent(
  'CalendarWidget',
  () => import('./CalendarWidget.vue').then((module) => module.default),
  CalendarSkeleton,
)
