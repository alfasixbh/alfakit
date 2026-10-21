<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'
  import Icon from '../../../lib/Icon.svelte'
  import DialogOverlay from './DialogOverlay.svelte'
  import { useDirection, useT } from '../../../context.svelte'

  let {
    ref = $bindable(null),
    class: className,
    dir,
    portalProps,
    showCloseButton = true,
    children,
    ...rest
  }: DialogPrimitive.ContentProps & {
    portalProps?: DialogPrimitive.PortalProps
    showCloseButton?: boolean
  } = $props()

  const t = useT()
  // Portaled outside Alfakit's root: carry the reading direction (starter kit pages and
  // standalone components leave <html dir> to the host).
  const direction = $derived(dir ?? useDirection())
</script>

<DialogPrimitive.Portal {...portalProps}>
  <DialogOverlay />
  <DialogPrimitive.Content
    dir={direction}
    bind:ref
    data-slot="dialog-content"
    class={cn(
      'bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
    {#if showCloseButton}
      <DialogPrimitive.Close
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <Icon name="alfakit::support.modal.close-button" fallback={XIcon} />
        <span class="sr-only">{t('close', {}, 'Close')}</span>
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
