<script lang="ts" module>
  import type { TableSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // Spreadsheet mode's code loads the first time a user opens it.
  export const spreadsheetLoader = lazyLoader<{
    table: TableSchema
    token: string
    component: string
    onClose: () => void
  }>(() => import('./Spreadsheet.svelte').then((module) => module.default))
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { Skeleton } from '../ui/skeleton'

  let {
    table,
    token,
    component,
    onClose,
  }: { table: TableSchema; token: string; component: string; onClose: () => void } = $props()
</script>

<Lazy loader={spreadsheetLoader} props={{ table, token, component, onClose }}>
  {#snippet fallback()}
    <div data-slot="spreadsheet" aria-busy="true" class="flex flex-col gap-3">
      <Skeleton class="h-8 w-64" />
      <Skeleton class="h-64" />
    </div>
  {/snippet}
</Lazy>
