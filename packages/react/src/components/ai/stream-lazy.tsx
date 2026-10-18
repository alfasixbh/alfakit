import type { AiStreamSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'

/** A streamed AI answer; its code loads the first time an answer streams. */
export const AiStream = lazyComponent<{ component: AiStreamSchema }>(
  () => import('./stream').then((module) => module.AiStream),
  () => <div data-slot="ai-stream" className="h-12" aria-busy="true" />,
)
