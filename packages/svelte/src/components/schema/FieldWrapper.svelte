<script lang="ts">
  import type { BaseField } from '@alfakit/core'
  import { fieldIds, hasSlots, mergeAttributes } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Label } from '../ui/label'
  import { extraProps } from '../../lib/attributes'
  import ContentSlot from './ContentSlot.svelte'
  import FieldAffixActions from './FieldAffixActions.svelte'
  import FieldHintActions from './FieldHintActions.svelte'
  import { useInFusedGroup } from './fused-group'

  interface Props {
    field: BaseField
    htmlFor: string
    error?: string
    /** Render the label after the control (checkbox, toggle). */
    inline?: boolean
    class?: string
    /** Suppress the label (the control renders its own). */
    hideLabel?: boolean
    children?: Snippet
  }

  let {
    field,
    htmlFor,
    error,
    inline = false,
    class: className,
    hideLabel = false,
    children,
  }: Props = $props()

  const fused = useInFusedGroup()
  const label = $derived(hideLabel ? null : field.label)
  // Stable ids the control references through `aria-describedby` / `aria-labelledby`.
  const ids = $derived(fieldIds(htmlFor))
  const hintUrl = $derived(typeof field.meta?.hintUrl === 'string' ? field.meta.hintUrl : undefined)
  const wrapperAttributes = $derived(
    mergeAttributes(field.extraAttributes, field.extraFieldWrapperAttributes),
  )
  // `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
  const afterLabelAtStart = $derived(field.slots?.afterLabel?.alignment === 'start')
  const hasLabelLine = $derived(
    Boolean(label) ||
      Boolean(field.slots?.beforeLabel) ||
      (Boolean(field.slots?.afterLabel) && afterLabelAtStart),
  )
  const hasHint = $derived(
    Boolean(field.hint) ||
      Boolean(field.hintActions?.length) ||
      (Boolean(field.slots?.afterLabel) && !afterLabelAtStart),
  )
  const hasSideSlots = $derived(hasSlots(field, ['beforeContent', 'afterContent']))
</script>

