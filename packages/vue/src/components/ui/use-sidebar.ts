import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export const SIDEBAR_COOKIE_NAME = 'alfakit_sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
export const SIDEBAR_WIDTH_ICON = '3rem'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

export interface SidebarContext {
  state: ComputedRef<'expanded' | 'collapsed'>
  open: Ref<boolean>
  setOpen: (open: boolean) => void
  openMobile: Ref<boolean>
  setOpenMobile: (open: boolean) => void
  isMobile: Ref<boolean>
  toggleSidebar: () => void
}

export const SIDEBAR_KEY: InjectionKey<SidebarContext> = Symbol('alfakit.sidebar')

export function provideSidebar(context: SidebarContext): void {
  provide(SIDEBAR_KEY, context)
}

export function useSidebar(): SidebarContext {
  const context = inject(SIDEBAR_KEY, null)

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }

  return context
}
