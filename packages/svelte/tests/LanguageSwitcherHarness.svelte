<script lang="ts">
  import Topbar from '../src/components/panel/Topbar.svelte'
  import UserMenu from '../src/components/panel/UserMenu.svelte'
  import { SidebarProvider } from '../src/components/ui/sidebar'
  import { TooltipProvider } from '../src/components/ui/tooltip'
  import { provideAlfakit } from '../src/context.svelte'
  import AppLayout from '../src/layouts/AppLayout.svelte'
  import { context } from './mocks'

  let { kind }: { kind: 'topbar' | 'user-menu' | 'app' } = $props()

  provideAlfakit(context)
</script>

<TooltipProvider>
  {#if kind === 'topbar'}
    <SidebarProvider><Topbar /></SidebarProvider>
  {:else if kind === 'user-menu'}
    <UserMenu variant="topbar" />
  {:else}
    <AppLayout><p>Body</p></AppLayout>
  {/if}
</TooltipProvider>
