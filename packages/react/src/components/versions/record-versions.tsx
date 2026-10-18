import type { RecordVersionChangeSchema, RecordVersionsSchema } from '@alfakit/core'
import { ArrowRightIcon } from 'lucide-react'
import { useActionRunner, useFormatter, usePageSchema, useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { Icon } from '../../lib/icons'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

/**
 * The History slide-over's version list (`HistoryAction`): each version with its event,
 * author and time, the changed fields (old → new, long and rich text as a word diff) and
 * "Restore this version", which runs the nested restore action.
 */
export function RecordVersionsComponent({ component }: { component: RecordVersionsSchema }) {
  const t = useT()
  const runner = useActionRunner()
  const page = usePageSchema()
  const formatter = useFormatter()
  // Times follow the panel's timezone; formatted after hydration so server and client agree.
  const hydrated = useHydrated()
  const restore = component.restoreAction

  if (component.versions.length === 0) {
    return (
      <p data-slot="record-versions" className="text-muted-foreground text-sm">
        {component.emptyLabel}
      </p>
    )
  }

  return (
    <ol
      data-slot="record-versions"
      aria-label={t('versions.list', {}, 'Versions')}
      className="flex flex-col gap-3"
    >
      {component.versions.map((version) => {
        const time = version.createdAt && hydrated ? formatter.dateTime(version.createdAt) : ''

        return (
          <li
            key={version.id}
            data-slot="record-version"
            data-event={version.event}
            className="bg-card rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {version.eventLabel}
                  {version.current && (
                    <Badge variant="secondary">{t('versions.current', {}, 'Current')}</Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {version.author
                    ? t(
                        'versions.by',
                        { author: version.author, time },
                        `${version.author} · ${time}`,
                      )
                    : time}
                </span>
              </div>
              {restore && !version.current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={t(
                    'versions.restore_label',
                    { time },
                    `Restore the version of ${time}`,
                  )}
                  onClick={() =>
                    void runner.trigger(restore, {
                      token: page?.token ?? '',
                      component: component.actionComponent ?? 'page',
                      parents: component.actionPath ?? [],
                      arguments: { version: version.id },
                    })
                  }
                >
                  {restore.icon && <Icon name={restore.icon} className="size-3.5" />}
                  {restore.label}
                </Button>
              )}
            </div>
            {version.changes.length > 0 ? (
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                {version.changes.map((change) => (
                  <div
                    key={change.attribute}
                    data-slot="record-version-change"
                    data-attribute={change.attribute}
                  >
                    <dt className="text-muted-foreground text-xs font-medium">{change.label}</dt>
                    <dd className="mt-0.5 break-words">
                      <VersionChange change={change} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
                {t('versions.no_changes', {}, 'No tracked fields changed.')}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function VersionChange({ change }: { change: RecordVersionChangeSchema }) {
  const t = useT()
  const empty = t('versions.empty_value', {}, 'Empty')

  if (change.diff) {
    return (
      <p data-slot="record-version-diff" className="whitespace-pre-wrap">
        {change.diff.map((part, index) =>
          part.type === 'insert' ? (
            <ins
              key={index}
              className="rounded-sm bg-emerald-500/15 text-emerald-700 no-underline dark:text-emerald-300"
            >
              <span className="sr-only">{t('versions.added', {}, 'Added:')} </span>
              {part.text}
            </ins>
          ) : part.type === 'delete' ? (
            <del key={index} className="bg-destructive/10 text-destructive rounded-sm">
              <span className="sr-only">{t('versions.removed', {}, 'Removed:')} </span>
              {part.text}
            </del>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-center gap-1.5">
      <del className="text-muted-foreground">
        <span className="sr-only">{t('versions.old_value', {}, 'Before:')} </span>
        {change.old ?? empty}
      </del>
      <ArrowRightIcon
        className="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
        aria-hidden="true"
      />
      <ins className="no-underline">
        <span className="sr-only">{t('versions.new_value', {}, 'After:')} </span>
        {change.new ?? empty}
      </ins>
    </p>
  )
}
