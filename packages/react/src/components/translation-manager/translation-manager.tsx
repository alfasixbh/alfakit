import type {
  TranslationCellRef,
  TranslationFilter,
  TranslationLocaleSchema,
  TranslationManagerEnvironment,
  TranslationManagerSchema,
  TranslationRowSchema,
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
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useActionRunner, useDirection, useFormatter, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { showToast } from '../notifications/flash-toasts'
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

const SELECT =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'

const cellKey = (ref: TranslationCellRef) => `${ref.row}\u0000${ref.locale}`

/**
 * The translation editor of alfasix/alfakit-translation-manager: keys by locale with search,
 * filters, inline editing (plural forms, right-to-left inputs), keyboard navigation, AI
 * suggestion review and history. Everything is computed and saved by the server.
 */
export function TranslationManager({ component }: { component?: TranslationManagerSchema }) {
  return component ? (
    <TranslationManagerView key={component.actionComponent} schema={component} />
  ) : null
}

function TranslationManagerView({ schema }: { schema: TranslationManagerSchema }) {
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = useDirection()
  const formatter = useFormatter()
  const labelId = useId()
  const hintId = useId()
  const environment = (): TranslationManagerEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('translation-manager', message)),
  })
  const [controller] = useState(() => new TranslationManagerController(schema, environment()))

  useEffect(() => {
    controller.setEnvironment(environment())
  })

  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    controller.setSchema(schema)
  }, [controller, schema])

  useEffect(() => () => controller.dispose(), [controller])

  const state = useStore(controller.store)
  const cells = useRef(new Map<string, HTMLElement>())
  const editor = useRef<HTMLTextAreaElement | null>(null)
  const locales = controller.visibleLocales()
  const active =
    state.active && state.rows.some((row) => row.id === state.active?.row)
      ? state.active
      : state.rows[0] && locales[0]
        ? { row: state.rows[0].id, locale: locales[0].code }
        : null

  const focusCell = (ref: TranslationCellRef | undefined) => {
    if (!ref) return
    controller.focus(ref)
    requestAnimationFrame(() => cells.current.get(cellKey(ref))?.focus())
  }

  useEffect(() => {
    if (state.editing) {
      requestAnimationFrame(() => editor.current?.focus())
    }
  }, [state.editing])

  const onCellKeyDown = (ref: TranslationCellRef) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return

    const result = controller.handleCellKey(ref, event, direction)

    if (result.handled) {
      event.preventDefault()
      if (!controller.state.editing) focusCell(result.focus)
    }
  }

  const onEditorKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
          isComposing: event.nativeEvent.isComposing,
        })
        .then((result) => focusCell(result.focus))
    }
  }

  const range = controller.range()
  const suggestionLocales = controller.suggestionLocales()
  const activeRow = active ? controller.row(active.row) : undefined
  const activeLocale = active ? controller.locale(active.locale) : undefined

  return (
    <Card className="gap-4 py-4" data-slot="translation-manager">
      <CardHeader className="flex flex-col gap-4 px-5">
        <span id={labelId} className="sr-only">
          {t('translation-manager.label', {}, 'Translations')}
        </span>
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
          data-slot="translation-progress"
        >
          {schema.locales.map((locale) => {
            const progress = state.progress[locale.code]
            const percent = progress ? progress.percent : 0

            return (
              <li
                key={locale.code}
                className="flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium" lang={locale.code}>
                    {locale.label}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">{locale.code}</span>
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
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: `${percent * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs">
                  {t(
                    'translation-manager.progress',
                    { percent: formatter.percent(percent) },
                    ':percent translated',
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2" data-slot="translation-toolbar">
          <div className="relative min-w-48 flex-1">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={state.search}
              onChange={(event) => controller.setSearch(event.target.value)}
              placeholder={t('translation-manager.search', {}, 'Search keys and texts…')}
              aria-label={t('translation-manager.search_label', {}, 'Search translations')}
              className="ps-8"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t('translation-manager.filter_label', {}, 'Show')}</span>
            <select
              className={SELECT}
              value={state.filter}
              onChange={(event) => controller.setFilter(event.target.value as TranslationFilter)}
            >
              {schema.filters.map((filter) => (
                <option key={filter} value={filter}>
                  {t(`translation-manager.filters.${filter}`, {}, filter)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t('translation-manager.group_label', {}, 'Group')}</span>
            <select
              className={SELECT}
              value={state.group}
              onChange={(event) => controller.setGroup(event.target.value)}
            >
              <option value="">{t('translation-manager.all_groups', {}, 'All groups')}</option>
              {schema.groups.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
          <DropdownMenu dir={direction}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9">
                <LanguagesIcon aria-hidden="true" />
                {t('translation-manager.locales_label', {}, 'Languages')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {schema.locales.map((locale) => (
                <DropdownMenuCheckboxItem
                  key={locale.code}
                  checked={state.visibleLocales.includes(locale.code)}
                  onCheckedChange={(checked) =>
                    controller.toggleLocale(locale.code, checked === true)
                  }
                  onSelect={(event) => event.preventDefault()}
                >
                  {locale.label}{' '}
                  <span className="text-muted-foreground ms-auto font-mono text-xs">
                    {locale.code}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {suggestionLocales.length > 0 && (
          <div
            className="bg-muted/50 flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
            data-slot="translation-suggestions"
          >
            {suggestionLocales.map((code) => (
              <div key={code} className="flex flex-wrap items-center gap-2">
                <SparklesIcon className="text-primary size-4" aria-hidden="true" />
                <span className="flex-1 font-medium">
                  {t('translation-manager.suggestion', {}, 'AI suggestion')} ·{' '}
                  {controller.locale(code)?.label}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void controller.decideAll(code, 'reject')}
                >
                  {t('translation-manager.reject_all', {}, 'Reject all')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void controller.decideAll(code, 'accept')}
                >
                  {t('translation-manager.accept_all', {}, 'Accept all without warnings')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        <p id={hintId} className="text-muted-foreground text-xs">
          {t(
            'translation-manager.keyboard',
            {},
            'Arrow keys move between texts. Enter edits and saves, Shift + Enter adds a line break, Escape cancels.',
          )}
        </p>
        {state.rows.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {t('translation-manager.empty', {}, 'No translations match your search.')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border" data-slot="translation-grid-scroll">
            <table
              role="grid"
              aria-labelledby={labelId}
              aria-describedby={hintId}
              aria-busy={state.loading || undefined}
              aria-rowcount={state.total + 1}
              className={cn('w-full border-collapse text-sm', state.loading && 'opacity-60')}
              data-slot="translation-grid"
            >
              <thead className="bg-muted/50">
                <tr>
                  <th
                    scope="col"
                    className="bg-card sticky start-0 z-10 min-w-56 border-b [background-image:linear-gradient(var(--muted),var(--muted))] px-3 py-2 text-start font-medium"
                  >
                    {t('translation-manager.key', {}, 'Key')}
                  </th>
                  {locales.map((locale) => (
                    <th
                      key={locale.code}
                      scope="col"
                      className="min-w-64 border-s border-b px-3 py-2 text-start font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <span lang={locale.code}>{locale.label}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {locale.code}
                        </span>
                        {locale.base && (
                          <Badge variant="secondary">
                            {t('translation-manager.base', {}, 'Base')}
                          </Badge>
                        )}
                        {!locale.editable && (
                          <Badge variant="outline">
                            {t('translation-manager.read_only', {}, 'Read only')}
                          </Badge>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0" data-slot="translation-row">
                    <th
                      scope="row"
                      className="bg-card sticky start-0 z-10 px-3 py-2 text-start align-top font-normal"
                    >
                      <KeyCell row={row} />
                    </th>
                    {locales.map((locale) => {
                      const ref = { row: row.id, locale: locale.code }
                      const cell = row.cells[locale.code]
                      const isActive = active?.row === row.id && active.locale === locale.code
                      const isEditing =
                        state.editing?.row === row.id && state.editing.locale === locale.code

                      return (
                        <td
                          key={locale.code}
                          ref={(element) => {
                            if (element) cells.current.set(cellKey(ref), element)
                            else cells.current.delete(cellKey(ref))
                          }}
                          role="gridcell"
                          tabIndex={isActive && !isEditing ? 0 : -1}
                          aria-selected={isActive}
                          aria-readonly={!controller.isEditable(ref) || undefined}
                          aria-label={
                            isEditing
                              ? undefined
                              : t(
                                  'translation-manager.edit',
                                  { key: row.key, locale: locale.label },
                                  'Edit :key in :locale',
                                )
                          }
                          data-slot="translation-cell"
                          data-missing={cell?.value ? undefined : ''}
                          data-changed={cell?.changed ? '' : undefined}
                          data-active={isActive ? '' : undefined}
                          onFocus={(event) =>
                            event.target === event.currentTarget && controller.focus(ref)
                          }
                          onClick={() => {
                            if (!isEditing) {
                              controller.focus(ref)
                              if (isActive) controller.startEdit(ref)
                            }
                          }}
                          onDoubleClick={() => controller.startEdit(ref)}
                          onKeyDown={onCellKeyDown(ref)}
                          className={cn(
                            'hover:bg-accent/40 border-s px-3 py-2 align-top outline-none',
                            isActive && 'ring-ring/50 ring-2 ring-inset',
                            controller.isEditable(ref) && 'cursor-text',
                          )}
                        >
                          {isEditing ? (
                            <CellEditor
                              row={row}
                              locale={locale}
                              draft={state.draft}
                              forms={state.draftForms}
                              labels={cell?.formLabels}
                              saving={state.saving}
                              error={state.error}
                              editorRef={editor}
                              onDraft={(value) => controller.setDraft(value)}
                              onForm={(index, value) => controller.setDraftForm(index, value)}
                              onKeyDown={onEditorKeyDown}
                              onSave={() =>
                                void controller.save().then((saved) => saved && focusCell(ref))
                              }
                              onCancel={() => {
                                controller.cancelEdit()
                                focusCell(ref)
                              }}
                              onCopyBase={() => controller.copyBase()}
                            />
                          ) : (
                            <CellValue locale={locale} cell={cell} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
          data-slot="translation-pagination"
        >
          <span className="text-muted-foreground">
            {t(
              'translation-manager.pagination',
              { ...range, total: formatter.number(state.total) },
              ':from–:to of :total',
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t('translation-manager.previous', {}, 'Previous page')}
              disabled={state.page <= 1 || state.loading}
              onClick={() => controller.goToPage(state.page - 1)}
            >
              <ChevronLeftIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
            <span className="px-2 tabular-nums">
              {t(
                'translation-manager.page',
                { page: state.page, pages: state.lastPage },
                'Page :page of :pages',
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t('translation-manager.next', {}, 'Next page')}
              disabled={state.page >= state.lastPage || state.loading}
              onClick={() => controller.goToPage(state.page + 1)}
            >
              <ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </div>
        {activeRow && activeLocale ? (
          <section
            className="flex flex-col gap-3 rounded-md border p-4 text-sm"
            data-slot="translation-details"
            aria-label={t('translation-manager.details', {}, 'Details')}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <code className="font-mono text-xs break-all">{activeRow.key}</code>
              <span className="text-muted-foreground">· {activeLocale.label}</span>
            </div>
            {activeRow.placeholders && activeRow.placeholders.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground me-1">
                  {t('translation-manager.placeholders', {}, 'Placeholders')}
                </span>
                {activeRow.placeholders.map((placeholder) => (
                  <Badge key={placeholder} variant="outline" className="font-mono">
                    {placeholder}
                  </Badge>
                ))}
              </div>
            )}
            {activeRow.files && activeRow.files.length > 0 && (
              <p className="text-muted-foreground">
                {t('translation-manager.used_in', {}, 'Used in')}:{' '}
                <span className="font-mono text-xs">{activeRow.files.join(', ')}</span>
              </p>
            )}
            {activeRow.cells[activeLocale.code]?.warnings?.map((warning) => (
              <p key={warning} className="text-destructive flex items-start gap-2">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {warning}
              </p>
            ))}
            {activeRow.cells[activeLocale.code]?.suggestion && (
              <div
                className="bg-muted/50 flex flex-col gap-2 rounded-md p-3"
                data-slot="translation-suggestion"
              >
                <span className="flex items-center gap-2 font-medium">
                  <SparklesIcon className="text-primary size-4" aria-hidden="true" />
                  {t('translation-manager.suggestion', {}, 'AI suggestion')}
                </span>
                <p
                  className="whitespace-pre-wrap"
                  dir={activeLocale.direction}
                  lang={activeLocale.code}
                >
                  {activeRow.cells[activeLocale.code]?.suggestion?.value}
                </p>
                {activeRow.cells[activeLocale.code]?.suggestion?.warnings?.map((warning) => (
                  <p key={warning} className="text-destructive text-xs">
                    {warning}
                  </p>
                ))}
                {activeLocale.editable && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void controller.decide(
                          { row: activeRow.id, locale: activeLocale.code },
                          'accept',
                        )
                      }
                    >
                      <CheckIcon aria-hidden="true" />
                      {t('translation-manager.accept', {}, 'Accept')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void controller.decide(
                          { row: activeRow.id, locale: activeLocale.code },
                          'reject',
                        )
                      }
                    >
                      <XIcon aria-hidden="true" />
                      {t('translation-manager.reject', {}, 'Reject')}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {state.history?.row === activeRow.id && state.history.locale === activeLocale.code ? (
              <div className="flex flex-col gap-2" data-slot="translation-history">
                <span className="font-medium">
                  {t('translation-manager.history', {}, 'History')}
                </span>
                {state.history.entries?.length === 0 && (
                  <p className="text-muted-foreground">
                    {t('translation-manager.history_empty', {}, 'No changes yet.')}
                  </p>
                )}
                <ol className="flex flex-col gap-2">
                  {state.history.entries?.map((entry) => (
                    <li key={entry.id} className="border-s-2 ps-3">
                      <span className="text-muted-foreground text-xs">
                        {t(`translation-manager.sources.${entry.source}`, {}, entry.source)}
                        {entry.user
                          ? ` · ${t('translation-manager.by', { name: entry.user }, 'by :name')}`
                          : ''}
                        {entry.at ? ` · ${formatter.relative(entry.at)}` : ''}
                      </span>
                      <p
                        className="whitespace-pre-wrap"
                        dir={activeLocale.direction}
                        lang={activeLocale.code}
                      >
                        {entry.new ?? (
                          <em className="text-muted-foreground">
                            {t('translation-manager.empty_value', {}, 'Empty')}
                          </em>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void controller.loadHistory({ row: activeRow.id, locale: activeLocale.code })
                  }
                >
                  <HistoryIcon aria-hidden="true" />
                  {t('translation-manager.show_history', {}, 'Show history')}
                </Button>
              </div>
            )}
          </section>
        ) : null}
        <div className="sr-only" role="status" aria-live="polite">
          {state.announcement}
        </div>
      </CardContent>
    </Card>
  )
}

function KeyCell({ row }: { row: TranslationRowSchema }) {
  const t = useT()

  return (
    <div className="flex flex-col gap-1">
      <code className="font-mono text-xs break-all">{row.key}</code>
      <div className="flex flex-wrap gap-1">
        <span className="text-muted-foreground text-xs">{row.groupLabel}</span>
        {row.undefined && (
          <Badge variant="destructive">
            {t('translation-manager.undefined', {}, 'Not defined')}
          </Badge>
        )}
        {row.unused && (
          <Badge variant="outline">{t('translation-manager.unused', {}, 'Unused')}</Badge>
        )}
      </div>
    </div>
  )
}

function CellValue({
  locale,
  cell,
}: {
  locale: TranslationLocaleSchema
  cell: TranslationManagerSchema['rows'][number]['cells'][string] | undefined
}) {
  const t = useT()

  return (
    <div className="flex flex-col gap-1">
      {cell?.value ? (
        <span
          className="line-clamp-4 whitespace-pre-wrap"
          dir={locale.direction}
          lang={locale.code}
        >
          {cell.value}
        </span>
      ) : (
        <span className="text-muted-foreground italic">
          {t('translation-manager.missing', {}, 'Missing')}
        </span>
      )}
      {(cell?.changed || cell?.warnings || cell?.suggestion) && (
        <span className="flex flex-wrap gap-1">
          {cell.changed && (
            <Badge variant="secondary">
              {t('translation-manager.changed', {}, 'Changed in the panel')}
            </Badge>
          )}
          {cell.warnings && (
            <Badge variant="destructive" title={cell.warnings.join('\n')}>
              <TriangleAlertIcon aria-hidden="true" />
              {t('translation-manager.warnings', {}, 'Warnings')}
            </Badge>
          )}
          {cell.suggestion && (
            <Badge variant="outline">
              <SparklesIcon aria-hidden="true" />
              {t('translation-manager.suggestion', {}, 'AI suggestion')}
            </Badge>
          )}
        </span>
      )}
    </div>
  )
}

function CellEditor({
  row,
  locale,
  draft,
  forms,
  labels,
  saving,
  error,
  editorRef,
  onDraft,
  onForm,
  onKeyDown,
  onSave,
  onCancel,
  onCopyBase,
}: {
  row: TranslationRowSchema
  locale: TranslationLocaleSchema
  draft: string
  forms: string[] | null
  labels: string[] | undefined
  saving: boolean
  error: string | null
  editorRef: { current: HTMLTextAreaElement | null }
  onDraft: (value: string) => void
  onForm: (index: number, value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onSave: () => void
  onCancel: () => void
  onCopyBase: () => void
}) {
  const t = useT()
  const errorId = useId()
  const label = t(
    'translation-manager.edit',
    { key: row.key, locale: locale.label },
    'Edit :key in :locale',
  )

  return (
    <div
      className="flex flex-col gap-2"
      data-slot="translation-editor"
      onClick={(event) => event.stopPropagation()}
    >
      {forms ? (
        forms.map((form, index) => (
          <label key={index} className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {t(
                'translation-manager.plural_form',
                { numbers: labels?.[index] ?? String(index + 1) },
                'For :numbers',
              )}
            </span>
            <Textarea
              ref={index === 0 ? editorRef : undefined}
              value={form}
              rows={1}
              dir={locale.direction}
              lang={locale.code}
              aria-label={`${label} (${labels?.[index] ?? index + 1})`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-h-9"
              onChange={(event) => onForm(index, event.target.value)}
              onKeyDown={onKeyDown}
            />
          </label>
        ))
      ) : (
        <Textarea
          ref={editorRef}
          value={draft}
          rows={Math.min(8, Math.max(2, draft.split('\n').length))}
          dir={locale.direction}
          lang={locale.code}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
      {error && (
        <p id={errorId} className="text-destructive text-xs">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>
          {saving
            ? t('translation-manager.saving', {}, 'Saving…')
            : t('translation-manager.save', {}, 'Save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
          {t('translation-manager.cancel', {}, 'Cancel')}
        </Button>
        {!locale.base && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto"
            disabled={saving}
            onClick={onCopyBase}
          >
            <CopyIcon aria-hidden="true" />
            {t('translation-manager.copy_base', {}, 'Copy the base text')}
          </Button>
        )}
      </div>
    </div>
  )
}
