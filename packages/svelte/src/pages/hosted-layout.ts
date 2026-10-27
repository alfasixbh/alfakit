import type { PageSchema } from '@alfakit/core'
import { getContext, setContext } from 'svelte'

export type LayoutKind = 'app' | 'auth' | 'blank' | 'fullscreen'

export function layoutKind(page: PageSchema): LayoutKind {
  return page.layout === 'auth' || page.layout === 'blank' || page.layout === 'fullscreen'
    ? page.layout
    : 'app'
}

const HOSTED_LAYOUT = Symbol('alfakit.hosted-layout')

interface HostedLayout {
  readonly current: LayoutKind | null
}

/** Called by `PanelLayoutHost`: the layout it renders around the page (reactive). */
export function setHostedLayout(hosted: HostedLayout): void {
  setContext(HOSTED_LAYOUT, hosted)
}

/** The layout `PanelLayoutHost` already renders around the page, if any (reactive). */
export function useHostedLayout(): HostedLayout | undefined {
  return getContext<HostedLayout | undefined>(HOSTED_LAYOUT)
}
