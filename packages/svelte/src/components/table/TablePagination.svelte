<script lang="ts">
  import { uniqueKey, valueKey } from '../../lib/keys'
  import type { TableQuery, TableSchema } from '@alfakit/core'
  import {
    extremePageLinks,
    isAppendingPagination,
    nextPageQuery,
    prefetchTablePage,
    previousPageQuery,
    visitTable,
  } from '@alfakit/core'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import ChevronsLeftIcon from '@lucide/svelte/icons/chevrons-left'
  import ChevronsRightIcon from '@lucide/svelte/icons/chevrons-right'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Button } from '../ui/button'

  let { table }: { table: TableSchema } = $props()

  const t = useT()
  const pagination = $derived(table.pagination)

  function pageWindow(current: number, last: number): Array<number | null> {
    if (last <= 7) {
      return Array.from({ length: last }, (_, index) => index + 1)
    }

    const sorted = [...new Set<number>([1, last, current - 1, current, current + 1])]
      .filter((page) => page >= 1 && page <= last)
      .sort((a, b) => a - b)
    const result: Array<number | null> = []

    sorted.forEach((page, index) => {
      if (index > 0 && page - (sorted[index - 1] ?? 0) > 1) {
        result.push(null)
      }

      result.push(page)
    })

    return result
  }

  // Numbered pages (the default mode) know their total and last page.
  const numbered = $derived(
    pagination && (pagination.mode === undefined || pagination.mode === 'default')
      ? pagination
      : null,
  )
  const appending = $derived(isAppendingPagination(pagination) ? pagination : null)
  const pages = $derived(numbered ? pageWindow(numbered.currentPage, numbered.lastPage) : [])
  const previous = $derived(previousPageQuery(pagination))
  const next = $derived(nextPageQuery(pagination))
  // The next page is fetched while hovering or focusing "next" (cached for a few seconds).
  const prefetchNext = () => next && prefetchTablePage(table.identifier, next)
  // `extremePaginationLinks()`: first / last page buttons around numbered pages.
  const extremes = $derived(
    numbered ? extremePageLinks(table, numbered.currentPage, numbered.lastPage) : null,
  )
  const visit = (query: TableQuery | null) => query && visitTable(table.identifier, query, ['page'])

  // Load more / infinite scroll: the server returns every record up to the requested page,
  // so asking for the next page appends it (and reloads keep what was already shown). A
  // request that fails shows a retry control instead of staying on "Loading more…";
  // infinite scroll waits for the retry rather than requesting again.
  let loading = $state(false)
  let failed = $state(false)
  let loadedTo = $state<number | undefined>(undefined)
  let sentinel = $state<HTMLElement | null>(null)

  $effect.pre(() => {
    const to = pagination?.to

    if (to !== loadedTo) {
      loadedTo = to
      loading = false
      failed = false
    }
  })

  const loadMore = () => {
    if (!next || loading) return

    let succeeded = false
    let cancelled = false
    loading = true
    failed = false
    visitTable(table.identifier, next, ['page'], {
      onSuccess: () => {
        succeeded = true
      },
      onCancel: () => {
        cancelled = true
      },
      onFinish: () => {
        loading = false
        if (!succeeded && !cancelled) failed = true
      },
    })
  }

  $effect(() => {
    if (
      !sentinel ||
      appending?.mode !== 'infinite' ||
      !next ||
      failed ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore()
    })

    observer.observe(sentinel)

    return () => observer.disconnect()
  })
</script>

