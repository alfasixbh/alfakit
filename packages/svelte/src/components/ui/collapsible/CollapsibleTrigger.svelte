<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'

  let { ref = $bindable(null), ...rest }: CollapsiblePrimitive.TriggerProps = $props()
</script>

<CollapsiblePrimitive.Trigger bind:ref data-slot="collapsible-trigger" {...rest} />
