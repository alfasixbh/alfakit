import type { PageSchema } from '@alfakit/core'
import type { ComputedRef, InjectionKey } from 'vue'

export type LayoutKind = 'app' | 'auth' | 'blank' | 'fullscreen'

export function layoutKind(page: PageSchema): LayoutKind {
  return page.layout === 'auth' || page.layout === 'blank' || page.layout === 'fullscreen'
    ? page.layout
    : 'app'
}

/** The layout `PanelLayoutHost` already renders around the page, if any. */
export const HOSTED_LAYOUT: InjectionKey<ComputedRef<LayoutKind | null>> =
  Symbol('alfakit.hosted-layout')
