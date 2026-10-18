<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.GroupProps = $props()
</script>

<Primitive.Group data-slot="dropdown-menu-group" {...rest} />
