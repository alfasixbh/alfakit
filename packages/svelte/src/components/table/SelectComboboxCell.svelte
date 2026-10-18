<script lang="ts">
  import type { Option, SelectColumnSchema } from '@alfakit/core'
  import {
    filterSelectColumnOptions,
    isOptionGroup,
    optionText,
    searchTableColumnOptions,
    selectColumnEmptyMessage,
  } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import { untrack } from 'svelte'
  import { usePanel, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '../ui/command'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import { Spinner } from '../ui/spinner'
  import { useCellUpdate, type CellProps } from './cell-update.svelte'

  /**
   * `SelectColumn::native(false)`: a combobox, searchable with `searchableOptions()`. Options
   * come with the table, or from the server (`optionsSearchPath`) as the user types.
   */
  let props: CellProps = $props()

  const t = useT()
  const panel = usePanel()
  const schema = $derived(props.column as SelectColumnSchema)
  const updater = useCellUpdate(() => props)
  let value = $state(
    untrack(() =>
      props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
    ),
  )
  let label = $state<string | undefined>(untrack(() => props.cell.optionLabel))
  let open = $state(false)
  let search = $state('')
  let loading = $state(false)
  let remote = $state<Option[]>([])
  let request = 0
  const isRemote = $derived(Boolean(schema.optionsSearchPath))
  const staticOptions = $derived(
    schema.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
  )

  // Remote options: searched on the server, debounced, while the list is open.
  $effect(() => {
    const url = panel.endpoints.schemaOptions

    if (!open || !isRemote || !url) return

    const term = search
    const { token, component } = props
    const column = schema
    const timer = setTimeout(() => {
      const current = ++request
      loading = true

      void searchTableColumnOptions(url, token, component, column, term)
        .then((results) => {
          if (current === request) remote = results
        })
        .catch(() => {
          if (current === request) remote = []
        })
        .finally(() => {
          if (current === request) loading = false
        })
    }, schema.optionsSearchDebounce ?? 300)

    return () => clearTimeout(timer)
  })

  const options = $derived(
    filterSelectColumnOptions(
      isRemote ? remote : staticOptions,
      schema,
      isRemote ? '' : search,
      props.recordKey,
    ),
  )
  const emptyMessage = $derived(
    selectColumnEmptyMessage(schema, { loading, search, optionCount: options.length }),
  )
  const currentLabel = $derived(
    staticOptions.find((option) => option.value === value)?.label ??
      remote.find((option) => option.value === value)?.label ??
      label,
  )

  const choose = (next: string, nextLabel?: string) => {
    value = next
    label = nextLabel
    open = false
    void updater.update(next === '' ? null : next)
  }
</script>

<!-- An option label: sanitised HTML under `allowOptionsHtml()` (the server sanitises it), text otherwise. -->
<!-- Long labels wrap unless `wrapOptionLabels(false)` (or `truncate`) truncates them. -->
{#snippet optionLabel(text: string, truncate = false)}
  {@const labelClass =
    truncate || schema.wrapOptionLabels === false
      ? 'min-w-0 truncate'
      : 'min-w-0 break-words whitespace-normal'}
  {#if schema.allowOptionsHtml}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <span class={labelClass}>{@html text}</span>
  {:else}
    <span class={labelClass}>{text}</span>
  {/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span onclick={(event) => event.stopPropagation()}>
  <Popover
    bind:open
    onOpenChange={(next) => {
      if (!next) search = ''
    }}
  >
    <PopoverTrigger>
      {#snippet child({ props: triggerProps })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={props.column.label || props.column.name}
          aria-invalid={updater.error ? true : undefined}
          disabled={Boolean(props.cell.disabled) || updater.saving}
          class={cn(
            'h-8 min-w-32 justify-between font-normal',
            updater.error && 'border-destructive',
          )}
          {...triggerProps}
        >
          {#if value !== '' && currentLabel !== undefined}
            {@render optionLabel(currentLabel, true)}
          {:else}
            <span class="text-muted-foreground">
              {schema.placeholder ??
                (value !== '' ? value : t('select_option', {}, 'Select an option'))}
            </span>
          {/if}
          {#if loading}<Spinner class="opacity-50" />{:else}<ChevronsUpDownIcon
              class="size-4 shrink-0 opacity-50"
            />{/if}
        </Button>
      {/snippet}
    </PopoverTrigger>
    <PopoverContent class="w-64 p-0" align="start">
      <Command shouldFilter={false}>
        {#if schema.searchableOptions}
          <CommandInput
            placeholder={schema.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')}
            bind:value={search}
          />
        {/if}
        <CommandList>
          <CommandEmpty data-slot="select-column-message">
            {emptyMessage.message ?? t(emptyMessage.key, {}, emptyMessage.fallback)}
          </CommandEmpty>
          <CommandGroup>
            {#if schema.selectablePlaceholder && value !== ''}
              <CommandItem value="" onSelect={() => choose('')}>
                <span class="text-muted-foreground">
                  {schema.placeholder ?? t('clear', {}, 'Clear')}
                </span>
              </CommandItem>
            {/if}
            {#each options as option (option.value)}
              <CommandItem
                value={option.value}
                keywords={[optionText(option.label)]}
                disabled={option.disabled}
                onSelect={() => choose(option.value, option.label)}
              >
                <CheckIcon
                  class={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')}
                />
                {@render optionLabel(option.label)}
              </CommandItem>
            {/each}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
  {#if updater.error}<span class="text-destructive block text-xs">{updater.error}</span>{/if}
</span>
