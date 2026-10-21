<script setup lang="ts">
import type { ModalTableSelectResponse, ModalTableSelectSchema, TableQuery } from '@alfakit/core'
import {
  FILTERS_MODAL_WIDTH_CLASSES,
  debounce,
  modalTablePaging,
  toggleModalTableKey,
} from '@alfakit/core'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from '@lucide/vue'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useChoice, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useFormStore } from '../form/form-context'
import TableCellContent from '../table/TableCellContent.vue'
import Button from '../ui/Button.vue'
import Checkbox from '../ui/Checkbox.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import Input from '../ui/Input.vue'
import Skeleton from '../ui/Skeleton.vue'
import Table from '../ui/Table.vue'
import TableBody from '../ui/TableBody.vue'
import TableCell from '../ui/TableCell.vue'
import TableHead from '../ui/TableHead.vue'
import TableHeader from '../ui/TableHeader.vue'
import TableRow from '../ui/TableRow.vue'
import ModalTablePickerFilters from './ModalTablePickerFilters.vue'

const props = defineProps<{ component: ModalTableSelectSchema; initial: string[] }>()
const emit = defineEmits<{
  close: []
  confirm: [keys: string[], labels: Record<string, string>]
}>()
const t = useT()
const format = useFormatter()
const choice = useChoice()
const form = useFormStore()
const multiple = computed(() => Boolean(props.component.multiple))
const query = ref<TableQuery>({})
const response = ref<ModalTableSelectResponse | null>(null)
const failed = ref(false)
const loading = ref(true)
const draft = ref<string[]>([...props.initial])
const labels = ref<Record<string, string>>({})
const search = ref('')
let controller: AbortController | null = null

const load = () => {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true

  form
    .modalTable(
      props.component.statePath,
      props.component.tableStateIdentifier,
      query.value,
      current.signal,
    )
    .then((next) => {
      if (!next) return
      response.value = next
      labels.value = { ...labels.value, ...next.labels }
      failed.value = false
    })
    .catch((error: unknown) => {
      if ((error as { name?: string }).name !== 'AbortError') failed.value = true
    })
    .finally(() => {
      if (!current.signal.aborted) loading.value = false
    })
}

watch(query, load, { immediate: true, deep: true })
onScopeDispose(() => controller?.abort())

const table = computed(() => response.value?.table)
const pushSearch = debounce((next: string) => {
  query.value = { ...query.value, search: next || null, page: null }
}, 400)
onScopeDispose(() => pushSearch.cancel())

const columns = computed(() =>
  table.value
    ? table.value.columns.filter((column) => table.value!.visibleColumns.includes(column.name))
    : [],
)
const records = computed(() => table.value?.records ?? [])
const paging = computed(() => modalTablePaging(table.value?.pagination))
const atMax = computed(
  () =>
    multiple.value &&
    props.component.maxItems != null &&
    draft.value.length >= props.component.maxItems,
)
const hasToolbar = computed(
  () => Boolean(table.value?.searchable) || (table.value?.filters?.length ?? 0) > 0,
)

const toggle = (key: string) => {
  draft.value = toggleModalTableKey(draft.value, key, multiple.value, props.component.maxItems)
}
const isSelectable = (key: string, selectable: boolean | undefined) =>
  selectable === true && (draft.value.includes(key) || !atMax.value)
const sort = (column: string) => {
  const direction =
    table.value?.sort?.column === column && table.value.sort.direction === 'asc' ? 'desc' : 'asc'
  query.value = { ...query.value, sort: column, direction, page: null }
}
const ariaSortOf = (column: string) =>
  table.value?.sort?.column === column
    ? table.value.sort.direction === 'asc'
      ? 'ascending'
      : 'descending'
    : undefined
const goTo = (page: number) => {
  query.value = { ...query.value, page }
}
const confirm = () =>
  emit(
    'confirm',
    draft.value,
    Object.fromEntries(
      draft.value.filter((key) => labels.value[key]).map((key) => [key, labels.value[key]!]),
    ),
  )
