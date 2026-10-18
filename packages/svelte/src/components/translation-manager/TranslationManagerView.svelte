<script lang="ts">
  import type {
    TranslationCellRef,
    TranslationFilter,
    TranslationManagerEnvironment,
    TranslationManagerSchema,
  } from '@alfakit/core'
  import { TranslationManagerController, clientErrorNotification } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import HistoryIcon from '@lucide/svelte/icons/history'
  import LanguagesIcon from '@lucide/svelte/icons/languages'
  import SearchIcon from '@lucide/svelte/icons/search'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, tick, untrack } from 'svelte'
  import { useActionRunner, useDirection, useFormatter, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { showToast } from '../notifications/toast'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import { Card, CardContent, CardHeader } from '../ui/card'
  import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { Input } from '../ui/input'
  import { Textarea } from '../ui/textarea'

  /**
   * Keys by locale with search, filters, inline editing (plural forms, right-to-left
   * inputs), keyboard navigation, AI suggestion review and history. Everything is computed
   * and saved by the server.
   */
  let { schema }: { schema: TranslationManagerSchema } = $props()

  const SELECT =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'

  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = $derived(useDirection())
  const formatter = useFormatter()
  const labelId = $props.id()
  const hintId = `${labelId}-hint`
  const errorId = `${labelId}-error`

  const environment = (): TranslationManagerEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('translation-manager', message)),
  })

  const controller = new TranslationManagerController(
    untrack(() => $state.snapshot(schema) as TranslationManagerSchema),
    environment(),
  )
  const store = useStore(controller.store)
  const ui = $derived(store.current)

  let first = true

  $effect(() => {
    const next = $state.snapshot(schema) as TranslationManagerSchema

    if (first) {
      first = false

      return
    }

    untrack(() => controller.setSchema(next))
  })

  onDestroy(() => controller.dispose())

  // Cell elements by key, for moving the focus (not reactive ui).
  const cells: Record<string, HTMLElement> = {}
  const cellKey = (ref: TranslationCellRef) => `${ref.row}\u0000${ref.locale}`

  const locales = $derived(
    schema.locales.filter((locale) => ui.visibleLocales.includes(locale.code)),
  )
  const active = $derived.by<TranslationCellRef | null>(() => {
    const current = ui.active

    if (current && ui.rows.some((row) => row.id === current.row)) return current

    const row = ui.rows[0]
    const locale = locales[0]

    return row && locale ? { row: row.id, locale: locale.code } : null
  })
  const range = $derived.by(() => {
    void ui.rows

    return controller.range()
  })
  const suggestionLocales = $derived(
    schema.locales
      .map((locale) => locale.code)
      .filter((code) => ui.rows.some((row) => row.cells[code]?.suggestion)),
  )
  const activeRow = $derived(active ? ui.rows.find((row) => row.id === active.row) : undefined)
  const activeLocale = $derived(active ? controller.locale(active.locale) : undefined)
  const activeCell = $derived(
    activeRow && activeLocale ? activeRow.cells[activeLocale.code] : undefined,
  )

  const isActive = (ref: TranslationCellRef) =>
    active?.row === ref.row && active.locale === ref.locale
  const isEditing = (ref: TranslationCellRef) =>
    ui.editing?.row === ref.row && ui.editing.locale === ref.locale
  const editable = (ref: TranslationCellRef) => {
    void ui.rows

    return controller.isEditable(ref)
  }

  function cell(element: HTMLElement, key: string) {
    cells[key] = element

    return {
      destroy: () => {
        if (cells[key] === element) delete cells[key]
      },
    }
  }

  function focusCell(ref: TranslationCellRef | undefined) {
    if (!ref) return
    controller.focus(ref)
    void tick().then(() => cells[cellKey(ref)]?.focus())
  }

  $effect(() => {
    const editing = ui.editing

    if (editing) {
      void tick().then(() => cells[cellKey(editing)]?.querySelector('textarea')?.focus())
    }
  })

  function onCellKeyDown(ref: TranslationCellRef, event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return

    const result = controller.handleCellKey(ref, event, direction)

    if (result.handled) {
      event.preventDefault()
      if (!controller.state.editing) focusCell(result.focus)
    }
  }

  function onEditorKeyDown(event: KeyboardEvent) {
    if (
      event.key === 'Escape' ||
      (event.key === 'Enter' && !event.shiftKey) ||
      event.key === 'Tab'
    ) {
      event.preventDefault()
      void controller
        .handleEditorKey({
          key: event.key,
          shiftKey: event.shiftKey,
          isComposing: event.isComposing,
        })
        .then((result) => focusCell(result.focus))
    }
  }

  function onCellClick(ref: TranslationCellRef) {
    if (isEditing(ref)) return
    const wasActive = isActive(ref)
    controller.focus(ref)
    if (wasActive) controller.startEdit(ref)
  }

  function save(ref: TranslationCellRef) {
    void controller.save().then((saved) => saved && focusCell(ref))
  }

  function cancel(ref: TranslationCellRef) {
    controller.cancelEdit()
    focusCell(ref)
  }

  const editLabel = (key: string, locale: string) =>
    t('translation-manager.edit', { key, locale }, 'Edit :key in :locale')
