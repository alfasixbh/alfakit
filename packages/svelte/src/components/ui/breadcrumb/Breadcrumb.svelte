<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { useT } from '../../../context.svelte'

  let { children, ...rest }: HTMLAttributes<HTMLElement> & { children?: Snippet } = $props()

  const t = useT()
</script>

<nav data-slot="breadcrumb" aria-label={t('breadcrumbs', {}, 'Breadcrumb')} {...rest}>
  {@render children?.()}
</nav>
