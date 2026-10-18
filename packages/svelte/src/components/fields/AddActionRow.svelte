<script lang="ts">
  import { addActionJustify } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/utils'

  /** The row holding the add button, aligned with `addActionAlignment()`. */
  let { alignment, children }: { alignment?: string; children: Snippet } = $props()

  const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end' } as const
</script>

<div class={cn('flex', JUSTIFY[addActionJustify(alignment)])} data-slot="item-add-action">
  {@render children()}
</div>
