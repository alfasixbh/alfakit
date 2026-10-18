import { lazyComponent } from '../../lib/lazy'
import KanbanSkeleton from './KanbanSkeleton.vue'

/** The Kanban board; its code loads the first time a board is shown. */
export const Kanban = lazyComponent(
  'Kanban',
  () => import('./Kanban.vue').then((module) => module.default),
  KanbanSkeleton,
)
