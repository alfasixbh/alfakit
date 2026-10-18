<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: { href: string; children?: Snippet; prefetch?: boolean; [key: string]: unknown } = $props()
</script>

<a {href} {...rest}>{@render children?.()}</a>
