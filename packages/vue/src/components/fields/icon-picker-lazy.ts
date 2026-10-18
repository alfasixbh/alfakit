import { lazyComponent } from '../../lib/lazy'
import IconPickerPlaceholder from './IconPickerPlaceholder.vue'

/** The icon picker; its code loads the first time one is shown in the browser. */
export const IconPickerField = lazyComponent(
  'IconPickerField',
  () => import('./IconPickerField.vue').then((module) => module.default),
  IconPickerPlaceholder,
)
