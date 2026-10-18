import { lazyComponent } from '../../lib/lazy'
import FileManagerSkeleton from './FileManagerSkeleton.vue'

/** The file manager; its code loads the first time it is shown. */
export const FileManager = lazyComponent(
  'FileManager',
  () => import('./FileManager.vue').then((module) => module.default),
  FileManagerSkeleton,
)

/** The picker's browser (the same view in picker mode). */
export const FileManagerBrowser = lazyComponent(
  'FileManagerBrowser',
  () => import('./FileManagerView.vue').then((module) => module.default),
  FileManagerSkeleton,
)
