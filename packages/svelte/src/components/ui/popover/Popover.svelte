<script lang="ts">
  import { Popover as Primitive } from 'bits-ui'
  import { setContext } from 'svelte'
  import { POPOVER_CLOSE } from './close-context'

  let { open = $bindable(false), ...rest }: Primitive.RootProps = $props()

  // The content closes the popover itself on an outside pointerdown (see PopoverContent).
  setContext(POPOVER_CLOSE, () => {
    open = false
    rest.onOpenChange?.(false)
  })
</script>

<Primitive.Root bind:open {...rest} />
