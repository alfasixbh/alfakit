<script lang="ts">
  import type { HelpdeskInboxSchema } from '@alfakit/core'
  import HelpdeskInboxView from './HelpdeskInboxView.svelte'

  /**
   * The helpdesk agent inbox (schema component `helpdesk:inbox`, alfasix/alfakit-helpdesk):
   * views, the ticket list and the conversation side by side, a quick composer, keyboard
   * shortcuts (`j` / `k`, `r`, `n`, `/`) and live updates.
   */
  let { component }: { component: HelpdeskInboxSchema } = $props()
</script>

{#key component.actionComponent}
  <HelpdeskInboxView schema={component} />
{/key}
