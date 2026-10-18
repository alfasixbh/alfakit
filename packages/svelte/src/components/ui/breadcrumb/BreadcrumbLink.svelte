<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Link } from '@inertiajs/svelte'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    href,
    children,
    ...rest
  }: { class?: string; href: string; children?: Snippet; [key: string]: unknown } = $props()
</script>

<Link
  data-slot="breadcrumb-link"
  {href}
  class={cn('hover:text-foreground transition-colors', className)}
  {...rest}
>
  {@render children?.()}
</Link>
