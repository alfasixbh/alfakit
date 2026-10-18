<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  const variants: Record<'default' | 'destructive', string> = {
    default: 'bg-card text-card-foreground',
    destructive:
      'bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
  }

  let {
    class: className,
    variant = 'default',
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive'
    children?: Snippet
  } = $props()
</script>

<div
  data-slot="alert"
  role="alert"
  class={cn(
    'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
    variants[variant],
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
