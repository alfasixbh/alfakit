<script lang="ts">
  import { uniqueKey, valueKey } from '../../lib/keys'
  import type { FieldAriaAttributes, Option, SelectSchema } from '@alfakit/core'
  import { debounce, htmlLabelToText, isOptionGroup } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useFormStore } from '../form/form-context.svelte'
  import { Badge } from '../ui/badge'
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
  import OptionLabel from './OptionLabel.svelte'
  import SelectReorderList from './SelectReorderList.svelte'

  interface Props {
    component: SelectSchema
    value: string | number | Array<string | number> | null | undefined
    setValue: (value: string | number | Array<string | number> | null) => void
    id: string
    disabled: boolean
    readOnly?: boolean
    error?: string
    aria?: FieldAriaAttributes
  }

  let {
    component,
    value,
    setValue,
    id,
    disabled,
    readOnly = false,
    error,
    aria = {},
  }: Props = $props()

  const t = useT()
  const store = useFormStore()
  let open = $state(false)
  let search = $state('')
  let loading = $state(false)
  let remoteOptions = $state<Option[] | null>(null)
  let labels = $state<Record<string, string>>(untrack(() => component.selectedLabels ?? {}))
  let requestId = 0
  // Values whose labels were already requested: the server may not know a value (deleted
  // record, stale state), so asking again whenever `labels` changes would loop forever.
  // Deliberately not reactive: it only guards requests and must not re-run the effect.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const requestedLabels = new Set<string>()

  // Labels the server sends with a refresh win (e.g. after the edit option modal renamed
  // the selected record).
  $effect(() => {
    const incoming = component.selectedLabels

    if (incoming && Object.keys(incoming).length > 0) {
      labels = { ...untrack(() => labels), ...incoming }
    }
  })

  const selected = $derived<string[]>(
    Array.isArray(value)
      ? value.map(String)
      : value === null || value === undefined || value === ''
        ? []
        : [String(value)],
  )
  const staticOptions = $derived(
    component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
  )
  const options = $derived(remoteOptions ?? staticOptions)
  const isRemote = $derived(Boolean(component.searchable))

  const runSearch = debounce(
    (term: string) => {
      if (!isRemote) {
        return
      }

      const current = ++requestId
      loading = true

      void store
        .searchOptions(component.statePath, term)
        .then((results) => {
          if (current === requestId) {
            remoteOptions = results
          }
        })
        .finally(() => {
          if (current === requestId) {
            loading = false
          }
        })
    },
    untrack(() => component.searchDebounce ?? 300),
  )

  onDestroy(() => runSearch.cancel())

  $effect(() => {
    if (open && isRemote) {
      runSearch(search)
    }
  })

  // Resolve labels for values we have not seen yet (e.g. after a server refresh).
  $effect(() => {
    if (!isRemote) {
      return
    }

    const missing = selected.filter(
      (key) =>
        !labels[key] &&
        !requestedLabels.has(key) &&
        !staticOptions.some((option) => option.value === key),
    )

    if (missing.length === 0) {
      return
    }

    for (const key of missing) {
      requestedLabels.add(key)
    }

    void store.optionLabels(component.statePath, missing).then((resolved) => {
      labels = { ...untrack(() => labels), ...resolved }
    })
  })

  const labelFor = (key: string) =>
    labels[key] ??
    options.find((option) => option.value === key)?.label ??
    staticOptions.find((option) => option.value === key)?.label ??
    key

  const canRemove = $derived(!component.minItems || selected.length > component.minItems)
  // `reorderable()`: chosen options are listed under the trigger, where they can be dragged
  // or moved with Alt + arrow keys (chips inside the trigger button can't hold controls).
  const reorderable = $derived(Boolean(component.multiple && component.reorderable))

  const toggle = (key: string, label: string) => {
    labels = { ...labels, [key]: label }

    if (component.multiple) {
      const next = selected.includes(key)
        ? selected.filter((item) => item !== key)
        : [...selected, key]

      if (component.maxItems && next.length > component.maxItems) {
        return
      }

      // `minItems()`: the last required selections cannot be removed.
      if (component.minItems && next.length < selected.length && next.length < component.minItems) {
        return
      }

      setValue(next)
    } else {
      setValue(selected.includes(key) && component.selectablePlaceholder ? null : key)
      open = false
    }
  }

  const filtered = $derived(
    isRemote
      ? options
      : options.filter((option) =>
          (component.allowHtml ? htmlLabelToText(option.label) : option.label)
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
  )
</script>

<Popover
  bind:open
  onOpenChange={(next) => {
    if (!next) {
      search = ''
      store.blur(component.statePath)
    }
  }}
>
  <!-- The id goes to the primitive so the field label's `for` still names the trigger. -->
  <PopoverTrigger {id}>
    {#snippet child({ props })}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        data-input=""
        aria-expanded={open}
        {...aria}
        aria-invalid={error ? true : undefined}
        aria-readonly={readOnly || undefined}
        disabled={disabled || readOnly}
        class={cn(
          'h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal hover:bg-transparent',
          error && 'border-destructive',
        )}
        {...props}
      >
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-start">
          {#if selected.length === 0}
            <span class="text-muted-foreground"
              >{component.placeholder ?? t('select_option', {}, 'Select an option')}</span
            >
          {/if}
          {#if component.multiple && reorderable}
            {#if selected.length > 0}
              <span class="text-muted-foreground"
                >{component.placeholder ?? t('select_option', {}, 'Select an option')}</span
              >
            {/if}
          {:else if component.multiple}
            {#each selected as key, keyIndex (uniqueKey(selected, keyIndex, valueKey))}
              <Badge variant="secondary" class="gap-1 pe-1">
                {#if component.allowHtml}<span>{@html labelFor(key)}</span>{:else}<span
                    >{labelFor(key)}</span
                  >{/if}
                {#if !disabled && !readOnly && canRemove}
                  <span
                    role="button"
                    tabindex={-1}
                    aria-label={t('remove', {}, 'Remove')}
                    class="hover:bg-foreground/10 rounded-sm"
                    onclick={(event) => {
                      event.stopPropagation()
                      setValue(selected.filter((item) => item !== key))
                    }}
                    onkeydown={(event) =>
                      event.key === 'Enter' && setValue(selected.filter((item) => item !== key))}
                  >
                    <XIcon class="size-3" />
                  </span>
                {/if}
              </Badge>
            {/each}
          {:else if selected[0] !== undefined}
            <span class="truncate"
              >{#if component.allowHtml}{@html labelFor(selected[0])}{:else}{labelFor(
                  selected[0],
                )}{/if}</span
            >
          {/if}
        </span>
        {#if loading}<Spinner class="opacity-50" />{:else}<ChevronsUpDownIcon
            class="size-4 shrink-0 opacity-50"
          />{/if}
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent class="w-(--bits-popover-anchor-width) p-0" align="start">
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={component.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')}
        bind:value={search}
      />
      <CommandList>
        {#if loading && filtered.length === 0}
          <div
            data-slot="select-loading"
            class="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm"
          >
            <Spinner />
            {search !== ''
              ? (component.searchingMessage ?? t('form.searching', {}, 'Searching…'))
              : (component.loadingMessage ?? t('loading', {}, 'Loading…'))}
          </div>
        {:else}
          <!-- No options at all, or a search without matches. -->
          <CommandEmpty
            >{search === '' && options.length === 0
              ? (component.noOptionsMessage ?? t('form.no_options', {}, 'No options available.'))
              : (component.noSearchResultsMessage ??
                t('no_results', {}, 'No results.'))}</CommandEmpty
          >
        {/if}
        <CommandGroup>
          {#each filtered as option, optionIndex (uniqueKey(filtered, optionIndex, (item) => item.value))}
            <CommandItem
              value={option.value}
              disabled={option.disabled}
              onSelect={() => toggle(option.value, option.label)}
            >
              <CheckIcon
                class={cn('size-4', selected.includes(option.value) ? 'opacity-100' : 'opacity-0')}
              />
              <OptionLabel
                {option}
                allowHtml={component.allowHtml}
                wrap={component.wrapOptionLabels !== false}
              />
            </CommandItem>
          {/each}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
{#if reorderable}
  <SelectReorderList
    {id}
    values={Array.isArray(value) ? value : []}
    labelFor={(key) => (component.allowHtml ? htmlLabelToText(labelFor(key)) : labelFor(key))}
    locked={disabled || readOnly}
    {canRemove}
    onChange={setValue}
  />
{/if}
