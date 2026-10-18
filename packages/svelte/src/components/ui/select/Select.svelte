<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'

  type Props = Omit<SelectPrimitive.RootProps, 'type' | 'value' | 'onValueChange'> & {
    type?: 'single'
    value?: string
    onValueChange?: (value: string) => void
  }

  let { open = $bindable(false), value = $bindable(''), type = 'single', ...rest }: Props = $props()
</script>

<SelectPrimitive.Root {type} bind:open bind:value={value as never} {...rest} />
