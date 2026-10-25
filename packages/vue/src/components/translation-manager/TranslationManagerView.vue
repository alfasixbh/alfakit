<script setup lang="ts">
import type {
  TranslationCellRef,
  TranslationFilter,
  TranslationManagerEnvironment,
  TranslationManagerSchema,
} from '@alfakit/core'
import { TranslationManagerController, clientErrorNotification } from '@alfakit/core'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  HistoryIcon,
  LanguagesIcon,
  SearchIcon,
  SparklesIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, toRaw, useId, watch } from 'vue'
import { useActionRunner, useDirection, useFormatter, useT } from '../../context'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { showToast } from '../notifications/flash-toasts'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import CardHeader from '../ui/CardHeader.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuCheckboxItem from '../ui/DropdownMenuCheckboxItem.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import Input from '../ui/Input.vue'
import Textarea from '../ui/Textarea.vue'

/**
 * Keys by locale with search, filters, inline editing (plural forms, right-to-left
 * inputs), keyboard navigation, AI suggestion review and history. Everything is computed
 * and saved by the server.
 */
const props = defineProps<{ schema: TranslationManagerSchema }>()

const SELECT =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'

const runner = useActionRunner()
const page = usePageActionContext()
const t = useT()
const direction = useDirection()
const formatter = useFormatter()
const labelId = useId()
const hintId = useId()
const errorId = useId()

const environment = (): TranslationManagerEnvironment => ({
  runner,
  token: page.token,
  t,
  notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
  error: (message) => showToast(clientErrorNotification('translation-manager', message)),
})

const controller = new TranslationManagerController(toRaw(props.schema), environment())
const state = useStore(controller.store)
const cells = new Map<string, HTMLElement>()
const cellKey = (ref: TranslationCellRef) => `${ref.row}\u0000${ref.locale}`

watch(
  () => props.schema,
  (schema) => controller.setSchema(toRaw(schema)),
)

onBeforeUnmount(() => controller.dispose())

const locales = computed(() => {
  void state.value.visibleLocales

  return controller.visibleLocales()
})
const active = computed<TranslationCellRef | null>(() => {
  const current = state.value.active

  if (current && state.value.rows.some((row) => row.id === current.row)) return current

  const row = state.value.rows[0]
  const locale = locales.value[0]

  return row && locale ? { row: row.id, locale: locale.code } : null
})
const range = computed(() => {
  void state.value.rows

  return controller.range()
})
const suggestionLocales = computed(() => {
  void state.value.rows

  return controller.suggestionLocales()
})
const activeRow = computed(() =>
  active.value ? state.value.rows.find((row) => row.id === active.value?.row) : undefined,
)
const activeLocale = computed(() =>
  active.value ? controller.locale(active.value.locale) : undefined,
)
const activeCell = computed(() =>
  activeRow.value && activeLocale.value
    ? activeRow.value.cells[activeLocale.value.code]
    : undefined,
)

const isActive = (ref: TranslationCellRef) =>
  active.value?.row === ref.row && active.value.locale === ref.locale
const isEditing = (ref: TranslationCellRef) =>
  state.value.editing?.row === ref.row && state.value.editing.locale === ref.locale
const editable = (ref: TranslationCellRef) => {
  void state.value.rows

  return controller.isEditable(ref)
}

const setCell = (ref: TranslationCellRef) => (element: unknown) => {
  if (element instanceof HTMLElement) cells.set(cellKey(ref), element)
  else cells.delete(cellKey(ref))
}

const focusCell = (ref: TranslationCellRef | undefined) => {
  if (!ref) return
  controller.focus(ref)
  void nextTick(() => cells.get(cellKey(ref))?.focus())
}

watch(
  () => state.value.editing,
  (editing) => {
    if (editing) {
      void nextTick(() => cells.get(cellKey(editing))?.querySelector('textarea')?.focus())
    }
  },
)

const onCellKeyDown = (ref: TranslationCellRef, event: KeyboardEvent) => {
  if (event.target !== event.currentTarget) return

  const result = controller.handleCellKey(ref, event, direction.value)

  if (result.handled) {
    event.preventDefault()
    if (!controller.state.editing) focusCell(result.focus)
  }
}

const onEditorKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
    event.preventDefault()
    void controller
      .handleEditorKey({ key: event.key, shiftKey: event.shiftKey, isComposing: event.isComposing })
      .then((result) => focusCell(result.focus))
  }
}

const onCellClick = (ref: TranslationCellRef) => {
  if (isEditing(ref)) return
  const wasActive = isActive(ref)
  controller.focus(ref)
  if (wasActive) controller.startEdit(ref)
}

