<script lang="ts">
  import {
    fieldIds,
    iconPickerPreview,
    IconPickerSearch,
    isCustomSvgIcon,
    type IconPickerSchema,
  } from '@alfakit/core'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, tick } from 'svelte'
  import { useChoice, useDirection, useFormatter, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { extraProps } from '../../lib/attributes'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField, useFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import { Spinner } from '../ui/spinner'
  import { Textarea } from '../ui/textarea'
  import { ICON_PICKER_SIZES } from './icon-picker-sizes'
  import IconPickerValue from './IconPickerValue.svelte'

  /**
   * `IconPicker::make()`: a trigger showing the selected icon and a popover with a search
   * box, a set filter and a grid of icons loaded from the server a page at a time. The grid
   * is a listbox driven from the search box (`aria-activedescendant`): arrow keys move,
   * Enter picks, Escape closes.
   */
  let { component }: { component: IconPickerSchema } = $props()

  const t = useT()
  const choice = useChoice()
  const formatter = useFormatter()
  const field = useField<string | null>(() => component)
  // svelte-ignore state_referenced_locally
  const search = new IconPickerSearch(useFormStore(), component.statePath)
  const picker = useStore(search.store)
  const uid = $props.id()
  const listId = `${uid}-icons`

  let open = $state(false)
  let svg = $state('')
  let grid = $state<HTMLElement | null>(null)

  const rtl = $derived(useDirection() === 'rtl')
  const size = $derived(ICON_PICKER_SIZES[component.previewSize] ?? ICON_PICKER_SIZES.md)
  const columns = $derived(Math.max(1, component.gridColumns))
  const current = $derived(
    typeof field.value === 'string' && field.value !== '' ? field.value : null,
  )
  const locked = $derived(field.disabled || field.readOnly)
  const activeId = $derived(
    picker.current.active >= 0 ? `${listId}-${picker.current.active}` : undefined,
  )
  // Re-read on every pick: the previews are filled by the search results.
  const preview = $derived(iconPickerPreview(component.selected, current, search.preview(current)))
  const status = $derived.by(() => {
    const { loading, error, icons, total } = picker.current

    if (loading) return t('form.icon_picker.loading', {}, 'Loading icons…')
    if (error) return t('form.icon_picker.error', {}, 'The icons could not be loaded.')
    if (icons.length === 0) return t('form.icon_picker.no_results', {}, 'No icons found.')

    return choice(
      'form.icon_picker.results',
      total,
      { count: formatter.current.number(total) },
      ':count icon|:count icons',
    )
  })

  onDestroy(() => search.destroy())

  // Keep the highlighted icon in view while the arrow keys move it.
  $effect(() => {
    const active = picker.current.active

    if (active < 0) return

    void tick().then(() =>
      grid?.ownerDocument
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView?.({ block: 'nearest' }),
    )
  })

  function pick(next: string | null) {
    field.setValue(next)
    open = false
    field.blur()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const icon = picker.current.icons[picker.current.active]

      if (icon) {
        event.preventDefault()
        pick(icon.value)
      }

      return
    }

    // Home/End stay with the text cursor while there is a search to edit.
    if ((event.key === 'Home' || event.key === 'End') && picker.current.search !== '') return

    if (search.move(event.key, columns, rtl) !== null) event.preventDefault()
  }

  function onScroll(event: Event) {
    const target = event.currentTarget as HTMLElement

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) search.loadMore()
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div data-slot="icon-picker" class="flex items-center gap-2">
    <Popover
      bind:open
      onOpenChange={(next) => {
        if (next) search.open()
      }}
    >
      <!-- The id goes to the primitive so the field label's `for` still names the trigger. -->
      <PopoverTrigger id={field.id}>
        {#snippet child({ props })}
          <Button
            type="button"
            variant="outline"
            data-input=""
            aria-haspopup="dialog"
            aria-expanded={open}
            {...field.aria}
            aria-labelledby={`${fieldIds(field.id).label} ${field.id}-value`}
            aria-readonly={field.readOnly || undefined}
            disabled={locked}
            {...extraProps(
              component.extraInputAttributes,
              cn(
                'h-9 min-w-0 flex-1 justify-between px-3 font-normal hover:bg-transparent',
                field.error && 'border-destructive',
              ),
            )}
            {...props}
            data-slot="icon-picker-trigger"
          >
            <IconPickerValue id={`${field.id}-value`} {component} value={current} {preview} />
            <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
          </Button>
        {/snippet}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        data-slot="icon-picker-content"
        class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2"
        onOpenAutoFocus={(event) => {
          if (!component.searchable) {
            event.preventDefault()
            grid?.focus()
          }
        }}
      >
        {#if component.searchable}
          <Input
            type="search"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label={t('form.icon_picker.search_label', {}, 'Search icons')}
            placeholder={t('form.icon_picker.search', {}, 'Search icons…')}
            value={picker.current.search}
            oninput={(event) => search.setSearch(event.currentTarget.value)}
            onkeydown={onKeyDown}
          />
        {/if}
        {#if component.sets.length > 1}
          <select
            data-slot="icon-picker-set"
            aria-label={t('form.icon_picker.set', {}, 'Icon set')}
            value={picker.current.set ?? ''}
            onchange={(event) => search.setSet(event.currentTarget.value || null)}
            class="border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">{t('form.icon_picker.all_sets', {}, 'All sets')}</option>
            {#each component.sets as set (set.key)}
              <option value={set.key}>{set.label}</option>
            {/each}
          </select>
        {/if}
        <div
          bind:this={grid}
          id={listId}
          role="listbox"
          data-slot="icon-picker-grid"
          aria-label={component.label ?? t('form.icon_picker.icons', {}, 'Icons')}
          aria-busy={picker.current.loading || undefined}
          tabindex={component.searchable ? -1 : 0}
          aria-activedescendant={component.searchable ? undefined : activeId}
          onkeydown={component.searchable ? undefined : onKeyDown}
          onscroll={onScroll}
          class="grid max-h-72 gap-1 overflow-y-auto outline-none"
          style:grid-template-columns={`repeat(${columns}, minmax(0, 1fr))`}
        >
          {#each picker.current.icons as icon, index (icon.value)}
            <div
              id={`${listId}-${index}`}
              role="option"
              tabindex="-1"
              data-slot="icon-picker-option"
              aria-selected={icon.value === current}
              aria-label={icon.value}
              title={icon.value}
              data-active={index === picker.current.active || undefined}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => pick(icon.value)}
              onkeydown={(event) => event.key === 'Enter' && pick(icon.value)}
              class={cn(
                'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-center rounded-md',
                size.cell,
                index === picker.current.active &&
                  'bg-accent text-accent-foreground ring-ring ring-2',
                icon.value === current && 'bg-primary/10 text-primary',
              )}
            >
              <Icon name={icon.icon ?? icon.value} class={size.icon} />
            </div>
          {/each}
        </div>
        <div class="flex items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            class="text-muted-foreground flex items-center gap-1 text-xs"
          >
            {#if picker.current.loading}<Spinner class="size-3" />{/if}
            {status}
          </p>
          {#if picker.current.hasMore}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={picker.current.loading}
              onclick={() => search.loadMore()}
            >
              {t('form.icon_picker.load_more', {}, 'Load more icons')}
            </Button>
          {/if}
        </div>
        {#if component.allowCustomSvg}
          <div data-slot="icon-picker-custom" class="flex flex-col gap-2 border-t pt-2">
            <Textarea
              bind:value={svg}
              dir="ltr"
              rows={3}
              aria-label={t('form.icon_picker.custom_svg_label', {}, 'Paste SVG markup')}
              placeholder="<svg viewBox=&quot;0 0 24 24&quot;>…</svg>"
              class="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!isCustomSvgIcon(svg)}
              onclick={() => {
                pick(svg.trim())
                svg = ''
              }}
            >
              {t('form.icon_picker.use_svg', {}, 'Use SVG')}
            </Button>
          </div>
        {/if}
      </PopoverContent>
    </Popover>
    {#if current !== null && !locked}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-slot="icon-picker-clear"
        aria-label={t('form.icon_picker.clear', {}, 'Clear icon')}
        onclick={() => pick(null)}
      >
        <XIcon />
      </Button>
    {/if}
  </div>
</FieldWrapper>
