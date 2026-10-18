<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui'

  let { ref = $bindable(null), ...rest }: CollapsiblePrimitive.ContentProps = $props()
</script>

<CollapsiblePrimitive.Content bind:ref data-slot="collapsible-content" {...rest} />
