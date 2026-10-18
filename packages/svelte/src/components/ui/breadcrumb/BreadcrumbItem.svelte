<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLLiAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let { class: className, children, ...rest }: HTMLLiAttributes & { children?: Snippet } = $props()
</script>

<li data-slot="breadcrumb-item" class={cn('inline-flex items-center gap-1.5', className)} {...rest}>
  {@render children?.()}
</li>
