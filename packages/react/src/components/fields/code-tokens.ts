import type { CodeTokenKind } from '@alfakit/core'

/** Token colours; spelled out so Tailwind keeps them. */
export const codeTokenClasses: Record<CodeTokenKind, string> = {
  plain: '',
  comment: 'text-muted-foreground italic',
  string: 'text-emerald-700 dark:text-emerald-400',
  number: 'text-amber-700 dark:text-amber-400',
  keyword: 'text-violet-700 dark:text-violet-400',
  literal: 'text-orange-700 dark:text-orange-400',
  tag: 'text-sky-700 dark:text-sky-400',
  attribute: 'text-amber-800 dark:text-amber-300',
  property: 'text-sky-800 dark:text-sky-300',
  variable: 'text-rose-700 dark:text-rose-400',
}
