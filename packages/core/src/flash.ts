import type { Page } from '@inertiajs/core'
import type { ActionResultFlash } from './schema/actions'
import type { NotificationSchema } from './schema/notifications'

/** What AlfaKit flashes through `Inertia::flash()` on action and notification responses. */
export interface AlfakitFlash {
  alfakitAction?: Omit<ActionResultFlash, 'status'> & { status: string }
  alfakitNotifications?: NotificationSchema[]
  /**
   * `refreshFormData([...])` on Edit/View pages: new values for some paths of a page form
   * (`component`), copied into the form without touching the user's other edits.
   */
  alfakitFormRefresh?: { component: string; state: Record<string, unknown> }
}

/**
 * Flash data of an Inertia page. Inertia 3 delivers it as `page.flash`; apps that share it
 * as a prop (or older adapters) put it under `props.flash`, so both are read.
 */
export function pageFlash(page: Pick<Page, 'props'> & { flash?: unknown }): AlfakitFlash {
  const top = page.flash
  const inProps = (page.props as { flash?: unknown }).flash

  return (
    isObject(top) && Object.keys(top).length > 0 ? top : isObject(inProps) ? inProps : {}
  ) as AlfakitFlash
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
