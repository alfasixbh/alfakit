<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import type { Snippet } from 'svelte'
  import type { HTMLLiAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'
  import Icon from '../../../lib/Icon.svelte'

  let { class: className, children, ...rest }: HTMLLiAttributes & { children?: Snippet } = $props()
</script>

<li
  data-slot="breadcrumb-separator"
  role="presentation"
  aria-hidden="true"
  class={cn('[&>svg]:size-3.5 rtl:[&>svg]:rotate-180', className)}
  {...rest}
>
  {#if children}
    {@render children()}
  {:else}
    <Icon
      name="alfakit::support.breadcrumbs.separator"
      fallback={ChevronRightIcon}
      class="rtl:rotate-180"
    />
  {/if}
</li>
