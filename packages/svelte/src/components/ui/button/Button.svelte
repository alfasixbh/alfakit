<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { Link } from '@inertiajs/svelte'
  import { cn } from '../../../lib/utils'
  import { buttonVariants, type ButtonSize, type ButtonVariant } from './button'

  type Props = HTMLButtonAttributes & {
    ref?: HTMLElement | null
    variant?: ButtonVariant
    size?: ButtonSize
    /** Render an Inertia link instead of a button. */
    href?: string | null
    /** Plain anchor (no Inertia visit), e.g. for new-tab or download links. */
    external?: boolean
    target?: string
    rel?: string
    download?: boolean | string
    children?: Snippet
  }

  let {
    ref = $bindable(null),
    class: className,
    variant = 'default',
    size = 'default',
    href,
    external = false,
    type = 'button',
    disabled,
    target,
    rel,
    download,
    children,
    ...rest
  }: Props = $props()

  const classes = $derived(cn(buttonVariants({ variant, size }), className))
  const anchorRest = $derived(rest as Record<string, unknown>)
</script>

{#if href && external}
  <a
    bind:this={ref}
    data-slot="button"
    class={classes}
    {href}
    {target}
    {rel}
    {download}
    aria-disabled={disabled || undefined}
    tabindex={disabled ? -1 : undefined}
    {...anchorRest}
  >
    {@render children?.()}
  </a>
{:else if href}
  <Link
    {href}
    data-slot="button"
    class={classes}
    aria-disabled={disabled || undefined}
    tabindex={disabled ? -1 : undefined}
    {...anchorRest}
  >
    {@render children?.()}
  </Link>
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    class={classes}
    {type}
    disabled={disabled || undefined}
    {...rest}
  >
    {@render children?.()}
  </button>
{/if}
