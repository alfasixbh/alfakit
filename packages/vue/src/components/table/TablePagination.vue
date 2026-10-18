<script setup lang="ts">
import type { TableSchema } from '@alfakit/core'
import {
  extremePageLinks,
  isAppendingPagination,
  nextPageQuery,
  prefetchTablePage,
  previousPageQuery,
  visitTable,
} from '@alfakit/core'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import Button from '../ui/Button.vue'

const props = defineProps<{ table: TableSchema }>()
const t = useT()
const pagination = computed(() => props.table.pagination)

function pageWindow(current: number, last: number): Array<number | null> {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b)
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
const numbered = computed(() => {
  const value = pagination.value

  return value && (value.mode === undefined || value.mode === 'default') ? value : null
})
const appending = computed(() =>
  isAppendingPagination(pagination.value) ? pagination.value : null,
)
const pages = computed(() =>
  numbered.value ? pageWindow(numbered.value.currentPage, numbered.value.lastPage) : [],
)
// `extremePaginationLinks()`: first / last page buttons around numbered pages.
const extremes = computed(() =>
  numbered.value
    ? extremePageLinks(props.table, numbered.value.currentPage, numbered.value.lastPage)
    : null,
)
const previous = computed(() => previousPageQuery(pagination.value))
const next = computed(() => nextPageQuery(pagination.value))
const summary = computed(() => {
  const value = pagination.value

  if (!value) return ''

  return numbered.value
    ? t(
        'table.showing',
        { first: value.from, last: value.to, total: numbered.value.total },
        `Showing ${value.from}–${value.to} of ${numbered.value.total}`,
      )
    : t(
        'table.showing_range',
        { first: value.from, last: value.to },
        `Showing ${value.from}–${value.to}`,
      )
})
const goTo = (page: number) => visitTable(props.table.identifier, { page }, ['page'])
// The next page is fetched while hovering or focusing "next" (cached for a few seconds).
const prefetchNext = () => next.value && prefetchTablePage(props.table.identifier, next.value)
// `deferTotals()`: the total and page numbers arrive after the rows.
const pendingTotal = computed(
  () => pagination.value?.mode === 'simple' && pagination.value.pendingTotal === true,
)
const visit = (query: ReturnType<typeof nextPageQuery>) =>
  query && visitTable(props.table.identifier, query, ['page'])
const setPerPage = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  visitTable(props.table.identifier, { perPage: value === 'all' ? 'all' : Number(value) }, ['page'])
}

// Load more / infinite scroll: the server returns every record up to the requested page,
// so asking for the next page appends it (and reloads keep what was already shown). A
// request that fails shows a retry control instead of staying on "Loading more…"; infinite
// scroll waits for the retry rather than requesting again.
const loading = ref(false)
const failed = ref(false)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(
  () => pagination.value?.to,
  () => {
    loading.value = false
    failed.value = false
  },
)

const loadMore = () => {
  if (!next.value || loading.value) return

  let succeeded = false
  let cancelled = false
  loading.value = true
  failed.value = false
  visitTable(props.table.identifier, next.value, ['page'], {
    onSuccess: () => {
      succeeded = true
    },
    onCancel: () => {
      cancelled = true
    },
    onFinish: () => {
      loading.value = false
      if (!succeeded && !cancelled) failed.value = true
    },
  })
}

watch(
  [sentinel, () => appending.value?.mode, next, failed],
  ([element, mode, query, hasFailed]) => {
    observer?.disconnect()
    observer = null

    if (
      !element ||
      mode !== 'infinite' ||
      !query ||
      hasFailed ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return
    }

    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore()
    })
    observer.observe(element)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div v-if="pagination" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-muted-foreground flex items-center gap-3 text-sm">
      <span>{{ summary }}</span>
      <span
        v-if="pendingTotal"
        data-slot="pagination-total"
        aria-busy="true"
        :aria-label="t('loading', {}, 'Loading')"
        class="bg-muted-foreground/20 inline-block h-4 w-12 animate-pulse rounded-md"
      />
      <label v-if="pagination.pageOptions.length > 1" class="flex items-center gap-2">
        <span class="sr-only sm:not-sr-only">{{ t('table.per_page', {}, 'Per page') }}</span>
        <select
          :value="String(pagination.perPage)"
          class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          @change="setPerPage"
        >
          <option v-for="option in pagination.pageOptions" :key="option" :value="String(option)">
            {{ option === 'all' ? t('table.all', {}, 'All') : option }}
          </option>
        </select>
      </label>
    </div>
    <template v-if="appending">
      <template v-if="next">
        <div v-if="failed" class="flex items-center gap-2 text-sm" role="alert">
          <span class="text-destructive">{{
            t('table.load_more_failed', {}, "Couldn't load more records.")
          }}</span>
          <Button type="button" variant="outline" size="sm" @click="loadMore">{{
            t('retry', {}, 'Retry')
          }}</Button>
        </div>
        <div
          v-else-if="appending.mode === 'infinite'"
          ref="sentinel"
          class="text-muted-foreground text-sm"
          aria-live="polite"
        >
          {{ loading ? t('table.loading_more', {}, 'Loading more…') : '' }}
        </div>
        <Button
          v-else
          type="button"
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="loadMore"
        >
          {{
            loading ? t('table.loading_more', {}, 'Loading more…') : t('load_more', {}, 'Load more')
          }}
        </Button>
      </template>
    </template>
    <nav
      v-else-if="previous || next"
      class="flex items-center gap-1"
      :aria-label="t('pagination', {}, 'Pagination')"
    >
      <Button
        v-if="extremes"
        type="button"
        variant="outline"
        size="icon-sm"
        data-slot="pagination-first"
        :disabled="extremes.first === null"
        :aria-label="t('table.first_page', {}, 'First page')"
        @click="goTo(1)"
        ><Icon
          name="alfakit::support.pagination.first-button"
          :fallback="ChevronsLeftIcon"
          class="rtl:rotate-180"
      /></Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        :disabled="!previous"
        :aria-label="t('table.previous', {}, 'Previous')"
        @click="visit(previous)"
        ><Icon
          name="alfakit::support.pagination.previous-button"
          :fallback="ChevronLeftIcon"
          class="rtl:rotate-180"
      /></Button>
      <template v-if="numbered && !numbered.simple">
        <template v-for="(page, index) in pages" :key="page === null ? `gap-${index}` : page">
          <span v-if="page === null" class="text-muted-foreground px-1">…</span>
          <Button
            v-else
            type="button"
            :variant="page === numbered.currentPage ? 'default' : 'outline'"
            size="icon-sm"
            :aria-current="page === numbered.currentPage ? 'page' : undefined"
            @click="goTo(page)"
            >{{ page }}</Button
          >
        </template>
      </template>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        :disabled="!next"
        :aria-label="t('table.next', {}, 'Next')"
        @click="visit(next)"
        @pointerenter="prefetchNext"
        @focus="prefetchNext"
        ><Icon
          name="alfakit::support.pagination.next-button"
          :fallback="ChevronRightIcon"
          class="rtl:rotate-180"
      /></Button>
      <Button
        v-if="extremes"
        type="button"
        variant="outline"
        size="icon-sm"
        data-slot="pagination-last"
        :disabled="extremes.last === null"
        :aria-label="t('table.last_page', {}, 'Last page')"
        @click="extremes.last !== null && goTo(extremes.last)"
        ><Icon
          name="alfakit::support.pagination.last-button"
          :fallback="ChevronsRightIcon"
          class="rtl:rotate-180"
      /></Button>
    </nav>
  </div>
</template>