const save = (ref: TranslationCellRef) => {
  void controller.save().then((saved) => saved && focusCell(ref))
}

const cancel = (ref: TranslationCellRef) => {
  controller.cancelEdit()
  focusCell(ref)
}

const editLabel = (key: string, locale: string) =>
  t('translation-manager.edit', { key, locale }, 'Edit :key in :locale')
</script>

<template>
  <Card class="gap-4 py-4" data-slot="translation-manager">
    <CardHeader class="flex flex-col gap-4 px-5">
      <span :id="labelId" class="sr-only">{{
        t('translation-manager.label', {}, 'Translations')
      }}</span>
      <ul
        class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        data-slot="translation-progress"
      >
        <li
          v-for="locale in schema.locales"
          :key="locale.code"
          class="flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2"
        >
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="truncate font-medium" :lang="locale.code">{{ locale.label }}</span>
            <span class="text-muted-foreground font-mono text-xs">{{ locale.code }}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="Math.round((state.progress[locale.code]?.percent ?? 0) * 100)"
            :aria-label="
              t(
                'translation-manager.progress_label',
                {
                  locale: locale.label,
                  translated: state.progress[locale.code]?.translated ?? 0,
                  total: state.progress[locale.code]?.total ?? 0,
                },
                ':locale: :translated of :total translated',
              )
            "
            class="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              class="bg-primary h-full rounded-full transition-[width]"
              :style="{ width: `${(state.progress[locale.code]?.percent ?? 0) * 100}%` }"
            />
          </div>
          <span class="text-muted-foreground text-xs">
            {{
              t(
                'translation-manager.progress',
                { percent: formatter.percent(state.progress[locale.code]?.percent ?? 0) },
                ':percent translated',
              )
            }}
          </span>
        </li>
      </ul>
      <div class="flex flex-wrap items-center gap-2" data-slot="translation-toolbar">
        <div class="relative min-w-48 flex-1">
          <SearchIcon
            class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            :model-value="state.search"
            :placeholder="t('translation-manager.search', {}, 'Search keys and texts…')"
            :aria-label="t('translation-manager.search_label', {}, 'Search translations')"
            class="ps-8"
            @update:model-value="(value: string) => controller.setSearch(value)"
          />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <span class="sr-only">{{ t('translation-manager.filter_label', {}, 'Show') }}</span>
          <select
            :class="SELECT"
            :value="state.filter"
            @change="
              controller.setFilter(($event.target as HTMLSelectElement).value as TranslationFilter)
            "
          >
            <option v-for="filter in schema.filters" :key="filter" :value="filter">
              {{ t(`translation-manager.filters.${filter}`, {}, filter) }}
            </option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="sr-only">{{ t('translation-manager.group_label', {}, 'Group') }}</span>
          <select
            :class="SELECT"
            :value="state.group"
            @change="controller.setGroup(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ t('translation-manager.all_groups', {}, 'All groups') }}</option>
            <option v-for="group in schema.groups" :key="group.value" :value="group.value">
              {{ group.label }}
            </option>
          </select>
        </label>
        <DropdownMenu :dir="direction">
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="outline" size="sm" class="h-9">
              <LanguagesIcon aria-hidden="true" />
              {{ t('translation-manager.locales_label', {}, 'Languages') }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              v-for="locale in schema.locales"
              :key="locale.code"
              :model-value="state.visibleLocales.includes(locale.code)"
              @update:model-value="
                (checked: boolean) => controller.toggleLocale(locale.code, checked)
              "
              @select="(event: Event) => event.preventDefault()"
            >
              {{ locale.label }}
              <span class="text-muted-foreground ms-auto font-mono text-xs">{{ locale.code }}</span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        v-if="suggestionLocales.length > 0"
        class="bg-muted/50 flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
        data-slot="translation-suggestions"
      >
        <div
          v-for="code in suggestionLocales"
          :key="code"
          class="flex flex-wrap items-center gap-2"
        >
          <SparklesIcon class="text-primary size-4" aria-hidden="true" />
          <span class="flex-1 font-medium">
            {{ t('translation-manager.suggestion', {}, 'AI suggestion') }} ·
            {{ controller.locale(code)?.label }}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="controller.decideAll(code, 'reject')"
          >
            {{ t('translation-manager.reject_all', {}, 'Reject all') }}
          </Button>
          <Button type="button" size="sm" @click="controller.decideAll(code, 'accept')">
            {{ t('translation-manager.accept_all', {}, 'Accept all without warnings') }}
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-4 px-5">
      <p :id="hintId" class="text-muted-foreground text-xs">
        {{
          t(
            'translation-manager.keyboard',
            {},
            'Arrow keys move between texts. Enter edits and saves, Shift + Enter adds a line break, Escape cancels.',
          )
        }}
      </p>
      <p v-if="state.rows.length === 0" class="text-muted-foreground py-10 text-center text-sm">
        {{ t('translation-manager.empty', {}, 'No translations match your search.') }}
      </p>
      <div v-else class="overflow-x-auto rounded-md border" data-slot="translation-grid-scroll">
        <table
          role="grid"
          :aria-labelledby="labelId"
          :aria-describedby="hintId"
          :aria-busy="state.loading || undefined"
          :aria-rowcount="state.total + 1"
          :class="cn('w-full border-collapse text-sm', state.loading && 'opacity-60')"
          data-slot="translation-grid"
        >
          <thead class="bg-muted/50">
            <tr>
              <th
                scope="col"
                class="bg-card sticky start-0 z-10 min-w-56 border-b [background-image:linear-gradient(var(--muted),var(--muted))] px-3 py-2 text-start font-medium"
              >
                {{ t('translation-manager.key', {}, 'Key') }}
              </th>
              <th
                v-for="locale in locales"
                :key="locale.code"
                scope="col"
                class="min-w-64 border-s border-b px-3 py-2 text-start font-medium"
              >
                <span class="flex items-center gap-2">
                  <span :lang="locale.code">{{ locale.label }}</span>
                  <span class="text-muted-foreground font-mono text-xs">{{ locale.code }}</span>
                  <Badge v-if="locale.base" variant="secondary">
                    {{ t('translation-manager.base', {}, 'Base') }}
                  </Badge>
                  <Badge v-if="!locale.editable" variant="outline">
                    {{ t('translation-manager.read_only', {}, 'Read only') }}
                  </Badge>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in state.rows"
              :key="row.id"
              class="border-b last:border-b-0"
              data-slot="translation-row"
            >
              <th
                scope="row"
                class="bg-card sticky start-0 z-10 px-3 py-2 text-start align-top font-normal"
              >
                <div class="flex flex-col gap-1">
                  <code class="font-mono text-xs break-all">{{ row.key }}</code>
                  <div class="flex flex-wrap gap-1">
                    <span class="text-muted-foreground text-xs">{{ row.groupLabel }}</span>
                    <Badge v-if="row.undefined" variant="destructive">
                      {{ t('translation-manager.undefined', {}, 'Not defined') }}
                    </Badge>
                    <Badge v-if="row.unused" variant="outline">
                      {{ t('translation-manager.unused', {}, 'Unused') }}
                    </Badge>
                  </div>
                </div>
              </th>
              <td
                v-for="locale in locales"
                :key="locale.code"
                :ref="setCell({ row: row.id, locale: locale.code })"
                role="gridcell"
                :tabindex="
                  isActive({ row: row.id, locale: locale.code }) &&
                  !isEditing({ row: row.id, locale: locale.code })
                    ? 0
                    : -1
                "
                :aria-selected="isActive({ row: row.id, locale: locale.code })"
                :aria-readonly="!editable({ row: row.id, locale: locale.code }) || undefined"
                :aria-label="
                  isEditing({ row: row.id, locale: locale.code })
                    ? undefined
                    : editLabel(row.key, locale.label)
                "
                data-slot="translation-cell"
                :data-missing="row.cells[locale.code]?.value ? undefined : ''"
                :data-changed="row.cells[locale.code]?.changed ? '' : undefined"
                :data-active="isActive({ row: row.id, locale: locale.code }) ? '' : undefined"
                :class="
                  cn(
                    'hover:bg-accent/40 border-s px-3 py-2 align-top outline-none',
                    isActive({ row: row.id, locale: locale.code }) &&
                      'ring-ring/50 ring-2 ring-inset',
                    editable({ row: row.id, locale: locale.code }) && 'cursor-text',
                  )
                "
                @focus="
                  $event.target === $event.currentTarget &&
                  controller.focus({ row: row.id, locale: locale.code })
                "
                @click="onCellClick({ row: row.id, locale: locale.code })"
                @dblclick="controller.startEdit({ row: row.id, locale: locale.code })"
                @keydown="onCellKeyDown({ row: row.id, locale: locale.code }, $event)"
              >
                <div
                  v-if="isEditing({ row: row.id, locale: locale.code })"
                  class="flex flex-col gap-2"
                  data-slot="translation-editor"
                  @click.stop
                >
                  <template v-if="state.draftForms">
                    <label
                      v-for="(form, index) in state.draftForms"
                      :key="index"
                      class="flex flex-col gap-1"
                    >
                      <span class="text-muted-foreground text-xs">
                        {{
                          t(
                            'translation-manager.plural_form',
                            {
                              numbers:
                                row.cells[locale.code]?.formLabels?.[index] ?? String(index + 1),
                            },
                            'For :numbers',
                          )
                        }}
                      </span>
                      <Textarea
                        :model-value="form"
                        rows="1"
                        :dir="locale.direction"
                        :lang="locale.code"
                        :aria-label="`${editLabel(row.key, locale.label)} (${row.cells[locale.code]?.formLabels?.[index] ?? index + 1})`"
                        :aria-invalid="state.error ? true : undefined"
                        :aria-describedby="state.error ? errorId : undefined"
                        class="min-h-9"
                        @update:model-value="
                          (value: string) => controller.setDraftForm(index, value)
                        "
                        @keydown="onEditorKeyDown"
                      />
                    </label>
                  </template>
                  <Textarea
                    v-else
                    :model-value="state.draft"
                    :rows="Math.min(8, Math.max(2, state.draft.split('\n').length))"
                    :dir="locale.direction"
                    :lang="locale.code"
                    :aria-label="editLabel(row.key, locale.label)"
                    :aria-invalid="state.error ? true : undefined"
                    :aria-describedby="state.error ? errorId : undefined"
                    @update:model-value="(value: string) => controller.setDraft(value)"
                    @keydown="onEditorKeyDown"
                  />
                  <p v-if="state.error" :id="errorId" class="text-destructive text-xs">
                    {{ state.error }}
                  </p>
                  <div class="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      :disabled="state.saving"
                      @click="save({ row: row.id, locale: locale.code })"
                    >
                      {{
                        state.saving
                          ? t('translation-manager.saving', {}, 'Saving…')
                          : t('translation-manager.save', {}, 'Save')
                      }}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      :disabled="state.saving"
                      @click="cancel({ row: row.id, locale: locale.code })"
                    >
                      {{ t('translation-manager.cancel', {}, 'Cancel') }}
                    </Button>
                    <Button
                      v-if="!locale.base"
                      type="button"
                      size="sm"
                      variant="ghost"
                      class="ms-auto"
                      :disabled="state.saving"
                      @click="controller.copyBase()"
                    >
                      <CopyIcon aria-hidden="true" />
                      {{ t('translation-manager.copy_base', {}, 'Copy the base text') }}
                    </Button>
                  </div>
                </div>
                <div v-else class="flex flex-col gap-1">
                  <span
                    v-if="row.cells[locale.code]?.value"
                    class="line-clamp-4 whitespace-pre-wrap"
                    :dir="locale.direction"
                    :lang="locale.code"
                    >{{ row.cells[locale.code]?.value }}</span
                  >
                  <span v-else class="text-muted-foreground italic">
                    {{ t('translation-manager.missing', {}, 'Missing') }}
                  </span>
                  <span
                    v-if="
                      row.cells[locale.code]?.changed ||
                      row.cells[locale.code]?.warnings ||
                      row.cells[locale.code]?.suggestion
                    "
                    class="flex flex-wrap gap-1"
                  >
                    <Badge v-if="row.cells[locale.code]?.changed" variant="secondary">
                      {{ t('translation-manager.changed', {}, 'Changed in the panel') }}
                    </Badge>
                    <Badge
                      v-if="row.cells[locale.code]?.warnings"
                      variant="destructive"
                      :title="row.cells[locale.code]?.warnings?.join('\n')"
                    >
                      <TriangleAlertIcon aria-hidden="true" />
                      {{ t('translation-manager.warnings', {}, 'Warnings') }}
                    </Badge>
                    <Badge v-if="row.cells[locale.code]?.suggestion" variant="outline">
                      <SparklesIcon aria-hidden="true" />
                      {{ t('translation-manager.suggestion', {}, 'AI suggestion') }}
                    </Badge>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
        data-slot="translation-pagination"
      >
        <span class="text-muted-foreground">
          {{
            t(
              'translation-manager.pagination',
              { ...range, total: formatter.number(state.total) },
              ':from–:to of :total',
            )
          }}
        </span>
        <div class="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :aria-label="t('translation-manager.previous', {}, 'Previous page')"
            :disabled="state.page <= 1 || state.loading"
            @click="controller.goToPage(state.page - 1)"
          >
            <ChevronLeftIcon class="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <span class="px-2 tabular-nums">
            {{
              t(
                'translation-manager.page',
                { page: state.page, pages: state.lastPage },
                'Page :page of :pages',
              )
            }}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :aria-label="t('translation-manager.next', {}, 'Next page')"
            :disabled="state.page >= state.lastPage || state.loading"
            @click="controller.goToPage(state.page + 1)"
          >
            <ChevronRightIcon class="rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <section
        v-if="activeRow && activeLocale"
        class="flex flex-col gap-3 rounded-md border p-4 text-sm"
        data-slot="translation-details"
        :aria-label="t('translation-manager.details', {}, 'Details')"
      >
        <div class="flex flex-wrap items-baseline gap-2">
          <code class="font-mono text-xs break-all">{{ activeRow.key }}</code>
          <span class="text-muted-foreground">· {{ activeLocale.label }}</span>
        </div>
        <div v-if="activeRow.placeholders?.length" class="flex flex-wrap items-center gap-1">
          <span class="text-muted-foreground me-1">
            {{ t('translation-manager.placeholders', {}, 'Placeholders') }}
          </span>
          <Badge
            v-for="placeholder in activeRow.placeholders"
            :key="placeholder"
            variant="outline"
            class="font-mono"
          >
            {{ placeholder }}
          </Badge>
        </div>
        <p v-if="activeRow.files?.length" class="text-muted-foreground">
          {{ t('translation-manager.used_in', {}, 'Used in') }}:
          <span class="font-mono text-xs">{{ activeRow.files.join(', ') }}</span>
        </p>
        <p
          v-for="warning in activeCell?.warnings ?? []"
          :key="warning"
          class="text-destructive flex items-start gap-2"
        >
          <TriangleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ warning }}
        </p>
        <div
          v-if="activeCell?.suggestion"
          class="bg-muted/50 flex flex-col gap-2 rounded-md p-3"
          data-slot="translation-suggestion"
        >
          <span class="flex items-center gap-2 font-medium">
            <SparklesIcon class="text-primary size-4" aria-hidden="true" />
            {{ t('translation-manager.suggestion', {}, 'AI suggestion') }}
          </span>
          <p class="whitespace-pre-wrap" :dir="activeLocale.direction" :lang="activeLocale.code">
            {{ activeCell.suggestion.value }}
          </p>
          <p
            v-for="warning in activeCell.suggestion.warnings ?? []"
            :key="warning"
            class="text-destructive text-xs"
          >
            {{ warning }}
          </p>
          <div v-if="activeLocale.editable" class="flex gap-2">
            <Button
              type="button"
              size="sm"
              @click="controller.decide({ row: activeRow.id, locale: activeLocale.code }, 'accept')"
            >
              <CheckIcon aria-hidden="true" />
              {{ t('translation-manager.accept', {}, 'Accept') }}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              @click="controller.decide({ row: activeRow.id, locale: activeLocale.code }, 'reject')"
            >
              <XIcon aria-hidden="true" />
              {{ t('translation-manager.reject', {}, 'Reject') }}
            </Button>
          </div>
        </div>
        <div
          v-if="state.history?.row === activeRow.id && state.history.locale === activeLocale.code"
          class="flex flex-col gap-2"
          data-slot="translation-history"
        >
          <span class="font-medium">{{ t('translation-manager.history', {}, 'History') }}</span>
          <p v-if="state.history.entries?.length === 0" class="text-muted-foreground">
            {{ t('translation-manager.history_empty', {}, 'No changes yet.') }}
          </p>
          <ol class="flex flex-col gap-2">
            <li
              v-for="entry in state.history.entries ?? []"
              :key="entry.id"
              class="border-s-2 ps-3"
            >
              <span class="text-muted-foreground text-xs">
                {{ t(`translation-manager.sources.${entry.source}`, {}, entry.source) }}
                <template v-if="entry.user">
                  · {{ t('translation-manager.by', { name: entry.user }, 'by :name') }}
                </template>
                <template v-if="entry.at"> · {{ formatter.relative(entry.at) }}</template>
              </span>
              <p
                class="whitespace-pre-wrap"
                :dir="activeLocale.direction"
                :lang="activeLocale.code"
              >
                <template v-if="entry.new !== null">{{ entry.new }}</template>
                <em v-else class="text-muted-foreground">
                  {{ t('translation-manager.empty_value', {}, 'Empty') }}
                </em>
              </p>
            </li>
          </ol>
        </div>
        <div v-else>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            @click="controller.loadHistory({ row: activeRow.id, locale: activeLocale.code })"
          >
            <HistoryIcon aria-hidden="true" />
            {{ t('translation-manager.show_history', {}, 'Show history') }}
          </Button>
        </div>
      </section>
      <div class="sr-only" role="status" aria-live="polite">{{ state.announcement }}</div>
    </CardContent>
  </Card>
</template>
