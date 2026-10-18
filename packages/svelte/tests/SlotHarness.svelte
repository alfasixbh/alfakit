<script lang="ts">
  import Slot from '../src/components/panel/Slot.svelte'

  let { name, data }: { name: string; data?: Record<string, unknown> } = $props()
</script>

<div data-testid="host"><Slot {name} {data} /></div>