</script>

<Card class="gap-4 py-4" data-slot="translation-manager">
  <CardHeader class="flex flex-col gap-4 px-5">
    <span id={labelId} class="sr-only">{t('translation-manager.label', {}, 'Translations')}</span>
    <ul
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      data-slot="translation-progress"
    >
      {#each schema.locales as locale (locale.code)}
        {@const progress = ui.progress[locale.code]}
        {@const percent = progress?.percent ?? 0}
        <li class="flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="truncate font-medium" lang={locale.code}>{locale.label}</span>
            <span class="text-muted-foreground font-mono text-xs">{locale.code}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent * 100)}
            aria-label={t(
              'translation-manager.progress_label',
              {
                locale: locale.label,
                translated: progress?.translated ?? 0,
                total: progress?.total ?? 0,
              },
              ':locale: :translated of :total translated',
            )}
            class="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              class="bg-primary h-full rounded-full transition-[width]"
              style:width="{percent * 100}%"
            ></div>
          </div>
          <span class="text-muted-foreground text-xs">
            {t(
              'translation-manager.progress',
              { percent: formatter.current.percent(percent) },
              ':percent translated',
            )}
          </span>
        </li>
      {/each}
    </ul>
    <div class="flex flex-wrap items-center gap-2" data-slot="translation-toolbar">
      <div class="relative min-w-48 flex-1">
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={ui.search}
          placeholder={t('translation-manager.search', {}, 'Search keys and texts…')}
          aria-label={t('translation-manager.search_label', {}, 'Search translations')}
          class="ps-8"
          oninput={(event: Event) =>
            controller.setSearch((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <label class="flex items-center gap-2 text-sm">
        <span class="sr-only">{t('translation-manager.filter_label', {}, 'Show')}</span>
        <select
          class={SELECT}
          value={ui.filter}
          onchange={(event) => controller.setFilter(event.currentTarget.value as TranslationFilter)}
        >
          {#each schema.filters as filter (filter)}
            <option value={filter}>{t(`translation-manager.filters.${filter}`, {}, filter)}</option>
          {/each}
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <span class="sr-only">{t('translation-manager.group_label', {}, 'Group')}</span>
        <select
          class={SELECT}
          value={ui.group}
          onchange={(event) => controller.setGroup(event.currentTarget.value)}
        >
          <option value="">{t('translation-manager.all_groups', {}, 'All groups')}</option>
          {#each schema.groups as group (group.value)}
            <option value={group.value}>{group.label}</option>
          {/each}
        </select>
      </label>
      <DropdownMenu dir={direction}>
        <DropdownMenuTrigger>
          {#snippet child({ props })}
            <Button type="button" variant="outline" size="sm" class="h-9" {...props}>
              <LanguagesIcon aria-hidden="true" />
              {t('translation-manager.locales_label', {}, 'Languages')}
            </Button>
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {#each schema.locales as locale (locale.code)}
            <DropdownMenuCheckboxItem
              checked={ui.visibleLocales.includes(locale.code)}
              closeOnSelect={false}
              onCheckedChange={(checked) => controller.toggleLocale(locale.code, checked)}
            >
              {locale.label}
              <span class="text-muted-foreground ms-auto font-mono text-xs">{locale.code}</span>
            </DropdownMenuCheckboxItem>
          {/each}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {#if suggestionLocales.length > 0}
      <div
        class="bg-muted/50 flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
        data-slot="translation-suggestions"
      >
        {#each suggestionLocales as code (code)}
          <div class="flex flex-wrap items-center gap-2">
            <SparklesIcon class="text-primary size-4" aria-hidden="true" />
            <span class="flex-1 font-medium">
              {t('translation-manager.suggestion', {}, 'AI suggestion')} · {controller.locale(code)
                ?.label}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onclick={() => controller.decideAll(code, 'reject')}
            >
              {t('translation-manager.reject_all', {}, 'Reject all')}
            </Button>
            <Button type="button" size="sm" onclick={() => controller.decideAll(code, 'accept')}>
              {t('translation-manager.accept_all', {}, 'Accept all without warnings')}
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-4 px-5">
    <p id={hintId} class="text-muted-foreground text-xs">
      {t(
        'translation-manager.keyboard',
        {},
        'Arrow keys move between texts. Enter edits and saves, Shift + Enter adds a line break, Escape cancels.',
      )}
    </p>
    {#if ui.rows.length === 0}
      <p class="text-muted-foreground py-10 text-center text-sm">
        {t('translation-manager.empty', {}, 'No translations match your search.')}
      </p>
    {:else}
      <div class="overflow-x-auto rounded-md border" data-slot="translation-grid-scroll">
        <table
          role="grid"
          aria-labelledby={labelId}
          aria-describedby={hintId}
          aria-busy={ui.loading || undefined}
          aria-rowcount={ui.total + 1}
          class={cn('w-full border-collapse text-sm', ui.loading && 'opacity-60')}
          data-slot="translation-grid"
        >
          <thead class="bg-muted/50">
            <tr>
              <th
                scope="col"
                class="bg-muted sticky start-0 z-10 min-w-56 border-b px-3 py-2 text-start font-medium"
              >
                {t('translation-manager.key', {}, 'Key')}
              </th>
              {#each locales as locale (locale.code)}
                <th scope="col" class="min-w-64 border-s border-b px-3 py-2 text-start font-medium">
                  <span class="flex items-center gap-2">
                    <span lang={locale.code}>{locale.label}</span>
                    <span class="text-muted-foreground font-mono text-xs">{locale.code}</span>
                    {#if locale.base}
                      <Badge variant="secondary">{t('translation-manager.base', {}, 'Base')}</Badge>
                    {/if}
                    {#if !locale.editable}
                      <Badge variant="outline"
                        >{t('translation-manager.read_only', {}, 'Read only')}</Badge
                      >
                    {/if}
                  </span>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each ui.rows as row (row.id)}
              <tr class="border-b last:border-b-0" data-slot="translation-row">
                <th
                  scope="row"
                  class="bg-card sticky start-0 z-10 px-3 py-2 text-start align-top font-normal"
                >
                  <div class="flex flex-col gap-1">
                    <code class="font-mono text-xs break-all">{row.key}</code>
                    <div class="flex flex-wrap gap-1">
                      <span class="text-muted-foreground text-xs">{row.groupLabel}</span>
                      {#if row.undefined}
                        <Badge variant="destructive"
                          >{t('translation-manager.undefined', {}, 'Not defined')}</Badge
                        >
                      {/if}
                      {#if row.unused}
                        <Badge variant="outline"
                          >{t('translation-manager.unused', {}, 'Unused')}</Badge
                        >
                      {/if}
                    </div>
                  </div>
                </th>
                {#each locales as locale (locale.code)}
                  {@const ref = { row: row.id, locale: locale.code }}
                  {@const value = row.cells[locale.code]}
                  {@const selected = isActive(ref)}
                  {@const editing = isEditing(ref)}
                  <td
                    use:cell={cellKey(ref)}
                    role="gridcell"
                    tabindex={selected && !editing ? 0 : -1}
                    aria-selected={selected}
                    aria-readonly={!editable(ref) || undefined}
                    aria-label={editing ? undefined : editLabel(row.key, locale.label)}
                    data-slot="translation-cell"
                    data-missing={value?.value ? undefined : ''}
                    data-changed={value?.changed ? '' : undefined}
                    data-active={selected ? '' : undefined}
                    class={cn(
                      'hover:bg-accent/40 border-s px-3 py-2 align-top outline-none',
                      selected && 'ring-ring/50 ring-2 ring-inset',
                      editable(ref) && 'cursor-text',
                    )}
                    onfocus={(event) =>
                      event.target === event.currentTarget && controller.focus(ref)}
                    onclick={() => onCellClick(ref)}
                    ondblclick={() => controller.startEdit(ref)}
                    onkeydown={(event) => onCellKeyDown(ref, event)}
                  >
                    {#if editing}
                      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                      <div
                        class="flex flex-col gap-2"
                        data-slot="translation-editor"
                        onclick={(event) => event.stopPropagation()}
                      >
                        {#if ui.draftForms}
                          {#each ui.draftForms as form, index (index)}
                            <label class="flex flex-col gap-1">
                              <span class="text-muted-foreground text-xs">
                                {t(
                                  'translation-manager.plural_form',
                                  { numbers: value?.formLabels?.[index] ?? String(index + 1) },
                                  'For :numbers',
                                )}
                              </span>
                              <Textarea
                                value={form}
                                rows={1}
                                dir={locale.direction}
                                lang={locale.code}
                                aria-label="{editLabel(row.key, locale.label)} ({value
                                  ?.formLabels?.[index] ?? index + 1})"
                                aria-invalid={ui.error ? true : undefined}
                                aria-describedby={ui.error ? errorId : undefined}
                                class="min-h-9"
                                oninput={(event: Event) =>
                                  controller.setDraftForm(
                                    index,
                                    (event.currentTarget as HTMLTextAreaElement).value,
                                  )}
                                onkeydown={onEditorKeyDown}
                              />
                            </label>
                          {/each}
                        {:else}
                          <Textarea
                            value={ui.draft}
                            rows={Math.min(8, Math.max(2, ui.draft.split('\n').length))}
                            dir={locale.direction}
                            lang={locale.code}
                            aria-label={editLabel(row.key, locale.label)}
                            aria-invalid={ui.error ? true : undefined}
                            aria-describedby={ui.error ? errorId : undefined}
                            oninput={(event: Event) =>
                              controller.setDraft(
                                (event.currentTarget as HTMLTextAreaElement).value,
                              )}
                            onkeydown={onEditorKeyDown}
                          />
                        {/if}
                        {#if ui.error}
                          <p id={errorId} class="text-destructive text-xs">{ui.error}</p>
                        {/if}
                        <div class="flex flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            disabled={ui.saving}
                            onclick={() => save(ref)}
                          >
                            {ui.saving
                              ? t('translation-manager.saving', {}, 'Saving…')
                              : t('translation-manager.save', {}, 'Save')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={ui.saving}
                            onclick={() => cancel(ref)}
                          >
                            {t('translation-manager.cancel', {}, 'Cancel')}
                          </Button>
                          {#if !locale.base}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              class="ms-auto"
                              disabled={ui.saving}
                              onclick={() => controller.copyBase()}
                            >
                              <CopyIcon aria-hidden="true" />
                              {t('translation-manager.copy_base', {}, 'Copy the base text')}
                            </Button>
                          {/if}
                        </div>
                      </div>
                    {:else}
                      <div class="flex flex-col gap-1">
                        {#if value?.value}
                          <span
                            class="line-clamp-4 whitespace-pre-wrap"
                            dir={locale.direction}
                            lang={locale.code}>{value.value}</span
                          >
                        {:else}
                          <span class="text-muted-foreground italic"
                            >{t('translation-manager.missing', {}, 'Missing')}</span
                          >
                        {/if}
                        {#if value?.changed || value?.warnings || value?.suggestion}
                          <span class="flex flex-wrap gap-1">
                            {#if value.changed}
                              <Badge variant="secondary"
                                >{t(
                                  'translation-manager.changed',
                                  {},
                                  'Changed in the panel',
                                )}</Badge
                              >
                            {/if}
                            {#if value.warnings}
                              <Badge variant="destructive" title={value.warnings.join('\n')}>
                                <TriangleAlertIcon aria-hidden="true" />
                                {t('translation-manager.warnings', {}, 'Warnings')}
                              </Badge>
                            {/if}
                            {#if value.suggestion}
                              <Badge variant="outline">
                                <SparklesIcon aria-hidden="true" />
                                {t('translation-manager.suggestion', {}, 'AI suggestion')}
                              </Badge>
                            {/if}
                          </span>
                        {/if}
                      </div>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <div
      class="flex flex-wrap items-center justify-between gap-2 text-sm"
      data-slot="translation-pagination"
    >
      <span class="text-muted-foreground">
        {t(
          'translation-manager.pagination',
          { ...range, total: formatter.current.number(ui.total) },
          ':from–:to of :total',
        )}
      </span>
      <div class="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('translation-manager.previous', {}, 'Previous page')}
          disabled={ui.page <= 1 || ui.loading}
          onclick={() => controller.goToPage(ui.page - 1)}
        >
          <ChevronLeftIcon class="rtl:rotate-180" aria-hidden="true" />
        </Button>
        <span class="px-2 tabular-nums">
          {t(
            'translation-manager.page',
            { page: ui.page, pages: ui.lastPage },
            'Page :page of :pages',
          )}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('translation-manager.next', {}, 'Next page')}
          disabled={ui.page >= ui.lastPage || ui.loading}
          onclick={() => controller.goToPage(ui.page + 1)}
        >
          <ChevronRightIcon class="rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </div>
    {#if activeRow && activeLocale}
      <section
        class="flex flex-col gap-3 rounded-md border p-4 text-sm"
        data-slot="translation-details"
        aria-label={t('translation-manager.details', {}, 'Details')}
      >
        <div class="flex flex-wrap items-baseline gap-2">
          <code class="font-mono text-xs break-all">{activeRow.key}</code>
          <span class="text-muted-foreground">· {activeLocale.label}</span>
        </div>
        {#if activeRow.placeholders?.length}
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-muted-foreground me-1"
              >{t('translation-manager.placeholders', {}, 'Placeholders')}</span
            >
            {#each activeRow.placeholders as placeholder (placeholder)}
              <Badge variant="outline" class="font-mono">{placeholder}</Badge>
            {/each}
          </div>
        {/if}
        {#if activeRow.files?.length}
          <p class="text-muted-foreground">
            {t('translation-manager.used_in', {}, 'Used in')}:
            <span class="font-mono text-xs">{activeRow.files.join(', ')}</span>
          </p>
        {/if}
        {#each activeCell?.warnings ?? [] as warning (warning)}
          <p class="text-destructive flex items-start gap-2">
            <TriangleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {warning}
          </p>
        {/each}
        {#if activeCell?.suggestion}
          <div
            class="bg-muted/50 flex flex-col gap-2 rounded-md p-3"
            data-slot="translation-suggestion"
          >
            <span class="flex items-center gap-2 font-medium">
              <SparklesIcon class="text-primary size-4" aria-hidden="true" />
              {t('translation-manager.suggestion', {}, 'AI suggestion')}
            </span>
            <p class="whitespace-pre-wrap" dir={activeLocale.direction} lang={activeLocale.code}>
              {activeCell.suggestion.value}
            </p>
            {#each activeCell.suggestion.warnings ?? [] as warning (warning)}
              <p class="text-destructive text-xs">{warning}</p>
            {/each}
            {#if activeLocale.editable}
              <div class="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onclick={() =>
                    controller.decide({ row: activeRow.id, locale: activeLocale.code }, 'accept')}
                >
                  <CheckIcon aria-hidden="true" />
                  {t('translation-manager.accept', {}, 'Accept')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onclick={() =>
                    controller.decide({ row: activeRow.id, locale: activeLocale.code }, 'reject')}
                >
                  <XIcon aria-hidden="true" />
                  {t('translation-manager.reject', {}, 'Reject')}
                </Button>
              </div>
            {/if}
          </div>
        {/if}
        {#if ui.history?.row === activeRow.id && ui.history.locale === activeLocale.code}
          <div class="flex flex-col gap-2" data-slot="translation-history">
            <span class="font-medium">{t('translation-manager.history', {}, 'History')}</span>
            {#if ui.history.entries?.length === 0}
              <p class="text-muted-foreground">
                {t('translation-manager.history_empty', {}, 'No changes yet.')}
              </p>
            {/if}
            <ol class="flex flex-col gap-2">
              {#each ui.history.entries ?? [] as entry (entry.id)}
                <li class="border-s-2 ps-3">
                  <span class="text-muted-foreground text-xs">
                    {t(`translation-manager.sources.${entry.source}`, {}, entry.source)}{entry.user
                      ? ` · ${t('translation-manager.by', { name: entry.user }, 'by :name')}`
                      : ''}{entry.at ? ` · ${formatter.current.relative(entry.at)}` : ''}
                  </span>
                  <p
                    class="whitespace-pre-wrap"
                    dir={activeLocale.direction}
                    lang={activeLocale.code}
                  >
                    {#if entry.new !== null}
                      {entry.new}
                    {:else}
                      <em class="text-muted-foreground"
                        >{t('translation-manager.empty_value', {}, 'Empty')}</em
                      >
                    {/if}
                  </p>
                </li>
              {/each}
            </ol>
          </div>
        {:else}
          <div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onclick={() =>
                controller.loadHistory({ row: activeRow.id, locale: activeLocale.code })}
            >
              <HistoryIcon aria-hidden="true" />
              {t('translation-manager.show_history', {}, 'Show history')}
            </Button>
          </div>
        {/if}
      </section>
    {/if}
    <div class="sr-only" role="status" aria-live="polite">{ui.announcement}</div>
  </CardContent>
</Card>
