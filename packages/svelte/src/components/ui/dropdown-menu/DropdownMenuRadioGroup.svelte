<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui'

  let { value = $bindable(''), ...rest }: Primitive.RadioGroupProps = $props()
</script>

<Primitive.RadioGroup bind:value data-slot="dropdown-menu-radio-group" {...rest} />
