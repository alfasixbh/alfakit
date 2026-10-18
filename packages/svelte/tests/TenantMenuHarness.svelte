<script lang="ts">
  import TenantMenu from '../src/components/panel/TenantMenu.svelte'
  import { SidebarProvider } from '../src/components/ui/sidebar'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  provideAlfakit(context)
</script>

<SidebarProvider>
  <TenantMenu />
</SidebarProvider>
