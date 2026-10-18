import { lazyComponent } from '../../lib/lazy'
import { Skeleton } from '../ui/skeleton'
import type { SpreadsheetProps } from './spreadsheet'

/** Spreadsheet mode; its code loads the first time a user opens it. */
export const Spreadsheet = lazyComponent<SpreadsheetProps>(
  () => import('./spreadsheet').then((module) => module.Spreadsheet),
  () => (
    <div data-slot="spreadsheet" aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64" />
    </div>
  ),
)
