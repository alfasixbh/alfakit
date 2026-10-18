import { lazyComponent } from '../../lib/lazy'
import ChartSkeleton from './ChartSkeleton.vue'

/** The chart widget; Chart.js loads the first time a chart is shown. */
export const ChartWidget = lazyComponent(
  'ChartWidget',
  () => import('./ChartWidget.vue').then((module) => module.default),
  ChartSkeleton,
)
