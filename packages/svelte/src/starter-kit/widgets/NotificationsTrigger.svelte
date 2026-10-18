<script lang="ts">
  import type { StarterKitWidgets } from '@alfakit/core'
  import BellIcon from '@lucide/svelte/icons/bell'

  /** The bell and its unread count until the menu has loaded. */
  let { source }: { source: StarterKitWidgets } = $props()

  const notifications = $derived(source.widgets.notifications)
  const count = $derived(notifications?.unreadCount ?? 0)
</script>

<button
  type="button"
  data-slot="notifications-trigger"
  aria-label={notifications?.label}
  class="hover:bg-accent hover:text-accent-foreground relative inline-flex size-9 items-center justify-center rounded-md"
>
  <BellIcon class="size-4" aria-hidden="true" />
  {#if count > 0}
    <span
      class="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
    >
      {count > 99 ? '99+' : count}
    </span>
  {/if}
</button>
