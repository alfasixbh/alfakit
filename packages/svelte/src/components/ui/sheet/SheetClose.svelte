<script lang="ts">
  import { Dialog as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.CloseProps = $props()
</script>

<Primitive.Close data-slot="sheet-close" {...rest} />
