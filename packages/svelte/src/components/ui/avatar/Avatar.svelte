<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    loadingStatus = $bindable('loading'),
    ...rest
  }: AvatarPrimitive.RootProps = $props()
</script>

<AvatarPrimitive.Root
  bind:ref
  bind:loadingStatus
  data-slot="avatar"
  class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
  {...rest}
/>
