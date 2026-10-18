<script lang="ts">
  import type { BaseEntry } from '@alfakit/core'
  import { hasSlots } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
  import { extraProps } from '../../lib/attributes'
  import ContentSlot from '../schema/ContentSlot.svelte'
  import FieldAffixActions from '../schema/FieldAffixActions.svelte'
  import FieldHintActions from '../schema/FieldHintActions.svelte'

  let {
    entry,
    class: className,
    children,
  }: { entry: BaseEntry; class?: string; children?: Snippet } = $props()

  const uid = $props.id()
  const labelId = `${uid}-label`
  // `extraEntryWrapperAttributes()` go on the wrapper, `extraAttributes()` on the value.
  const wrapperAttributes = $derived(entry.extraEntryWrapperAttributes)
  /** `alignment()`: text and inline content (badges, icons, images) follow it. */
  const ENTRY_ALIGNMENT: Record<string, string> = {
    start: 'text-start [&>*]:justify-start',
    center: 'text-center [&>*]:mx-auto [&>*]:justify-center',
    end: 'text-end [&>*]:ms-auto [&>*]:justify-end',
    justify: 'text-justify',
    between: 'text-justify',
  }
  // `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
  const afterLabelAtStart = $derived(entry.slots?.afterLabel?.alignment === 'start')
  const hasLabelLine = $derived(
    Boolean(entry.label) ||
      Boolean(entry.slots?.beforeLabel) ||
      (Boolean(entry.slots?.afterLabel) && afterLabelAtStart),
  )
  const hasHint = $derived(
    Boolean(entry.hint) ||
      Boolean(entry.hintActions?.length) ||
      (Boolean(entry.slots?.afterLabel) && !afterLabelAtStart),
  )
  const hasSideSlots = $derived(hasSlots(entry, ['beforeContent', 'afterContent']))
</script>

{#snippet value()}
  <FieldAffixActions component={entry}>
    {#if entry.tooltip}
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props })}
            <div class="w-fit" {...props}>{@render children?.()}</div>
          {/snippet}
        </TooltipTrigger>
        <TooltipContent>{entry.tooltip}</TooltipContent>
      </Tooltip>
    {:else}
      {@render children?.()}
    {/if}
  </FieldAffixActions>
{/snippet}

<div
  data-slot="entry"
  role="group"
  aria-labelledby={entry.label ? labelId : undefined}
  data-inline-label={entry.inlineLabel ? '' : undefined}
  {...extraProps(
    wrapperAttributes,
    cn(
      'flex flex-col gap-1',
      entry.inlineLabel && 'sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4',
      className,
    ),
  )}
>
  {#if !entry.inlineLabel}{#if entry.slots?.aboveLabel}<ContentSlot
        component={entry}
        name="aboveLabel"
      />{/if}{/if}
  <!-- `inlineLabel()`: label beside the value from sm up, stacked on phones. -->
  {#if entry.inlineLabel || hasLabelLine || hasHint}
    <div
      class={entry.inlineLabel ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-2'}
    >
      {#if entry.inlineLabel}{#if entry.slots?.aboveLabel}<ContentSlot
            component={entry}
            name="aboveLabel"
          />{/if}{/if}
      {#if hasLabelLine}
        <span class="inline-flex min-w-0 items-center gap-2">
          {#if entry.slots?.beforeLabel}<ContentSlot component={entry} name="beforeLabel" />{/if}
          {#if entry.label}
            <span
              id={labelId}
              data-slot="entry-label"
              class="text-muted-foreground text-sm font-medium"
            >
              {entry.label}
            </span>
          {/if}
          {#if afterLabelAtStart}{#if entry.slots?.afterLabel}<ContentSlot
                component={entry}
                name="afterLabel"
              />{/if}{/if}
        </span>
      {:else if !entry.inlineLabel}
        <span></span>
      {/if}
      {#if hasHint}
        <span class="inline-flex items-center gap-2">
          {#if entry.hint}
            <span
              class={cn(
                'inline-flex items-center gap-1 text-xs',
                entry.hintColor ? textColorClasses[entry.hintColor] : 'text-muted-foreground',
              )}
            >
              {#if entry.hintIcon}<Icon name={entry.hintIcon} class="size-3.5" />{/if}
              <span>{@html entry.hint}</span>
            </span>
          {/if}
          {#if entry.hintActions?.length}<FieldHintActions component={entry} />{/if}
          {#if !afterLabelAtStart}{#if entry.slots?.afterLabel}<ContentSlot
                component={entry}
                name="afterLabel"
              />{/if}{/if}
        </span>
      {/if}
      {#if entry.inlineLabel}{#if entry.slots?.belowLabel}<ContentSlot
            component={entry}
            name="belowLabel"
          />{/if}{/if}
    </div>
  {/if}
  {#if !entry.inlineLabel}{#if entry.slots?.belowLabel}<ContentSlot
        component={entry}
        name="belowLabel"
      />{/if}{/if}
  <div class={entry.inlineLabel ? 'flex min-w-0 flex-col gap-1 sm:col-span-2' : 'contents'}>
    {#if entry.slots?.aboveContent}<ContentSlot component={entry} name="aboveContent" />{/if}
    <div
      data-slot="entry-value"
      data-alignment={entry.alignment}
      {...extraProps(
        entry.extraAttributes,
        cn('text-sm', entry.alignment && ENTRY_ALIGNMENT[entry.alignment]),
      )}
    >
      {#if hasSideSlots}
        <div data-slot="entry-content" class="flex items-center gap-2">
          {#if entry.slots?.beforeContent}<ContentSlot
              component={entry}
              name="beforeContent"
              class="shrink-0 flex-nowrap"
            />{/if}
          <div class="min-w-0 flex-1">{@render value()}</div>
          {#if entry.slots?.afterContent}<ContentSlot
              component={entry}
              name="afterContent"
              class="shrink-0 flex-nowrap"
            />{/if}
        </div>
      {:else}
        {@render value()}
      {/if}
    </div>
    {#if entry.helperText}<p class="text-muted-foreground text-xs">{@html entry.helperText}</p>{/if}
    {#if entry.slots?.belowContent}<ContentSlot component={entry} name="belowContent" />{/if}
  </div>
</div>
