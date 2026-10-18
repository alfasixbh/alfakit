<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui'

  let { open = $bindable(false), ...rest }: Primitive.SubProps = $props()
</script>

<Primitive.Sub bind:open {...rest} />
