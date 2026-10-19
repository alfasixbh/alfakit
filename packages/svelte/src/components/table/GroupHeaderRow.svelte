<script lang="ts">
  import type { TableRecordGroupSchema } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { useT } from '../../context.svelte'
  import { colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { Checkbox } from '../ui/checkbox'
  import { TableCell, TableRow } from '../ui/table'

  /** A group heading row (`data-slot="table-group"`), with a collapse toggle when collapsible. */
  let {
    group,
    collapsed,
    collapsible,
    colSpan,
    onToggle,
    selection,
  }: {
    group: TableRecordGroupSchema
    collapsed: boolean
    collapsible: boolean
    colSpan: number
    onToggle: () => void
    /** `selectGroupsOnly()`: a checkbox selecting the group's records on the page. */
    selection?: { checked: boolean | 'indeterminate'; onChange: (checked: boolean) => void }
  } = $props()

  const t = useT()
  const toggleLabel = $derived(
    `${collapsed ? t('table_grouping.expand', {}, 'Expand group') : t('table_grouping.collapse', {}, 'Collapse group')}: ${group.title}`,
  )
</script>

{#snippet text()}
  <span class="flex flex-col items-start">
    <span class="font-medium">{group.title}</span>
    {#if group.description}
      <span class="text-muted-foreground text-xs font-normal">{group.description}</span>
    {/if}
  </span>
{/snippet}

<!-- An enum group shows its `HasIcon` icon, in its `HasColor` colour, before the title. -->
{#snippet content()}
  {#if group.icon}
    <span data-slot="table-group-title" class="flex items-center gap-2">
      <Icon
        name={group.icon}
        class={`size-4 shrink-0 ${colorClass(textColorClasses, group.color, 'gray')}`}
        aria-hidden="true"
      />
      {@render text()}
    </span>
  {:else}
    {@render text()}
  {/if}
{/snippet}

<TableRow data-slot="table-group" class="bg-muted/50 hover:bg-muted/50">
  <TableCell colspan={colSpan} class="py-2">
    <span class="flex items-center gap-3">
      {#if selection}
        <Checkbox
          checked={selection.checked === true}
          indeterminate={selection.checked === 'indeterminate'}
          onCheckedChange={(checked) => selection?.onChange(checked === true)}
          aria-label={t('table.select_group', { group: group.title }, 'Select group :group')}
        />
      {/if}
      {#if collapsible}
        <button
          type="button"
          class="focus-visible:ring-ring/50 flex items-center gap-2 rounded-sm text-start outline-none focus-visible:ring-[3px]"
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          onclick={onToggle}
        >
          {#if collapsed}
            <ChevronRightIcon class="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          {:else}
            <Icon
              name="alfakit::tables.grouping.collapse-button"
              fallback={ChevronDownIcon}
              class="size-4 shrink-0"
              aria-hidden="true"
            />
          {/if}
          {@render content()}
        </button>
      {:else}
        {@render content()}
      {/if}
    </span>
  </TableCell>
</TableRow>
