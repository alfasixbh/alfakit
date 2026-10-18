import type { FileManagerSchema } from '@alfakit/core'
import { useT } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import type { FileManagerViewProps } from './file-manager'

/** The server render and the first paint: the file manager's outline. */
export function FileManagerSkeleton({ grid = true }: { grid?: boolean }) {
  const t = useT()

  return (
    <Card className="gap-0 overflow-hidden py-0" aria-busy="true" data-slot="file-manager">
      <span className="sr-only">{t('file-manager.loading', {}, 'Loading files')}</span>
      <div className="flex items-center gap-2 border-b p-3" aria-hidden="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="ms-auto h-9 w-52" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex min-h-[28rem]" aria-hidden="true">
        <div className="hidden w-60 flex-col gap-2 border-e p-3 md:flex">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6" />
          ))}
        </div>
        <div
          className={
            grid
              ? 'grid flex-1 grid-cols-2 content-start gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
              : 'flex flex-1 flex-col gap-2 p-3'
          }
        >
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className={grid ? 'aspect-[4/3]' : 'h-10'} />
          ))}
        </div>
      </div>
    </Card>
  )
}

/** The file manager; its code loads the first time it is shown. */
export const FileManager = lazyComponent<{ component?: FileManagerSchema }>(
  () => import('./file-manager').then((module) => module.FileManager),
  ({ component }) => <FileManagerSkeleton grid={component?.view !== 'list'} />,
)

/** The picker's browser (the same view in picker mode). */
export const FileManagerBrowser = lazyComponent<FileManagerViewProps>(
  () => import('./file-manager').then((module) => module.FileManagerView),
  () => <FileManagerSkeleton />,
)
