<script lang="ts">
  import AppSidebar from '../src/components/panel/AppSidebar.svelte'
  import Topbar from '../src/components/panel/Topbar.svelte'
  import { SidebarProvider } from '../src/components/ui/sidebar'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  let { open = true }: { open?: boolean } = $props()

  provideAlfakit(context)
</script>

<SidebarProvider defaultOpen={open}>
  <AppSidebar />
  <Topbar />
</SidebarProvider>
