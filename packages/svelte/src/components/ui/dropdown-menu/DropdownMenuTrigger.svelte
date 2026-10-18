<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.TriggerProps = $props()
</script>

<Primitive.Trigger data-slot="dropdown-menu-trigger" {...rest} />
