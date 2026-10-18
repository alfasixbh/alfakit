<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let { ref = $bindable(null), class: className, ...rest }: AvatarPrimitive.FallbackProps = $props()
</script>

<AvatarPrimitive.Fallback
  bind:ref
  data-slot="avatar-fallback"
  class={cn('bg-muted flex size-full items-center justify-center rounded-full text-sm', className)}
  {...rest}
/>
