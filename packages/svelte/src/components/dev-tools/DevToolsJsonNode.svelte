<script lang="ts">
  import {
    jsonEntries,
    jsonScalar,
    jsonSize,
    type JsonEntry,
    type JsonSearchResult,
  } from '@alfakit/core'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { useFormatter, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import Self from './DevToolsJsonNode.svelte'

  let {
    entry,
    depth,
    search,
    query,
  }: { entry: JsonEntry; depth: number; search: JsonSearchResult; query: string } = $props()

  const t = useT()
  const formatter = useFormatter()
  // svelte-ignore state_referenced_locally
  let open = $state(depth < 1)
  const searching = $derived(query.trim() !== '')
  const hidden = $derived(searching && !search.visible.has(entry.path))
  const container = $derived(entry.kind === 'object' || entry.kind === 'array')
  const expanded = $derived(searching || open)
  const matched = $derived(search.matches.has(entry.path))
  const size = $derived(jsonSize(entry.value))
  const summary = $derived(
    entry.kind === 'array'
      ? `[${formatter.current.number(size)}]`
      : `{${formatter.current.number(size)}}`,
  )
</script>

{#if !hidden}
  {#if !container}
    <li
      role="treeitem"
      aria-selected="false"
      class="py-px"
      style:padding-inline-start="{depth * 12 + 16}px"
    >
      <span class={cn('text-foreground', matched && 'bg-primary/15 rounded-sm')}>{entry.key}</span
      ><span class="text-muted-foreground">: </span><span
        class={cn(
          entry.kind === 'string' && 'text-emerald-700 dark:text-emerald-400',
          entry.kind === 'number' && 'text-sky-700 dark:text-sky-400',
          entry.kind === 'boolean' && 'text-violet-700 dark:text-violet-400',
          entry.kind === 'null' && 'text-muted-foreground',
          'break-all',
        )}>{jsonScalar(entry.value)}</span
      >
    </li>
  {:else}
    <li role="treeitem" aria-selected="false" aria-expanded={expanded}>
      <button
        type="button"
        class="hover:bg-muted flex w-full items-center gap-1 rounded py-px text-start"
        style:padding-inline-start="{depth * 12}px"
        aria-label={expanded
          ? t('dev_tools.collapse', { key: entry.key }, 'Collapse :key')
          : t('dev_tools.expand', { key: entry.key }, 'Expand :key')}
        onclick={() => (open = !open)}
      >
        <!-- The tree is always left to right (it is code), so the chevron does not flip. -->
        <ChevronRightIcon
          class={cn('size-3 shrink-0 transition-transform', expanded && 'rotate-90')}
        />
        <span class={cn('text-foreground', matched && 'bg-primary/15 rounded-sm')}>{entry.key}</span
        >
        <span class="text-muted-foreground">{summary}</span>
      </button>
      {#if expanded && size > 0}
        <ul role="group">
          {#each jsonEntries(entry.value, entry.path) as child (child.path)}
            <Self entry={child} depth={depth + 1} {search} {query} />
          {/each}
        </ul>
      {/if}
    </li>
  {/if}
{/if}
