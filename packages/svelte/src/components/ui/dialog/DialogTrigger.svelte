<script lang="ts">
  import { Dialog as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.TriggerProps = $props()
</script>

<Primitive.Trigger data-slot="dialog-trigger" {...rest} />
