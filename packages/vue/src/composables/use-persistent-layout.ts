import { usePage } from '@inertiajs/vue3'
import { defineComponent, ref, watch, type Ref } from 'vue'
import { useSidebar } from '../components/ui/use-sidebar'

/**
 * Calls `close` when the user moves to another page. The panel layout persists across
 * visits, so menus and sheets that used to be reset by remounting close here instead.
 * Partial reloads (deferred props, polling) keep the URL and leave them open.
 */
export function useCloseOnVisit(close: () => void): void {
  const page = usePage()

  watch(
    () => page.url,
    (url, previous) => {
      if (url !== previous) close()
    },
  )
}

/**
 * Open state of a collapsible menu entry: `defaultOpen` at first, and opened again when the
 * entry becomes active. The sidebar stays mounted across visits, so it keeps what the user
 * opened or closed, while a page reached from elsewhere still shows its menu entry.
 */
export function useOpenWhenActive(defaultOpen: () => boolean, active: () => boolean): Ref<boolean> {
  const open = ref(defaultOpen())

  watch(active, (value) => {
    if (value) open.value = true
  })

  return open
}

/**
 * Inside `SidebarProvider`: the layout stays mounted across visits, so the phone sidebar
 * sheet closes when the user moves to another page.
 */
export const CloseMobileSidebarOnVisit = defineComponent({
  name: 'CloseMobileSidebarOnVisit',
  setup() {
    const sidebar = useSidebar()

    useCloseOnVisit(() => sidebar.setOpenMobile(false))

    return () => null
  },
})
