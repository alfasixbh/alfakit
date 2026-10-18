<script lang="ts">
  import type {
    QueryBuilderConstraintRule,
    QueryBuilderConstraintSchema,
    QueryBuilderGroup,
    RulePath,
  } from '@alfakit/core'
  import {
    constraintPickerSections,
    filterQueryBuilderOptions,
    findConstraint,
    findOperator,
    queryBuilderInputType,
    queryBuilderOptions,
    removeRule,
    updateRule,
  } from '@alfakit/core'
  import XIcon from '@lucide/svelte/icons/x'
  import { useT } from '../../context.svelte'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'

  let {
    rule,
    path,
    tree,
    constraints,
    locked,
    onChange,
  }: {
    rule: QueryBuilderConstraintRule
    path: RulePath
    tree: QueryBuilderGroup
    constraints: QueryBuilderConstraintSchema[]
    locked: boolean
    onChange: (tree: QueryBuilderGroup) => void
  } = $props()

  const t = useT()

  const SELECT_CLASS =
    'border-input dark:bg-input/30 focus-visible:ring-ring/50 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50'

  const constraint = $derived(findConstraint(constraints, rule.constraint))
  const operator = $derived(findOperator(constraint, rule.operator))
  const input = $derived(operator?.input ?? 'none')
  const selected = $derived(
    Array.isArray(rule.value) ? rule.value.map(String) : rule.value ? [String(rule.value)] : [],
  )
  const scalar = $derived(
    rule.value === undefined || rule.value === null
      ? ''
      : String(Array.isArray(rule.value) ? rule.value[0] : rule.value),
  )

  // A custom operator's own options take one value.
  const multiple = $derived(Boolean(constraint?.multiple && !operator?.options))
  let search = $state('')
  const allOptions = $derived(constraint ? queryBuilderOptions(constraint, operator) : [])
  // `searchable()`: the search narrows the options; selected ones stay listed.
  const options = $derived.by(() => {
    const filtered = constraint?.searchable
      ? filterQueryBuilderOptions(allOptions, search)
      : allOptions
    const kept = allOptions.filter(
      (option) =>
        selected.includes(String(option.value)) &&
        !filtered.some((item) => item.value === option.value),
    )

    return [...kept, ...filtered]
  })

  const update = (changes: Partial<Omit<QueryBuilderConstraintRule, 'type'>>) =>
    onChange(updateRule(tree, path, changes, constraints))

  const toggleOption = (value: string, checked: boolean) =>
    update({ value: checked ? [...selected, value] : selected.filter((item) => item !== value) })
</script>

<div data-slot="query-builder-rule" class="flex flex-wrap items-center gap-2">
  <select
    class={SELECT_CLASS}
    value={rule.constraint}
    disabled={locked}
    aria-label={t('query_builder.constraint', {}, 'Field')}
    onchange={(event) => update({ constraint: event.currentTarget.value })}
  >
    {#if !constraint}<option value={rule.constraint}>{rule.constraint}</option>{/if}
    {#each constraintPickerSections(constraints) as section (section.label ?? '')}
      {#if section.label}
        <optgroup label={section.label}>
          {#each section.constraints as item (item.name)}
            <option value={item.name}>{item.label}</option>
          {/each}
        </optgroup>
      {:else}
        {#each section.constraints as item (item.name)}
          <option value={item.name}>{item.label}</option>
        {/each}
      {/if}
    {/each}
  </select>
  {#if constraint}
    <select
      class={SELECT_CLASS}
      value={rule.operator}
      disabled={locked}
      aria-label={t('query_builder.operator', {}, 'Operator')}
      onchange={(event) => update({ operator: event.currentTarget.value })}
    >
      {#each constraint.operators as item (item.name)}
        <option value={item.name}>{item.label}</option>
      {/each}
    </select>
  {/if}
  {#if constraint && operator && input !== 'none'}
    {#if input === 'select' && constraint.searchable}
      <Input
        type="search"
        data-slot="query-builder-search"
        class="h-8 w-40"
        bind:value={search}
        disabled={locked}
        placeholder={t('form.search_placeholder', {}, 'Type to search…')}
        aria-label={t('query_builder.search_options', {}, 'Search options')}
      />
    {/if}
    {#if input === 'select' && multiple}
      <div
        role="group"
        aria-label={t('query_builder.value', {}, 'Value')}
        class="flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        {#each options as option (option.value)}
          <label class="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              class="accent-primary size-4"
              disabled={locked}
              checked={selected.includes(String(option.value))}
              onchange={(event) => toggleOption(String(option.value), event.currentTarget.checked)}
            />
            {option.label}
          </label>
        {/each}
      </div>
    {:else if input === 'select'}
      <select
        class={SELECT_CLASS}
        value={scalar}
        disabled={locked}
        aria-label={t('query_builder.value', {}, 'Value')}
        onchange={(event) =>
          update({ value: event.currentTarget.value === '' ? null : event.currentTarget.value })}
      >
        <option value="">{t('query_builder.select_placeholder', {}, 'Select…')}</option>
        {#each options as option (option.value)}
          <option value={String(option.value)}>{option.label}</option>
        {/each}
      </select>
    {:else}
      <Input
        type={queryBuilderInputType(input) as 'text'}
        step={input === 'number' ? (constraint.step ?? 'any') : input === 'year' ? 1 : undefined}
        min={input === 'year' ? 1 : undefined}
        max={input === 'year' ? 9999 : undefined}
        class="h-8 w-auto min-w-32 flex-1"
        value={scalar}
        disabled={locked}
        aria-label={t('query_builder.value', {}, 'Value')}
        oninput={(event) => update({ value: event.currentTarget.value })}
      />
    {/if}
  {/if}
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    class="ms-auto"
    disabled={locked}
    aria-label={t('query_builder.remove_rule', {}, 'Remove rule')}
    onclick={() => onChange(removeRule(tree, path))}
  >
    <XIcon />
  </Button>
</div>
