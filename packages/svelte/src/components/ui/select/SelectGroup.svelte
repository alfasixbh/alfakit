<script lang="ts">
  import { Select as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.GroupProps = $props()
</script>

<Primitive.Group data-slot="select-group" {...rest} />
