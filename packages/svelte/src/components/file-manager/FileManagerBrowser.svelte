<script lang="ts" module>
  import type { FileManagerEntrySchema, FileManagerSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  type Props = {
    schema: FileManagerSchema
    onChoose?: (entries: FileManagerEntrySchema[]) => void
    onCancel?: () => void
  }

  // The picker's browser: the file manager view in picker mode, loaded on first use.
  const loader = lazyLoader<Props>(() =>
    import('./FileManagerView.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import FileManagerSkeleton from './FileManagerSkeleton.svelte'

  let { schema, onChoose, onCancel }: Props = $props()
</script>

<Lazy {loader} props={{ schema, onChoose, onCancel }}>
  {#snippet fallback()}
    <FileManagerSkeleton />
  {/snippet}
</Lazy>
