<script lang="ts">
  import { Popover as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.CloseProps = $props()
</script>

<Primitive.Close data-slot="popover-close" {...rest} />
