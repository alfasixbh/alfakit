import { lazyComponent } from '../../lib/lazy'
import TreeSkeleton from './TreeSkeleton.vue'

/** The tree; its code loads the first time a tree is shown. */
export const Tree = lazyComponent(
  'Tree',
  () => import('./Tree.vue').then((module) => module.default),
  TreeSkeleton,
)
