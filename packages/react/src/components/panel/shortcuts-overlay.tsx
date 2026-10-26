import type { ShortcutListGroup, ShortcutListItem } from '@alfakit/core'
import {
  ShortcutRecorder,
  flattenActionGroup,
  saveShortcutOverrides,
  shortcutOverlayGroups,
  shortcuts,
} from '@alfakit/core'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePageSchema, useT } from '../../context'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { ShortcutKeys } from './shortcut-keys'

const subscribe = (listener: () => void) => shortcuts.subscribe(listener)
const version = () => shortcuts.getVersion()

/**
 * The `?` overlay: every shortcut available on the page, grouped; users may change their
 * keys (stored on the server). `KeyboardShortcuts` loads it the first time it opens.
 */
export function ShortcutsOverlay({
  open,
  onOpenChange,
  customizable,
  endpoint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customizable: boolean
  endpoint?: string
}) {
  const t = useT()
  const page = usePageSchema()
  useSyncExternalStore(subscribe, version, version)
  const [recording, setRecording] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const groups = shortcutOverlayGroups(
    shortcuts.list(),
    flattenActionGroup(page?.headerActions ?? []),
  )

  const save = async (id: string, keys: string[] | null) => {
    if (!endpoint) return

    try {
      shortcuts.setOverrides(await saveShortcutOverrides(endpoint, { [id]: keys }))
      setMessage(t('shortcuts.saved', {}, 'Shortcut saved.'))
    } catch {
      setMessage(t('shortcuts.save_failed', {}, 'The shortcut could not be saved.'))
    }
  }

  // While recording, the keys pressed are the new binding: one key (with modifiers) or a
  // sequence ("g o"), finished a second after the last key (Escape cancels). Listening in
  // the capture phase keeps the keys from closing the dialog or running another shortcut.
  useEffect(() => {
    if (!recording) return

    shortcuts.setPaused(true)

    const recorder = new ShortcutRecorder({
      onDone: (binding) => {
        setRecording(null)

        const conflict = shortcuts.conflict([binding], recording)

        if (conflict) {
          setMessage(
            t(
              'shortcuts.conflict',
              { label: conflict.label },
              `Already used by “${conflict.label}”.`,
            ),
          )

          return
        }

        void save(recording, [binding])
      },
    })

    const listener = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        recorder.cancel()
        setRecording(null)
        setMessage(t('shortcuts.cancelled', {}, 'Change cancelled.'))

        return
      }

      recorder.press(event)
    }

    window.addEventListener('keydown', listener, true)

    return () => {
      recorder.cancel()
      window.removeEventListener('keydown', listener, true)
      shortcuts.setPaused(false)
    }
    // `save` and `t` only change with the endpoint and the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const groupLabel = (group: ShortcutListGroup['group']) =>
    ({
      general: t('shortcuts.groups.general', {}, 'General'),
      navigation: t('shortcuts.groups.navigation', {}, 'Navigation'),
      commands: t('shortcuts.groups.commands', {}, 'Commands'),
      actions: t('shortcuts.groups.actions', {}, 'Actions on this page'),
    })[group]

  const change = (item: ShortcutListItem) => {
    setMessage(
      t(
        'shortcuts.recording',
        { label: item.label },
        `Press the new keys for “${item.label}”. Escape cancels.`,
      ),
    )
    setRecording(item.id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setRecording(null)
        setMessage('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <div data-slot="shortcuts-overlay" className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('shortcuts.title', {}, 'Keyboard shortcuts')}</DialogTitle>
            <DialogDescription>
              {t('shortcuts.description', {}, 'Shortcuts available on this page.')}
            </DialogDescription>
          </DialogHeader>
          <div role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
            {message}
          </div>
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section
                key={group.group}
                data-group={group.group}
                aria-labelledby={`shortcuts-${group.group}`}
              >
                <h3
                  id={`shortcuts-${group.group}`}
                  className="text-muted-foreground mb-2 text-xs font-medium uppercase"
                >
                  {groupLabel(group.group)}
                </h3>
                <ul className="flex flex-col divide-y rounded-md border">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      data-shortcut={item.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {recording === item.id ? (
                        <span className="text-primary text-xs">
                          {t('shortcuts.press_keys', {}, 'Press keys…')}
                        </span>
                      ) : item.keys.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          {t('shortcuts.off', {}, 'Off')}
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-center justify-end gap-2">
                          {item.keys.map((key) => (
                            <ShortcutKeys key={key} binding={key} />
                          ))}
                        </span>
                      )}
                      {customizable && item.customizable && (
                        <span className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            aria-label={t(
                              'shortcuts.change_label',
                              { label: item.label },
                              `Change the shortcut for ${item.label}`,
                            )}
                            onClick={() => change(item)}
                          >
                            {t('shortcuts.change', {}, 'Change')}
                          </Button>
                          {item.keys.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              aria-label={t(
                                'shortcuts.turn_off_label',
                                { label: item.label },
                                `Turn off the shortcut for ${item.label}`,
                              )}
                              onClick={() => void save(item.id, [])}
                            >
                              {t('shortcuts.turn_off', {}, 'Turn off')}
                            </Button>
                          )}
                          {item.customized && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              aria-label={t(
                                'shortcuts.reset_label',
                                { label: item.label },
                                `Reset the shortcut for ${item.label}`,
                              )}
                              onClick={() => void save(item.id, null)}
                            >
                              {t('shortcuts.reset', {}, 'Reset')}
                            </Button>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
