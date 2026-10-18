<script lang="ts">
  import { initials, tenantNameText, type StarterKitWidgets } from '@alfakit/core'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'

  /** The current tenant (or an empty avatar) until the switcher has loaded: a placeholder. */
  let { source }: { source: StarterKitWidgets } = $props()

  const current = $derived(source.widgets.tenancy?.current)
</script>

<button
  type="button"
  data-slot="tenant-menu"
  aria-hidden="true"
  tabindex="-1"
  class="hover:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
>
  <span class="bg-muted flex size-6 items-center justify-center rounded-md text-[10px]">
    {current ? initials(tenantNameText(current)) : ''}
  </span>
  {#if current}
    <span class="sr-only min-w-0 truncate lg:not-sr-only">{tenantNameText(current)}</span>
  {/if}
  <ChevronsUpDownIcon class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
</button>
