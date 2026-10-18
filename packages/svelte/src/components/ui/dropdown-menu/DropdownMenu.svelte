<script lang="ts">
  import { DropdownMenu as Primitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'

  let { open = $bindable(false), dir, ...rest }: Primitive.RootProps = $props()

  // bits-ui has no global direction provider: follow the panel language unless overridden.
  const direction = $derived(dir ?? useDirection())
</script>

<Primitive.Root bind:open dir={direction} {...rest} />
