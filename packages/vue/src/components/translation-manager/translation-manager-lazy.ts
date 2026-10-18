import { lazyComponent } from '../../lib/lazy'
import TranslationManagerSkeleton from './TranslationManagerSkeleton.vue'

/** The translation editor; its code loads the first time it is shown. */
export const TranslationManager = lazyComponent(
  'TranslationManager',
  () => import('./TranslationManager.vue').then((module) => module.default),
  TranslationManagerSkeleton,
)
