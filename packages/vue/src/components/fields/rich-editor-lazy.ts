import { lazyComponent } from '../../lib/lazy'
import RichEditorSkeleton from './RichEditorSkeleton.vue'

/** The rich and Markdown editors; Tiptap loads the first time one is shown. */
export const RichEditorField = lazyComponent(
  'RichEditorField',
  () => import('./RichEditorField.vue').then((module) => module.default),
  RichEditorSkeleton,
)
