import { lazyComponent } from '../../lib/lazy'
import CodeEditorPlaceholder from './CodeEditorPlaceholder.vue'

/** The code editor; its code loads the first time one is shown in the browser. */
export const CodeEditorField = lazyComponent(
  'CodeEditorField',
  () => import('./CodeEditorField.vue').then((module) => module.default),
  CodeEditorPlaceholder,
)
