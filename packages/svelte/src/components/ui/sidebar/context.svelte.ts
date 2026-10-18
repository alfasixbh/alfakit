import { getContext, setContext } from 'svelte'

export const SIDEBAR_COOKIE_NAME = 'alfakit_sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
export const SIDEBAR_WIDTH_ICON = '3rem'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

const SIDEBAR_CONTEXT = Symbol.for('alfakit.sidebar')

export class SidebarState {
  #open = $state(true)
  openMobile = $state(false)
  readonly isMobile: { readonly current: boolean }

  constructor(options: { defaultOpen: boolean; isMobile: { readonly current: boolean } }) {
    this.#open = options.defaultOpen
    this.isMobile = options.isMobile
  }

  get open(): boolean {
    return this.#open
  }

  set open(value: boolean) {
    this.setOpen(value)
  }

  get state(): 'expanded' | 'collapsed' {
    return this.#open ? 'expanded' : 'collapsed'
  }

  setOpen(value: boolean): void {
    this.#open = value

    if (typeof document !== 'undefined') {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    }
  }

  setOpenMobile(value: boolean): void {
    this.openMobile = value
  }

  toggle(): void {
    if (this.isMobile.current) {
      this.openMobile = !this.openMobile
    } else {
      this.setOpen(!this.#open)
    }
  }
}

export function setSidebar(state: SidebarState): SidebarState {
  return setContext(SIDEBAR_CONTEXT, state)
}

export function useSidebar(): SidebarState {
  const context = getContext<SidebarState | undefined>(SIDEBAR_CONTEXT)

  if (!context) {
    throw new Error('useSidebar() must be used within a <SidebarProvider>.')
  }

  return context
}
