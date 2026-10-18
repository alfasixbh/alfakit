<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'
  import { badgeVariants, type BadgeVariant } from './badge'

  let {
    class: className,
    variant = 'default',
    children,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children?: Snippet } = $props()
</script>

<span data-slot="badge" class={cn(badgeVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</span>
