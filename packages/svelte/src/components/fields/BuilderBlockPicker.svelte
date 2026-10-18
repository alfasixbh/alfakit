<script lang="ts">
  import {
    stickyCollisionPadding,
    type BuilderBlockSchema,
    type BuilderItemState,
    type BuilderSchema,
  } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import BuilderBlockPickerPanel from './BuilderBlockPickerPanel.svelte'

  /**
   * The "Add block" button (`trigger`, given the trigger props) and its picker, anchored
   * below the button (above it when there is no room) and never wider or taller than the
   * screen.
   */
  interface Props {
    component: BuilderSchema
    items: BuilderItemState[]
    onPick: (block: BuilderBlockSchema) => void
    trigger: Snippet<[{ props: Record<string, unknown> }]>
  }

  let { component, items, onPick, trigger }: Props = $props()

  const t = useT()
  let open = $state(false)
  // Opening upwards near the top of the page, stay below the sticky topbar.
  const collisionPadding = $derived(open ? stickyCollisionPadding() : 16)

  /** `blockPickerWidth()`: spelled out so Tailwind generates them. */
  const PICKER_WIDTHS: Record<string, string> = {
    '3xs': 'w-3xs',
    '2xs': 'w-2xs',
    xs: 'w-xs',
    sm: 'w-sm',
    md: 'w-md',
    lg: 'w-lg',
    xl: 'w-xl',
    '2xl': 'w-2xl',
    '3xl': 'w-3xl',
    '4xl': 'w-4xl',
    '5xl': 'w-5xl',
    '6xl': 'w-6xl',
    '7xl': 'w-7xl',
    none: 'w-auto',
    min: 'w-min',
    max: 'w-max',
    fit: 'w-fit',
    prose: 'w-[65ch]',
    container: 'container',
    'screen-sm': 'w-(--breakpoint-sm)',
    'screen-md': 'w-(--breakpoint-md)',
    'screen-lg': 'w-(--breakpoint-lg)',
    'screen-xl': 'w-(--breakpoint-xl)',
    'screen-2xl': 'w-(--breakpoint-2xl)',
    full: 'w-(--bits-popover-anchor-width)',
    screen: 'w-screen',
  }

  const width = $derived.by(() => {
    if (component.blockPickerWidth) {
      return cn(PICKER_WIDTHS[component.blockPickerWidth], 'max-w-[calc(100vw-2rem)]')
    }

    const columns = Object.values(component.blockPickerColumns ?? {}).some(
      (value) => (value ?? 1) > 1,
    )

    return columns ? 'w-[min(42rem,calc(100vw-2rem))]' : 'w-[min(22rem,calc(100vw-2rem))]'
  })
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      {@render trigger({ props })}
    {/snippet}
  </PopoverTrigger>
  <PopoverContent
    align="start"
    side="bottom"
    {collisionPadding}
    aria-label={t('builder.pick_block', {}, 'Choose a block')}
    class={cn(
      'flex max-h-[min(34rem,var(--bits-popover-content-available-height))] flex-col overflow-hidden p-0',
      width,
    )}
  >
    {#if open}
      <BuilderBlockPickerPanel
        {component}
        {items}
        autoFocus
        onPick={(block) => {
          open = false
          onPick(block)
        }}
      />
    {/if}
  </PopoverContent>
</Popover>
