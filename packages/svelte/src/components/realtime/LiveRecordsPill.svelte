<script lang="ts">
  import type { LiveUpdates } from '@alfakit/core'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import { useChoice } from '../../context.svelte'
  import { Button } from '../ui/button'

  /** "3 new records — show": created records the table doesn't show yet. */
  let { live, pending }: { live: LiveUpdates; pending: number } = $props()

  const choice = useChoice()
</script>

<div data-slot="live-records" aria-live="polite" class="flex justify-center">
  {#if pending > 0}
    <Button
      size="sm"
      variant="secondary"
      class="rounded-full shadow-sm"
      onclick={() => void live.showPending()}
    >
      <ArrowUpIcon aria-hidden="true" />
      {choice(
        'realtime.new_records',
        pending,
        {},
        '{1} :count new record — show|[2,*] :count new records — show',
      )}
    </Button>
  {/if}
</div>
