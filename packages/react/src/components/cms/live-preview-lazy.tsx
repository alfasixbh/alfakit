import type { CmsLivePreviewSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'

/** The live preview; its code loads the first time a page editor is opened. */
export const CmsLivePreview = lazyComponent<{ component: CmsLivePreviewSchema }>(
  () => import('./live-preview').then((module) => module.CmsLivePreview),
  () => <div data-slot="cms-live-preview" className="h-8" aria-hidden="true" />,
)
