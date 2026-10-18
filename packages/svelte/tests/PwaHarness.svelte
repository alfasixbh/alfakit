<script lang="ts">
  import PwaManager from '../src/components/panel/PwaManager.svelte'
  import UserMenu from '../src/components/panel/UserMenu.svelte'
  import { TooltipProvider } from '../src/components/ui/tooltip'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  let { kind }: { kind: 'user-menu' | 'manager' } = $props()

  provideAlfakit(context)
</script>

<TooltipProvider>
  {#if kind === 'user-menu'}
    <UserMenu variant="topbar" />
  {:else}
    <PwaManager />
  {/if}
</TooltipProvider>
