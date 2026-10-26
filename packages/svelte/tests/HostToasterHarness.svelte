<script lang="ts">
  import AlfakitRoot from '../src/AlfakitRoot.svelte'
  import { provideAlfakit } from '../src/context.svelte'
  import { AlfakitToaster } from '../src/standalone'
  import { AlfakitNotifications, AlfakitSearch } from '../src/starter-kit'
  import { context } from './mocks'

  // W-S1-03: the header components on a host page, alone or next to a toaster.
  let { next = 'search' }: { next?: 'search' | 'toaster' | 'root' } = $props()

  provideAlfakit(context)
</script>

<AlfakitNotifications />
{#if next === 'search'}
  <AlfakitSearch />
{:else if next === 'toaster'}
  <AlfakitToaster />
{:else}
  <AlfakitRoot><div></div></AlfakitRoot>
{/if}
