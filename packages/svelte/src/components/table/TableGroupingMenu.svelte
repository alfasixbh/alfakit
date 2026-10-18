<script lang="ts">
  import type { TableSchema } from '@alfakit/core'
  import { triggerButtonView, visitTable } from '@alfakit/core'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import Icon from '../../lib/Icon.svelte'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import TableTriggerButton from './TableTriggerButton.svelte'

  /** The "group by" menu: one of the table's groups (or none) and the direction. */
  let { table }: { table: TableSchema } = $props()
  const t = useT()

  const active = $derived(table.grouping?.group ?? '')
  // `groupRecordsTriggerAction()`.
  const trigger = $derived(
    triggerButtonView(table, 'groupRecords', {
      label: t('table_grouping.group_by', {}, 'Group by'),
    }),
  )
  const inDropdownOnly = $derived(Boolean(table.groupingSettingsInDropdownOnDesktop))

  const changeGroup = (group: string) => visitTable(table.identifier, { group }, ['page'])
  const changeDirection = (direction: string) =>
    visitTable(table.identifier, { groupDirection: direction === 'desc' ? 'desc' : 'asc' }, [
      'page',
    ])
</script>

{#snippet layersIcon()}<Icon name="alfakit::tables.actions.group" fallback={LayersIcon} />{/snippet}

{#if table.groups && table.groups.length > 0}
  {#if !inDropdownOnly}
    <!-- Desktop default: the settings inline in the toolbar (the dropdown is for phones). -->
    <div data-slot="table-grouping-inline" class="hidden items-center gap-2 text-sm sm:flex">
      <label class="flex items-center gap-2">
        <span class="text-muted-foreground">{t('table_grouping.group_by', {}, 'Group by')}</span>
        <select
          value={active}
          onchange={(event) => changeGroup(event.currentTarget.value)}
          class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">{t('table_grouping.none', {}, 'No grouping')}</option>
          {#each table.groups as group (group.id)}
            <option value={group.id}>{group.label}</option>
          {/each}
        </select>
      </label>
      {#if table.grouping && !table.groupingDirectionSettingHidden}
        <label class="flex items-center">
          <span class="sr-only">{t('table_grouping.direction', {}, 'Group direction')}</span>
          <select
            value={table.grouping.direction}
            onchange={(event) => changeDirection(event.currentTarget.value)}
            class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="asc">{t('table_grouping.ascending', {}, 'Ascending')}</option>
            <option value="desc">{t('table_grouping.descending', {}, 'Descending')}</option>
          </select>
        </label>
      {/if}
    </div>
  {/if}
  {#if trigger}
    <div class={cn(!inDropdownOnly && 'sm:hidden')}>
      <DropdownMenu>
        <DropdownMenuTrigger>
          {#snippet child({ props })}
            <TableTriggerButton
              view={trigger}
              defaultIcon={layersIcon}
              responsiveLabel={!table.triggerActions?.groupRecords}
              active={Boolean(table.grouping)}
              {...props}
            />
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48">
          <DropdownMenuLabel>{t('table_grouping.group_by', {}, 'Group by')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={active} onValueChange={changeGroup}>
            <DropdownMenuRadioItem value=""
              >{t('table_grouping.none', {}, 'No grouping')}</DropdownMenuRadioItem
            >
            {#each table.groups as group (group.id)}
              <DropdownMenuRadioItem value={group.id}>{group.label}</DropdownMenuRadioItem>
            {/each}
          </DropdownMenuRadioGroup>
          {#if table.grouping && !table.groupingDirectionSettingHidden}
            <DropdownMenuSeparator />
            <DropdownMenuLabel
              >{t('table_grouping.direction', {}, 'Group direction')}</DropdownMenuLabel
            >
            <DropdownMenuRadioGroup
              value={table.grouping.direction}
              onValueChange={changeDirection}
            >
              <DropdownMenuRadioItem value="asc"
                >{t('table_grouping.ascending', {}, 'Ascending')}</DropdownMenuRadioItem
              >
              <DropdownMenuRadioItem value="desc"
                >{t('table_grouping.descending', {}, 'Descending')}</DropdownMenuRadioItem
              >
            </DropdownMenuRadioGroup>
          {/if}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  {/if}
{/if}
