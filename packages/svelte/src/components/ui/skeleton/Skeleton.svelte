<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let { class: className, ...rest }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div
  data-slot="skeleton"
  class={cn('bg-accent animate-pulse rounded-md', className)}
  {...rest}
></div>