{#snippet labelNode()}
  {#if label}
    <Label
      id={ids.label}
      for={htmlFor}
      class={cn(inline && 'cursor-pointer font-normal', fused && 'sr-only')}
    >
      <span>
        {label}{#if field.required}<span class="text-destructive ms-0.5" aria-hidden="true">*</span
          >{/if}
      </span>
    </Label>
  {/if}
{/snippet}

{#snippet labelLine()}
  {#if hasLabelLine}
    <span class="inline-flex min-w-0 items-center gap-2">
      {#if field.slots?.beforeLabel}<ContentSlot component={field} name="beforeLabel" />{/if}
      {@render labelNode()}
      {#if afterLabelAtStart}{#if field.slots?.afterLabel}<ContentSlot
            component={field}
            name="afterLabel"
          />{/if}{/if}
    </span>
  {/if}
{/snippet}

{#snippet hintNode()}
  {#if hasHint}
    <span class="inline-flex items-center gap-2">
      {#if field.hint}
        <span
          id={ids.hint}
          class={cn(
            'inline-flex items-center gap-1 text-xs',
            field.hintColor ? textColorClasses[field.hintColor] : 'text-muted-foreground',
          )}
        >
          {#if field.hintIcon}<Icon name={field.hintIcon} class="size-3.5" />{/if}
          {#if hintUrl}
            <a href={hintUrl} class="hover:underline">{@html field.hint}</a>
          {:else}
            <span>{@html field.hint}</span>
          {/if}
        </span>
      {/if}
      {#if field.hintActions?.length}<FieldHintActions component={field} />{/if}
      {#if !afterLabelAtStart}{#if field.slots?.afterLabel}<ContentSlot
            component={field}
            name="afterLabel"
          />{/if}{/if}
    </span>
  {/if}
{/snippet}

{#snippet control()}
  {#if hasSideSlots && !fused}
    <!-- `beforeContent()` / `afterContent()` on either side of the control. -->
    <div data-slot="field-content" class="flex items-center gap-2">
      {#if field.slots?.beforeContent}<ContentSlot
          component={field}
          name="beforeContent"
          class="shrink-0 flex-nowrap"
        />{/if}
      <div class="min-w-0 flex-1">
        <FieldAffixActions component={field}>{@render children?.()}</FieldAffixActions>
      </div>
      {#if field.slots?.afterContent}<ContentSlot
          component={field}
          name="afterContent"
          class="shrink-0 flex-nowrap"
        />{/if}
    </div>
  {:else}
    <FieldAffixActions component={field}>{@render children?.()}</FieldAffixActions>
  {/if}
{/snippet}

{#snippet errorNode()}
  {#if error}
    <!-- Inside a FusedGroup the group shows the error; the field keeps it for screen readers. -->
    <p id={ids.error} class={cn('text-destructive text-xs', fused && 'sr-only')} role="alert">
      {#if field.allowHtmlValidationMessages}{@html error}{:else}{error}{/if}
    </p>
  {/if}
{/snippet}

{#snippet messages()}
  {#if field.helperText}
    <p id={ids.helper} class="text-muted-foreground text-xs">{@html field.helperText}</p>
  {/if}
  {#if field.slots?.belowContent}<ContentSlot component={field} name="belowContent" />{/if}
  {#if error}
    {#if field.slots?.aboveErrorMessage}<ContentSlot
        component={field}
        name="aboveErrorMessage"
      />{/if}
    {@render errorNode()}
    {#if field.slots?.belowErrorMessage}<ContentSlot
        component={field}
        name="belowErrorMessage"
      />{/if}
  {/if}
{/snippet}

<!-- Label, hint, content slots, helper text and validation error around a form control. -->
{#if fused}
  <div
    data-slot="field"
    data-field={field.statePath}
    data-fused=""
    {...extraProps(wrapperAttributes, cn('flex h-full flex-col', className))}
  >
    {@render labelNode()}
    {@render control()}
    {@render errorNode()}
  </div>
{:else if field.inlineLabel}
  <!-- `inlineLabel()`: label in the first column, the control in the other two from sm up;
       stacked on phones. Grid columns follow the text direction, so RTL works. -->
  <div
    data-slot="field"
    data-field={field.statePath}
    data-inline-label=""
    {...extraProps(
      wrapperAttributes,
      cn('flex flex-col gap-1.5 sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4', className),
    )}
  >
    <div data-slot="field-label" class="flex flex-col gap-1 sm:pt-2">
      {#if field.slots?.aboveLabel}<ContentSlot component={field} name="aboveLabel" />{/if}
      {@render labelLine()}
      {@render hintNode()}
      {#if field.slots?.belowLabel}<ContentSlot component={field} name="belowLabel" />{/if}
    </div>
    <div class="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
      {#if field.slots?.aboveContent}<ContentSlot component={field} name="aboveContent" />{/if}
      {@render control()}
      {@render messages()}
    </div>
  </div>
{:else}
  <div
    data-slot="field"
    data-field={field.statePath}
    {...extraProps(wrapperAttributes, cn('flex flex-col gap-1.5', className))}
  >
    {#if field.slots?.aboveLabel}<ContentSlot component={field} name="aboveLabel" />{/if}
    {#if inline}
      <div class="flex items-start gap-2">
        {@render control()}
        <div class="flex flex-col gap-1">
          {@render labelLine()}
          {@render hintNode()}
        </div>
      </div>
    {:else if hasLabelLine || hasHint}
      <div class="flex items-center justify-between gap-2">
        {#if hasLabelLine}{@render labelLine()}{:else}<span></span>{/if}
        {@render hintNode()}
      </div>
    {/if}
    {#if field.slots?.belowLabel}<ContentSlot component={field} name="belowLabel" />{/if}
    {#if !inline}
      {#if field.slots?.aboveContent}<ContentSlot component={field} name="aboveContent" />{/if}
      {@render control()}
    {/if}
    {@render messages()}
  </div>
{/if}
