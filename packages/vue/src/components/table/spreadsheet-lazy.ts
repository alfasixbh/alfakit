import { lazyComponent } from '../../lib/lazy'
import SpreadsheetSkeleton from './SpreadsheetSkeleton.vue'

const load = () => import('./Spreadsheet.vue').then((module) => module.default)

/** Spreadsheet mode; its code loads the first time a user opens it. */
export const Spreadsheet = lazyComponent('Spreadsheet', load, SpreadsheetSkeleton)

/** Start loading spreadsheet mode ahead of its first use (hover / focus on the trigger). */
export function preloadSpreadsheet(): void {
  void load()
}
