<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'
  import Icon from '../../../lib/Icon.svelte'
  import DialogOverlay from '../dialog/DialogOverlay.svelte'
  import { useT } from '../../../context.svelte'

  const SIDES: Record<'top' | 'right' | 'bottom' | 'left', string> = {
    right:
      'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
    left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
    top: 'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
    bottom:
      'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  }

  let {
    ref = $bindable(null),
    class: className,
    side = 'right',
    portalProps,
    showCloseButton = true,
    children,
    ...rest
  }: SheetPrimitive.ContentProps & {
    side?: 'top' | 'right' | 'bottom' | 'left'
    portalProps?: SheetPrimitive.PortalProps
    showCloseButton?: boolean
  } = $props()

  const t = useT()
</script>

<SheetPrimitive.Portal {...portalProps}>
  <DialogOverlay />
  <SheetPrimitive.Content
    bind:ref
    data-slot="sheet-content"
    class={cn(
      'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
      SIDES[side],
      className,
    )}
    {...rest}
  >
    {@render children?.()}
    {#if showCloseButton}
      <SheetPrimitive.Close
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <Icon name="alfakit::support.modal.close-button" fallback={XIcon} class="size-4" />
        <span class="sr-only">{t('close', {}, 'Close')}</span>
      </SheetPrimitive.Close>
    {/if}
  </SheetPrimitive.Content>
</SheetPrimitive.Portal>
