import { lazyComponent } from '../../lib/lazy'
import HelpdeskInboxSkeleton from './HelpdeskInboxSkeleton.vue'

/** The helpdesk inbox; its code loads the first time the inbox is shown. */
export const HelpdeskInbox = lazyComponent(
  'HelpdeskInbox',
  () => import('./HelpdeskInbox.vue').then((module) => module.default),
  HelpdeskInboxSkeleton,
)
