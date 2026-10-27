<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { untrack } from 'svelte'
  import { useSidebar } from '../ui/sidebar'

  /**
   * Inside `SidebarProvider`: the layout stays mounted across visits, so the phone sidebar
   * sheet closes when the user moves to another page. Partial reloads (deferred props,
   * polling) keep the URL and leave it open.
   */
  const sidebar = useSidebar()
  let previous = untrack(() => page.url)

  $effect(() => {
    const url = page.url

    if (url === previous) return

    previous = url
    untrack(() => sidebar.setOpenMobile(false))
  })
</script>
