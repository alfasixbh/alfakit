<script lang="ts">
  import type {
    ActionContext,
    ActionSchema,
    AnyActionSchema,
    ColumnSchema,
    TableRecordSchema,
  } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import { useActionRunner, useT } from '../../context.svelte'
  import TableCellContent from './TableCellContent.svelte'

  /**
   * A record's cell content wrapped in its link: the column `url()`, the column `action()`,
   * or (for the primary cell of a clickable record) the record URL or record action. Used
   * by content layouts.
   */
  interface Props {
    column: ColumnSchema
    record: TableRecordSchema
    token: string
    component: string
    context: ActionContext
    clickable: boolean
    primary: boolean
    hasRecordAction: boolean
    onRecordClick: (record: TableRecordSchema) => void
  }

  let {
    column,
    record,
    token,
    component,
    context,
    clickable,
    primary,
    hasRecordAction,
    onRecordClick,
  }: Props = $props()

  const t = useT()
  const runner = useActionRunner()
  const cell = $derived(record.cells[column.name] ?? {})
  const focusRing = 'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]'

  const runCellAction = (event: MouseEvent) => {
    event.stopPropagation()
    const action = (record.actions ?? [])
      .flatMap((item: AnyActionSchema) => ('actions' in item ? item.actions : [item]))
      .find((item): item is ActionSchema => 'name' in item && item.name === cell.action)

    if (action) void runner.trigger(action, { ...context, record: record.key })
  }
</script>

{#snippet content()}
  <TableCellContent {column} {cell} recordKey={record.key} {token} {component} />
{/snippet}

{#if cell.url && cell.openUrlInNewTab}
  <a
    href={cell.url}
    target="_blank"
    rel="noopener noreferrer"
    class="hover:underline"
    onclick={(event) => event.stopPropagation()}
    >{@render content()}<span class="sr-only">
      {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span
    ></a
  >
{:else if cell.url}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="contents" onclick={(event) => event.stopPropagation()}
    ><Link href={cell.url} class="hover:underline">{@render content()}</Link></span
  >
{:else if cell.action && record.actions}
  <button type="button" class="text-start hover:underline" onclick={runCellAction}>
    {@render content()}
  </button>
{:else if clickable && primary}
  {#if hasRecordAction || !record.url}
    <button
      type="button"
      class="{focusRing} text-start"
      onclick={(event) => {
        event.stopPropagation()
        onRecordClick(record)
      }}
    >
      {@render content()}
    </button>
  {:else if record.openUrlInNewTab}
    <a
      href={record.url}
      target="_blank"
      rel="noopener noreferrer"
      class={focusRing}
      onclick={(event) => event.stopPropagation()}
      >{@render content()}<span class="sr-only">
        {t('opens_in_new_tab', {}, '(opens in a new tab)')}</span
      ></a
    >
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <span class="contents" onclick={(event) => event.stopPropagation()}
      ><Link href={record.url} class={focusRing}>{@render content()}</Link></span
    >
  {/if}
{:else}
  {@render content()}
{/if}
