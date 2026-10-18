<script lang="ts">
  import type { BaseEntry } from '@alfakit/core'

  let { entry }: { entry: BaseEntry } = $props()
</script>

<span class="text-muted-foreground">{entry.placeholder ?? '—'}</span>
