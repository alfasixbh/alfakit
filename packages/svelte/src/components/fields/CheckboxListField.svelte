<script lang="ts">
  import type { CheckboxListSchema } from '@alfakit/core'
  import { fieldIds, gridColumnsClasses, htmlLabelToText, isOptionGroup } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import { Input } from '../ui/input'
  import { Label } from '../ui/label'

  let { component }: { component: CheckboxListSchema } = $props()

  const t = useT()
  const field = useField<Array<string | number> | null>(() => component)
  let search = $state('')
  // `searchDebounce()`: the list is filtered by `query`, which trails the input.
  let query = $state('')

  $effect(() => {
    const term = search
    const wait = component.searchDebounce

    if (!wait) {
      query = term

      return
    }

    const timer = setTimeout(() => (query = term), wait)

    return () => clearTimeout(timer)
  })

  const selected = $derived((field.value ?? []).map(String))
  const options = $derived(
    component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
  )
  const visible = $derived(
    options.filter((option) =>
      (component.allowHtml ? htmlLabelToText(option.label) : option.label)
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
  )

  /**
   * `gridDirection('column')`: options flow down each column (CSS columns). Classes are
   * spelled out so Tailwind generates them.
   */
  const COLUMN_FLOW_CLASSES: Record<number, string> = {
    2: 'md:columns-2',
    3: 'md:columns-3',
    4: 'md:columns-4',
    5: 'md:columns-5',
    6: 'md:columns-6',
  }
  const columnFlow = $derived(
    component.gridDirection === 'column' && (component.gridColumns ?? 1) > 1,
  )

  const toggle = (key: string, checked: boolean) => {
    field.setValue(checked ? [...selected, key] : selected.filter((item) => item !== key))
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div class="flex flex-col gap-2">
    {#if component.searchable || (component.bulkToggleable && !field.readOnly)}
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        {#if component.searchable}
          <Input
            bind:value={search}
            placeholder={component.searchPrompt ?? t('search', {}, 'Search')}
            aria-label={component.searchPrompt ?? t('search', {}, 'Search')}
            class="h-8"
          />
        {/if}
        {#if component.bulkToggleable && !field.readOnly}
          <div class="flex flex-wrap gap-1">
            {#if !component.selectAllAction?.hidden}
              <Button
                type="button"
                variant="link"
                size="sm"
                data-slot="select-all"
                disabled={field.disabled}
                onclick={() =>
                  field.setValue(
                    options.filter((option) => !option.disabled).map((option) => option.value),
                  )}
              >
                {#if component.selectAllAction?.icon}<Icon
                    name={component.selectAllAction.icon}
                  />{/if}
                {component.selectAllAction?.label ?? t('table.select_all', {}, 'Select all')}
              </Button>
            {/if}
            {#if !component.deselectAllAction?.hidden}
              <Button
                type="button"
                variant="link"
                size="sm"
                data-slot="deselect-all"
                disabled={field.disabled}
                onclick={() => field.setValue([])}
              >
                {#if component.deselectAllAction?.icon}<Icon
                    name={component.deselectAllAction.icon}
                  />{/if}
                {component.deselectAllAction?.label ?? t('table.deselect_all', {}, 'Deselect all')}
              </Button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    <div
      data-grid-direction={component.gridDirection}
      class={cn(
        component.inline
          ? 'flex flex-wrap gap-4'
          : columnFlow
            ? cn(
                'gap-x-3 *:mb-3 *:break-inside-avoid',
                COLUMN_FLOW_CLASSES[component.gridColumns ?? 1],
              )
            : 'grid gap-3',
        !component.inline &&
          !columnFlow &&
          gridColumnsClasses(
            component.gridColumns ? { default: 1, md: component.gridColumns } : { default: 1 },
          ),
      )}
      role="group"
      aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
      aria-describedby={field.aria['aria-describedby']}
    >
      {#each visible as option (option.value)}
        {@const optionId = `${field.id}-${option.value}`}
        <div class="flex items-start gap-2">
          <Checkbox
            id={optionId}
            checked={selected.includes(option.value)}
            disabled={field.disabled || field.readOnly || option.disabled}
            onCheckedChange={(checked) => toggle(option.value, checked === true)}
            aria-invalid={field.aria['aria-invalid']}
            class="mt-0.5"
          />
          <div class="grid gap-0.5">
            <Label
              for={optionId}
              class={cn('font-normal', option.color && textColorClasses[option.color])}
              >{#if option.icon}<Icon
                  name={option.icon}
                  class="size-4"
                />{/if}{#if component.allowHtml}<span>{@html option.label}</span
                >{:else}{option.label}{/if}</Label
            >
            {#if option.description}<p class="text-muted-foreground text-xs">
                {option.description}
              </p>{/if}
          </div>
        </div>
      {/each}
    </div>
    {#if component.searchable && query !== '' && visible.length === 0}
      <p data-slot="checkbox-list-empty" role="status" class="text-muted-foreground text-sm">
        {component.noSearchResultsMessage ?? t('no_results', {}, 'No results.')}
      </p>
    {/if}
  </div>
</FieldWrapper>
