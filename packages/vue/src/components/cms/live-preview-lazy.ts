import { lazyComponent } from '../../lib/lazy'
import LivePreviewSkeleton from './LivePreviewSkeleton.vue'

/** The live preview; its code loads the first time a page editor is opened. */
export const CmsLivePreview = lazyComponent(
  'CmsLivePreview',
  () => import('./LivePreview.vue').then((module) => module.default),
  LivePreviewSkeleton,
)
