<script lang="ts">
  import type { QueryBuilderConstraintSchema, QueryBuilderGroup, RulePath } from '@alfakit/core'
  import {
    addGroup,
    addRule,
    canNestGroup,
    constraintPickerSections,
    createRule,
    removeRule,
    setCombinator,
  } from '@alfakit/core'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import XIcon from '@lucide/svelte/icons/x'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import QueryBuilderGroupEditor from './QueryBuilderGroupEditor.svelte'
  import QueryBuilderRuleEditor from './QueryBuilderRuleEditor.svelte'

  let {
    group,
    path,
    tree,
    constraints,
    maxDepth,
    locked,
    picker,
    onChange,
  }: {
    group: QueryBuilderGroup
    path: RulePath
    tree: QueryBuilderGroup
    constraints: QueryBuilderConstraintSchema[]
    maxDepth: number
    locked: boolean
    /** Grid and width classes of the "add rule" picker (`constraintPickerColumns()` / `…Width()`). */
    picker?: { grid?: string; width?: string }
    onChange: (tree: QueryBuilderGroup) => void
  } = $props()

  const t = useT()
  const sections = $derived(constraintPickerSections(constraints))
  const grouped = $derived(sections.some((section) => section.label))
  const combinators = ['and', 'or'] as const
</script>

{#snippet pickerItems(list: QueryBuilderConstraintSchema[])}
  {#each list as constraint (constraint.name)}
    <DropdownMenuItem onSelect={() => onChange(addRule(tree, path, createRule(constraint)))}>
      {#if constraint.icon}<Icon name={constraint.icon} />{/if}
      {constraint.label}
    </DropdownMenuItem>
  {/each}
{/snippet}

<div data-slot="query-builder-group" class="flex flex-col gap-2">
  {#if group.rules.length > 1}
    <div class="flex items-center gap-2 text-xs">
      <span class="text-muted-foreground">
        {t('query_builder.combinator', {}, 'Combine rules with')}
      </span>
      <div class="inline-flex rounded-md border p-0.5">
        {#each combinators as combinator (combinator)}
          <button
            type="button"
            disabled={locked}
            aria-pressed={group.combinator === combinator}
            class={cn(
              'rounded-sm px-2 py-0.5 font-medium uppercase',
              group.combinator === combinator
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onclick={() => onChange(setCombinator(tree, path, combinator))}
          >
            {t(`query_builder.${combinator}`, {}, combinator)}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  {#if group.rules.length === 0}
    <p class="text-muted-foreground text-sm">{t('query_builder.empty', {}, 'No rules yet.')}</p>
  {/if}
  {#each group.rules as rule, index (index)}
    {#if rule.type === 'group'}
      <div class="bg-muted/30 flex items-start gap-2 rounded-md border border-s-2 p-2">
        <div class="min-w-0 flex-1">
          <QueryBuilderGroupEditor
            group={rule}
            path={[...path, index]}
            {tree}
            {constraints}
            {maxDepth}
            {locked}
            {picker}
            {onChange}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={locked}
          aria-label={t('query_builder.remove_group', {}, 'Remove group')}
          onclick={() => onChange(removeRule(tree, [...path, index]))}
        >
          <XIcon />
        </Button>
      </div>
    {:else}
      <QueryBuilderRuleEditor
        {rule}
        path={[...path, index]}
        {tree}
        {constraints}
        {locked}
        {onChange}
      />
    {/if}
  {/each}
  <div class="flex flex-wrap items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger disabled={locked || constraints.length === 0}>
        {#snippet child({ props })}
          <Button type="button" variant="outline" size="sm" {...props}>
            <PlusIcon />
            {t('query_builder.add_rule', {}, 'Add rule')}
          </Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class={picker?.width}>
        <div data-slot="query-builder-constraint-picker" class={grouped ? undefined : picker?.grid}>
          <!-- `constraints(['Group' => [...]])`: a labelled section per group. -->
          {#if grouped}
            {#each sections as section (section.label ?? '')}
              {#if section.label}
                <DropdownMenuGroup
                  aria-label={section.label}
                  data-slot="query-builder-constraint-group"
                >
                  <DropdownMenuLabel class="text-muted-foreground text-xs"
                    >{section.label}</DropdownMenuLabel
                  >
                  <div class={picker?.grid}>{@render pickerItems(section.constraints)}</div>
                </DropdownMenuGroup>
              {:else}
                <div class={picker?.grid}>{@render pickerItems(section.constraints)}</div>
              {/if}
            {/each}
          {:else}
            {@render pickerItems(constraints)}
          {/if}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    {#if canNestGroup(path, maxDepth) && constraints[0]}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={locked}
        onclick={() => onChange(addGroup(tree, path, createRule(constraints[0]!)))}
      >
        <PlusIcon />
        {t('query_builder.add_group', {}, 'Add group')}
      </Button>
    {/if}
  </div>
</div>
