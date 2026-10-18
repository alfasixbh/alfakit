import {
  ConflictMonitor,
  PresenceRoom,
  conflictMessage,
  findPageFormBlock,
  type PageSchema,
} from '@alfakit/core'
import { RefreshCwIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFormatter, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Button } from '../ui/button'

/**
 * Edit pages (`detectConflicts()`): a non-blocking banner when somebody else saved the
 * record ("Dana saved changes 10 seconds ago", over `Panel::realtime()`) or the server
 * refused a save, with review (the changed fields against your unsaved values), reload
 * and keep mine. Replace it with `components: { 'page:conflict-banner': … }`.
 */
export function ConflictBanner({ page }: { page: PageSchema }) {
  const panel = usePanel()
  const t = useT()
  const formatter = useFormatter()
  const version = page.conflicts?.version ?? ''
  const channel = page.presence?.channel ?? null
  const [reviewing, setReviewing] = useState(false)
  const [, setTick] = useState(0)

  const monitor = useMemo(
    () =>
      new ConflictMonitor({
        version,
        token: page.token,
        endpoint: panel.endpoints.conflicts,
        channel,
        original: (findPageFormBlock(page)?.state as Record<string, unknown> | undefined) ?? {},
        self: panel.user?.id ?? null,
        resolveName: (id) =>
          channel ? (PresenceRoom.find(channel)?.memberName(id) ?? null) : null,
      }),
    // A new version (after saving or reloading) starts over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, channel],
  )

  useEffect(() => monitor.start(), [monitor])
  useEffect(() => monitor.setToken(page.token), [monitor, page.token])

  const state = useStore(monitor.store)
  const conflict = state.conflict

  // "10 seconds ago" keeps counting.
  useEffect(() => {
    if (!conflict) return

    const timer = setInterval(() => setTick((tick) => tick + 1), 15_000)

    return () => clearInterval(timer)
  }, [conflict])

  if (!conflict) return null

  const message = conflictMessage(conflict)
  const text = t(
    message.key,
    { name: conflict.name ?? '', time: formatter.relative(conflict.at) },
    message.fallback,
  )
  const deleted = conflict.event === 'deleted'
  const empty = t('realtime.conflict.empty', {}, 'Empty')

  const close = (run: () => unknown) => {
    setReviewing(false)
    void run()
  }

  const review = () => {
    setReviewing((open) => !open)

    if (!reviewing && state.fields === null) void monitor.review()
  }

  return (
    <div
      data-slot="conflict-banner"
      data-source={conflict.source}
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 font-medium">{text}</p>
        <div className="flex flex-wrap items-center gap-2">
          {!deleted && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={reviewing}
              aria-controls="alfakit-conflict-review"
              onClick={review}
            >
              {t('realtime.conflict.review', {}, 'Review changes')}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => close(() => monitor.reload())}
          >
            <RefreshCwIcon aria-hidden="true" />
            {t('realtime.conflict.reload', {}, 'Reload')}
          </Button>
          {!deleted && (
            <Button type="button" size="sm" onClick={() => close(() => monitor.keepMine())}>
              {t('realtime.conflict.keep_mine', {}, 'Keep mine')}
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t('realtime.conflict.dismiss', {}, 'Dismiss')}
            onClick={() => close(() => monitor.dismiss())}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      {reviewing && (
        <div
          id="alfakit-conflict-review"
          data-slot="conflict-review"
          className="flex flex-col gap-2"
        >
          {state.loading ? (
            <p className="text-muted-foreground">
              {t('realtime.conflict.loading', {}, 'Loading changes…')}
            </p>
          ) : state.failed ? (
            <p>{t('realtime.conflict.failed', {}, 'The changes could not be loaded.')}</p>
          ) : (state.fields ?? []).length === 0 ? (
            <p>{t('realtime.conflict.no_changes', {}, 'No field differs from what you loaded.')}</p>
          ) : (
            <table className="bg-background/60 text-foreground w-full overflow-hidden rounded-md text-start text-sm">
              <caption className="sr-only">
                {t('realtime.conflict.caption', {}, 'Fields changed since you opened the record')}
              </caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    {t('realtime.conflict.field', {}, 'Field')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    {t('realtime.conflict.theirs', {}, 'Saved')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    {t('realtime.conflict.mine', {}, 'Yours')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">{t('realtime.conflict.actions', {}, 'Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(state.fields ?? []).map((field) => (
                  <tr
                    key={field.path}
                    data-conflicting={field.conflicting || undefined}
                    className="border-b last:border-b-0"
                  >
                    <th scope="row" className="px-3 py-2 text-start font-medium">
                      {field.label}
                      {field.conflicting && (
                        <span className="ms-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-normal text-amber-950 dark:bg-amber-800 dark:text-amber-50">
                          {t('realtime.conflict.both_changed', {}, 'Changed by both')}
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-2 break-words">{field.theirs ?? empty}</td>
                    <td className="px-3 py-2 break-words">{field.mine ?? empty}</td>
                    <td className="px-3 py-2 text-end">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        aria-label={t(
                          'realtime.conflict.use_theirs_label',
                          { field: field.label },
                          'Use the saved value of :field',
                        )}
                        onClick={() => monitor.useTheirs(field.path)}
                      >
                        {t('realtime.conflict.use_theirs', {}, 'Use saved value')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