</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && emit('close')">
    <DialogContent
      :class="
        cn(
          'flex max-h-[90vh] flex-col gap-4',
          FILTERS_MODAL_WIDTH_CLASSES[props.component.modalWidth ?? '3xl'] ?? 'sm:max-w-3xl',
        )
      "
      data-slot="modal-table-select-dialog"
    >
      <DialogHeader>
        <DialogTitle>{{ props.component.modalHeading }}</DialogTitle>
        <!-- Escaped on the server (`Html::from()`), like action modal descriptions. -->
        <p
          v-if="props.component.modalDescription"
          class="text-muted-foreground text-sm"
          data-slot="modal-table-select-description"
          v-html="props.component.modalDescription"
        />
        <DialogDescription aria-live="polite">{{
          choice('table.selected', draft.length, { count: draft.length }, ':count selected')
        }}</DialogDescription>
      </DialogHeader>
      <div v-if="table && hasToolbar" class="flex flex-col gap-3">
        <div v-if="table.searchable" class="relative">
          <SearchIcon
            class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            :model-value="search"
            :aria-label="table.searchPlaceholder"
            :placeholder="table.searchPlaceholder"
            class="ps-8"
            @update:model-value="
              (next) => {
                search = String(next)
                pushSearch(String(next))
              }
            "
          />
        </div>
        <ModalTablePickerFilters
          v-if="(table.filters?.length ?? 0) > 0"
          :table="table"
          :owner="form"
          :path="props.component.statePath"
          @change="(filters) => (query = { ...query, filters, page: null })"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-auto rounded-md border" :aria-busy="loading">
        <p v-if="failed" role="alert" class="text-destructive p-6 text-center text-sm">
          {{ t('table_select.load_failed', {}, "Couldn't load the records.") }}
        </p>
        <div v-else-if="!table" class="flex flex-col gap-2 p-4" aria-hidden="true">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
        <p v-else-if="records.length === 0" class="text-muted-foreground p-6 text-center text-sm">
          {{ table.emptyState.heading }}
        </p>
        <Table v-else :class="cn(loading && 'opacity-60')">
          <TableHeader>
            <TableRow>
              <TableHead class="w-10"
                ><span class="sr-only">{{
                  t('table.select_row', {}, 'Select row')
                }}</span></TableHead
              >
              <TableHead
                v-for="column in columns"
                :key="column.name"
                :aria-sort="ariaSortOf(column.name)"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-1"
                  @click="sort(column.name)"
                >
                  {{ column.label }}
                  <template v-if="table.sort?.column === column.name">
                    <ArrowUpIcon v-if="table.sort.direction === 'asc'" class="size-3.5" />
                    <ArrowDownIcon v-else class="size-3.5" />
                  </template>
                  <ArrowUpDownIcon v-else class="text-muted-foreground size-3.5" />
                </button>
                <template v-else>{{ column.label }}</template>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="record in records"
              :key="String(record.key)"
              :data-state="draft.includes(String(record.key)) ? 'selected' : undefined"
              :class="cn(isSelectable(String(record.key), record.selectable) && 'cursor-pointer')"
              @click="
                isSelectable(String(record.key), record.selectable) && toggle(String(record.key))
              "
            >
              <TableCell class="w-10" @click.stop>
                <Checkbox
                  v-if="multiple"
                  :model-value="draft.includes(String(record.key))"
                  :disabled="!isSelectable(String(record.key), record.selectable)"
                  :aria-label="
                    t(
                      'table_select.select_record',
                      { label: labels[String(record.key)] ?? String(record.key) },
                      'Select :label',
                    )
                  "
                  @update:model-value="toggle(String(record.key))"
                />
                <input
                  v-else
                  type="radio"
                  :name="`${props.component.statePath}-picker`"
                  class="accent-primary size-4"
                  :checked="draft.includes(String(record.key))"
                  :disabled="!isSelectable(String(record.key), record.selectable)"
                  :aria-label="
                    t(
                      'table_select.select_record',
                      { label: labels[String(record.key)] ?? String(record.key) },
                      'Select :label',
                    )
                  "
                  @change="toggle(String(record.key))"
                />
              </TableCell>
              <TableCell v-for="column in columns" :key="column.name">
                <TableCellContent
                  v-if="record.cells[column.name]"
                  :column="column"
                  :cell="record.cells[column.name]!"
                  :record-key="record.key"
                  token=""
                  :component="`picker:${props.component.statePath}`"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p v-if="atMax" class="text-muted-foreground text-sm" role="status">
        {{
          choice(
            'table_select.max_reached',
            props.component.maxItems ?? 0,
            { count: props.component.maxItems ?? 0 },
            'You can select up to :count records.',
          )
        }}
      </p>
      <DialogFooter class="items-center sm:justify-between">
        <nav
          v-if="paging"
          class="flex items-center gap-2"
          :aria-label="t('pagination', {}, 'Pagination')"
        >
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="!paging.hasPrevious || loading"
            :aria-label="t('table.previous', {}, 'Previous')"
            @click="goTo(paging.page - 1)"
            ><ChevronLeftIcon class="rtl:rotate-180"
          /></Button>
          <span class="text-muted-foreground text-sm">{{
            paging.total !== undefined
              ? t(
                  'table.showing',
                  {
                    first: format.number(paging.from),
                    last: format.number(paging.to),
                    total: format.number(paging.total),
                  },
                  'Showing :first–:last of :total',
                )
              : `${paging.from}–${paging.to}`
          }}</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="!paging.hasNext || loading"
            :aria-label="t('table.next', {}, 'Next')"
            @click="goTo(paging.page + 1)"
            ><ChevronRightIcon class="rtl:rotate-180"
          /></Button>
        </nav>
        <span v-else />
        <div class="flex gap-2">
          <Button v-if="draft.length > 0" type="button" variant="ghost" @click="draft = []">{{
            t('table_select.clear', {}, 'Clear selection')
          }}</Button>
          <Button type="button" variant="outline" @click="emit('close')">{{
            t('cancel', {}, 'Cancel')
          }}</Button>
          <Button type="button" @click="confirm">{{
            props.component.modalSubmitActionLabel ?? t('table_select.confirm', {}, 'Select')
          }}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
