<script lang="ts">
  import { SidebarTrigger } from '../ui/sidebar'
  import TopbarLocaleSwitcher from './TopbarLocaleSwitcher.svelte'

  /**
   * Stands in for the top bar on phones when the panel has `topbar(false)`: the sidebar
   * toggle has to stay reachable.
   */
</script>

<header
  data-slot="topbar"
  data-variant="mobile"
  class="bg-background/80 sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b px-4 backdrop-blur md:hidden"
>
  <SidebarTrigger class="-ms-1" />
  <div class="ms-auto flex items-center gap-1">
    <TopbarLocaleSwitcher />
  </div>
</header>
