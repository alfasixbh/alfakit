<script lang="ts">
  import { Tooltip as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.TriggerProps = $props()
</script>

<Primitive.Trigger data-slot="tooltip-trigger" {...rest} />
