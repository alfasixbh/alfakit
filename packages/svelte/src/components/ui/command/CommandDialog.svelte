<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import { useT } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'
  import DialogContent from '../dialog/DialogContent.svelte'
  import Command from './Command.svelte'

  let {
    open = $bindable(false),
    title,
    description,
    class: className,
    children,
    shouldFilter = true,
    ...rest
  }: DialogPrimitive.RootProps & {
    title?: string
    description?: string
    /** `false` when results come from the server and must not be filtered again. */
    shouldFilter?: boolean
    class?: string
    children?: Snippet
  } = $props()

  const t = useT()
</script>

<DialogPrimitive.Root bind:open {...rest}>
  <DialogContent class={cn('overflow-hidden p-0', className)} showCloseButton={false}>
    <DialogPrimitive.Title class="sr-only"
      >{title ?? t('command_palette', {}, 'Command palette')}</DialogPrimitive.Title
    >
    <DialogPrimitive.Description class="sr-only"
      >{description ??
        t(
          'command_palette_description',
          {},
          'Search for a command to run…',
        )}</DialogPrimitive.Description
    >
    <Command
      {shouldFilter}
      class="**:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3"
    >
      {@render children?.()}
    </Command>
  </DialogContent>
</DialogPrimitive.Root>
