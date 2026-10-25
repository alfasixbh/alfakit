<script lang="ts">
  import { Tooltip as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.TriggerProps = $props()
</script>

<!-- With a child snippet the child keeps its own data-slot (an action's `button`). -->
<Primitive.Trigger {...rest.child ? {} : { 'data-slot': 'tooltip-trigger' }} {...rest} />
