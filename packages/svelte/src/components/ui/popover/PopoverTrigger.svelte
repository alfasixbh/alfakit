<script lang="ts">
  import { Popover as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.TriggerProps = $props()
</script>

<Primitive.Trigger data-slot="popover-trigger" {...rest} />
