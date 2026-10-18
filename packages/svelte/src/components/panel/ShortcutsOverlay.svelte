<script lang="ts">
  import type { ShortcutListGroup, ShortcutListItem } from '@alfakit/core'
  import {
    bindingFromEvent,
    flattenActionGroup,
    saveShortcutOverrides,
    shortcutOverlayGroups,
    shortcuts,
  } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { usePageSchema, useT } from '../../context.svelte'
  import { Button } from '../ui/button'
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
  import ShortcutKeys from './ShortcutKeys.svelte'

  /** The `?` overlay: every shortcut on the page, grouped; users may change their keys. */
  let {
    open = $bindable(false),
    customizable,
    endpoint,
  }: { open?: boolean; customizable: boolean; endpoint?: string } = $props()

  const t = useT()
  const page = $derived(usePageSchema())
  let version = $state(shortcuts.getVersion())
  let recording = $state<string | null>(null)
  let message = $state('')

  $effect(() =>
    shortcuts.subscribe(() => {
      version = shortcuts.getVersion()
    }),
  )

  const groups = $derived.by(() => {
    void version

    return shortcutOverlayGroups(shortcuts.list(), flattenActionGroup(page?.headerActions ?? []))
  })

  const groupLabel = (group: ShortcutListGroup['group']) =>
    ({
      general: t('shortcuts.groups.general', {}, 'General'),
      navigation: t('shortcuts.groups.navigation', {}, 'Navigation'),
      commands: t('shortcuts.groups.commands', {}, 'Commands'),
      actions: t('shortcuts.groups.actions', {}, 'Actions on this page'),
    })[group]

  const save = async (id: string, keys: string[] | null) => {
    if (!endpoint) return

    try {
      shortcuts.setOverrides(await saveShortcutOverrides(endpoint, { [id]: keys }))
      message = t('shortcuts.saved', {}, 'Shortcut saved.')
    } catch {
      message = t('shortcuts.save_failed', {}, 'The shortcut could not be saved.')
    }
  }

  const change = (item: ShortcutListItem) => {
    message = t(
      'shortcuts.recording',
      { label: item.label },
      `Press the new keys for “${item.label}”. Escape cancels.`,
    )
    recording = item.id
  }

  // While recording, the next key press is the new binding (Escape cancels). Listening in the
  // capture phase keeps the key from closing the dialog or running another shortcut.
  $effect(() => {
    const id = recording

    if (!id) return

    shortcuts.setPaused(true)

    const listener = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        recording = null
        message = t('shortcuts.cancelled', {}, 'Change cancelled.')

        return
      }

      const binding = bindingFromEvent(event)

      if (!binding) return

      const conflict = shortcuts.conflict([binding], id)

      recording = null

      if (conflict) {
        message = t(
          'shortcuts.conflict',
          { label: conflict.label },
          `Already used by “${conflict.label}”.`,
        )

        return
      }

      void untrack(() => save(id, [binding]))
    }

    window.addEventListener('keydown', listener, true)

    return () => {
      window.removeEventListener('keydown', listener, true)
      shortcuts.setPaused(false)
    }
  })

  const update = (next: boolean) => {
    recording = null
    message = ''
    open = next
  }
</script>

<Dialog {open} onOpenChange={update}>
  <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
    <div data-slot="shortcuts-overlay" class="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t('shortcuts.title', {}, 'Keyboard shortcuts')}</DialogTitle>
        <DialogDescription
          >{t('shortcuts.description', {}, 'Shortcuts available on this page.')}</DialogDescription
        >
      </DialogHeader>
      <div role="status" aria-live="polite" class="text-muted-foreground min-h-5 text-sm">
        {message}
      </div>
      <div class="flex flex-col gap-5">
        {#each groups as group (group.group)}
          <section data-group={group.group} aria-labelledby={`shortcuts-${group.group}`}>
            <h3
              id={`shortcuts-${group.group}`}
              class="text-muted-foreground mb-2 text-xs font-medium uppercase"
            >
              {groupLabel(group.group)}
            </h3>
            <ul class="flex flex-col divide-y rounded-md border">
              {#each group.items as item (item.id)}
                <li data-shortcut={item.id} class="flex items-center gap-3 px-3 py-2 text-sm">
                  <span class="min-w-0 flex-1 truncate">{item.label}</span>
                  {#if recording === item.id}
                    <span class="text-primary text-xs"
                      >{t('shortcuts.press_keys', {}, 'Press keys…')}</span
                    >
                  {:else if item.keys.length === 0}
                    <span class="text-muted-foreground text-xs"
                      >{t('shortcuts.off', {}, 'Off')}</span
                    >
                  {:else}
                    <span class="flex flex-wrap items-center justify-end gap-2">
                      {#each item.keys as key (key)}<ShortcutKeys binding={key} />{/each}
                    </span>
                  {/if}
                  {#if customizable && item.customizable}
                    <span class="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        aria-label={t(
                          'shortcuts.change_label',
                          { label: item.label },
                          `Change the shortcut for ${item.label}`,
                        )}
                        onclick={() => change(item)}>{t('shortcuts.change', {}, 'Change')}</Button
                      >
                      {#if item.keys.length > 0}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-label={t(
                            'shortcuts.turn_off_label',
                            { label: item.label },
                            `Turn off the shortcut for ${item.label}`,
                          )}
                          onclick={() => void save(item.id, [])}
                          >{t('shortcuts.turn_off', {}, 'Turn off')}</Button
                        >
                      {/if}
                      {#if item.customized}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-label={t(
                            'shortcuts.reset_label',
                            { label: item.label },
                            `Restore the default shortcut for ${item.label}`,
                          )}
                          onclick={() => void save(item.id, null)}
                          >{t('shortcuts.reset', {}, 'Reset')}</Button
                        >
                      {/if}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </div>
  </DialogContent>
</Dialog>