{#if pagination}
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-muted-foreground flex items-center gap-3 text-sm">
      <span
        >{numbered
          ? t(
              'table.showing',
              { first: pagination.from, last: pagination.to, total: numbered.total },
              `Showing ${pagination.from}–${pagination.to} of ${numbered.total}`,
            )
          : t(
              'table.showing_range',
              { first: pagination.from, last: pagination.to },
              `Showing ${pagination.from}–${pagination.to}`,
            )}</span
      >
      {#if pagination.mode === 'simple' && pagination.pendingTotal}
        <!-- `deferTotals()`: the total and page numbers arrive after the rows. -->
        <span
          data-slot="pagination-total"
          aria-busy="true"
          aria-label={t('loading', {}, 'Loading')}
          class="bg-muted-foreground/20 inline-block h-4 w-12 animate-pulse rounded-md"
        ></span>
      {/if}
      {#if pagination.pageOptions.length > 1}
        <label class="flex items-center gap-2">
          <span class="sr-only sm:not-sr-only">{t('table.per_page', {}, 'Per page')}</span>
          <select
            value={String(pagination.perPage)}
            onchange={(event) =>
              visitTable(
                table.identifier,
                {
                  perPage:
                    event.currentTarget.value === 'all' ? 'all' : Number(event.currentTarget.value),
                },
                ['page'],
              )}
            class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          >
            {#each pagination.pageOptions as option, optionIndex (uniqueKey(pagination.pageOptions, optionIndex, valueKey))}
              <option value={String(option)}
                >{option === 'all' ? t('table.all', {}, 'All') : option}</option
              >
            {/each}
          </select>
        </label>
      {/if}
    </div>
    {#if appending}
      {#if next && failed}
        <div class="flex items-center gap-2 text-sm" role="alert">
          <span class="text-destructive"
            >{t('table.load_more_failed', {}, "Couldn't load more records.")}</span
          >
          <Button type="button" variant="outline" size="sm" onclick={loadMore}
            >{t('retry', {}, 'Retry')}</Button
          >
        </div>
      {:else if next && appending.mode === 'infinite'}
        <div bind:this={sentinel} class="text-muted-foreground text-sm" aria-live="polite">
          {loading ? t('table.loading_more', {}, 'Loading more…') : ''}
        </div>
      {:else if next}
        <Button type="button" variant="outline" size="sm" disabled={loading} onclick={loadMore}>
          {loading ? t('table.loading_more', {}, 'Loading more…') : t('load_more', {}, 'Load more')}
        </Button>
      {/if}
    {:else if previous || next}
      <nav class="flex items-center gap-1" aria-label={t('pagination', {}, 'Pagination')}>
        {#if extremes}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            data-slot="pagination-first"
            disabled={extremes.first === null}
            onclick={() => visitTable(table.identifier, { page: 1 }, ['page'])}
            aria-label={t('table.first_page', {}, 'First page')}
          >
            <Icon
              name="alfakit::support.pagination.first-button"
              fallback={ChevronsLeftIcon}
              class="rtl:rotate-180"
            />
          </Button>
        {/if}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!previous}
          onclick={() => visit(previous)}
          aria-label={t('table.previous', {}, 'Previous')}
        >
          <Icon
            name="alfakit::support.pagination.previous-button"
            fallback={ChevronLeftIcon}
            class="rtl:rotate-180"
          />
        </Button>
        {#if numbered && !numbered.simple}
          {#each pages as page, index (page === null ? `gap-${index}` : page)}
            {#if page === null}
              <span class="text-muted-foreground px-1">…</span>
            {:else}
              <Button
                type="button"
                variant={page === numbered.currentPage ? 'default' : 'outline'}
                size="icon-sm"
                onclick={() => visitTable(table.identifier, { page }, ['page'])}
                aria-current={page === numbered.currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            {/if}
          {/each}
        {/if}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!next}
          onclick={() => visit(next)}
          onpointerenter={prefetchNext}
          onfocus={prefetchNext}
          aria-label={t('table.next', {}, 'Next')}
        >
          <Icon
            name="alfakit::support.pagination.next-button"
            fallback={ChevronRightIcon}
            class="rtl:rotate-180"
          />
        </Button>
        {#if extremes}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            data-slot="pagination-last"
            disabled={extremes.last === null}
            onclick={() => {
              if (extremes && extremes.last !== null) {
                visitTable(table.identifier, { page: extremes.last }, ['page'])
              }
            }}
            aria-label={t('table.last_page', {}, 'Last page')}
          >
            <Icon
              name="alfakit::support.pagination.last-button"
              fallback={ChevronsRightIcon}
              class="rtl:rotate-180"
            />
          </Button>
        {/if}
      </nav>
    {/if}
  </div>
{/if}
