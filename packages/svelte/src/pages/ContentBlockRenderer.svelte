<script lang="ts">
  import { uniqueKey, navigationKey } from '../lib/keys'
  import type {
    ContentBlock,
    FormBlock as FormBlockSchema,
    InfolistBlock,
    LinksBlock,
    RelationManagersBlock,
    SchemaBlock,
    TableBlock as TableBlockSchema,
    WidgetsBlock as WidgetsBlockSchema,
  } from '@alfakit/core'
  import { listTabIds } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import FormBlock from '../components/form/FormBlock.svelte'
  import SchemaRenderer from '../components/schema/SchemaRenderer.svelte'
  import DataTable from '../components/table/DataTable.svelte'
  import ListTabs from '../components/table/ListTabs.svelte'
  import WidgetGrid from '../components/widgets/WidgetGrid.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import { useRegistry } from '../context.svelte'
  import RelationManagers from './RelationManagers.svelte'

  let { block }: { block: ContentBlock } = $props()

  const registry = useRegistry()
  const Custom = $derived(registry.resolve(block.type))
  // The page's main table: the server sends its slots on List / ManageRelatedRecords pages only.
  const mainTable = $derived(block.type === 'Table' && block.key === 'table')
  // Links list tabs to the table they control.
  const uid = $props.id()
  const tabsIdBase = `alfakit-list-tabs-${uid.replace(/[^A-Za-z0-9_-]/g, '')}`
</script>

{#if block.type === 'Form'}
  <FormBlock block={block as FormBlockSchema} />
{:else if block.type === 'Infolist'}
  <div data-slot="infolist" class="contents">
    <SchemaRenderer
      components={(block as InfolistBlock).components}
      columns={(block as InfolistBlock).columns ?? { default: 1, lg: 2 }}
    />
  </div>
{:else if block.type === 'Schema'}
  <SchemaRenderer components={(block as SchemaBlock).components} columns={{ default: 1 }} />
{:else if block.type === 'Table'}
  {@const table = block as TableBlockSchema}
  {#if mainTable}
    <Slot name="resource.list-records.table.before" />
    <Slot name="resource.manage-related-records.table.before" />
  {/if}
  {#if table.tabs?.length}
    <div class="flex flex-col gap-4">
      <ListTabs
        tabs={table.tabs ?? []}
        activeTab={table.activeTab}
        tabsQueryKey={table.tabsQueryKey}
        label={table.pluralModelLabel}
        idBase={tabsIdBase}
      />
      <div
        data-slot="list-tabs-panel"
        role="tabpanel"
        id={listTabIds(tabsIdBase, table.activeTab ?? '').panel}
        aria-labelledby={table.activeTab ? listTabIds(tabsIdBase, table.activeTab).tab : undefined}
      >
        <DataTable {table} component={table.component} />
      </div>
    </div>
  {:else}
    <DataTable {table} component={table.component} />
  {/if}
  {#if mainTable}
    <Slot name="resource.manage-related-records.table.after" />
    <Slot name="resource.list-records.table.after" />
  {/if}
{:else if block.type === 'RelationManagers'}
  <RelationManagers block={block as RelationManagersBlock} />
{:else if block.type === 'Widgets'}
  {#if block.key === 'headerWidgets'}<Slot name="page.header-widgets.before" />{/if}
  {#if block.key === 'footerWidgets'}<Slot name="page.footer-widgets.before" />{/if}
  <WidgetGrid block={block as WidgetsBlockSchema} />
  {#if block.key === 'headerWidgets'}<Slot name="page.header-widgets.after" />{/if}
  {#if block.key === 'footerWidgets'}<Slot name="page.footer-widgets.after" />{/if}
{:else if block.type === 'Links'}
  <div class="flex flex-col items-center gap-1 text-center text-sm">
    {#each (block as LinksBlock).links as link, linkIndex (uniqueKey((block as LinksBlock).links, linkIndex, navigationKey))}
      <Link href={link.url} class="text-primary underline-offset-4 hover:underline"
        >{link.label}</Link
      >
    {/each}
  </div>
{:else if Custom}
  <Custom {block} />
{/if}
