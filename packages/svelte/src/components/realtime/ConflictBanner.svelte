<script lang="ts">
  import {
    ConflictMonitor,
    PresenceRoom,
    conflictMessage,
    findPageFormBlock,
    type ConflictMonitorState,
    type PageSchema,
  } from '@alfakit/core'
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
  import XIcon from '@lucide/svelte/icons/x'
  import { useFormatter, usePanel, useT } from '../../context.svelte'
  import { Button } from '../ui/button'

  /**
   * Edit pages (`detectConflicts()`): a non-blocking banner when somebody else saved the
   * record ("Dana saved changes 10 seconds ago", over `Panel::realtime()`) or the server
   * refused a save, with review (the changed fields against your unsaved values), reload
   * and keep mine. Replace it with `components: { 'page:conflict-banner': … }`.
   */
  let { page }: { page: PageSchema } = $props()

  const t = useT()
  const formatter = useFormatter()
  const panel = $derived(usePanel())
  const version = $derived(page.conflicts?.version ?? '')
  const channel = $derived(page.presence?.channel ?? null)

  let monitor = $state.raw<ConflictMonitor | null>(null)
  let monitorState = $state.raw<ConflictMonitorState>({
    conflict: null,
    fields: null,
    loading: false,
    failed: false,
  })
  let reviewing = $state(false)
  let tick = $state(0)

  // A new version (after saving or reloading) starts over. Browser only.
  $effect(() => {
    const next = new ConflictMonitor({
      version,
      token: page.token,
      endpoint: panel.endpoints.conflicts,
      channel,
      original: (findPageFormBlock(page)?.state as Record<string, unknown> | undefined) ?? {},
      self: panel.user?.id ?? null,
      resolveName: (id) => (channel ? (PresenceRoom.find(channel)?.memberName(id) ?? null) : null),
    })

    monitor = next
    monitorState = next.state
    reviewing = false

    const unsubscribe = next.store.subscribe((value) => {
      monitorState = value

      if (!value.conflict) reviewing = false
    })
    const stop = next.start()

    return () => {
      stop()
      unsubscribe()
    }
  })

  $effect(() => {
    monitor?.setToken(page.token)
  })

  // "10 seconds ago" keeps counting.
  $effect(() => {
    const timer = setInterval(() => (tick += 1), 15_000)

    return () => clearInterval(timer)
  })

  const conflict = $derived(monitorState.conflict)
  const text = $derived.by(() => {
    void tick

    if (!conflict) return ''

    const message = conflictMessage(conflict)

    return t(
      message.key,
      { name: conflict.name ?? '', time: formatter.current.relative(conflict.at) },
      message.fallback,
    )
  })
  const deleted = $derived(conflict?.event === 'deleted')
  const fields = $derived(monitorState.fields ?? [])
  const empty = $derived(t('realtime.conflict.empty', {}, 'Empty'))

  const review = () => {
    reviewing = !reviewing

    if (reviewing && monitorState.fields === null) void monitor?.review()
  }
</script>

{#if conflict}
  <div
    data-slot="conflict-banner"
    data-source={conflict.source}
    role="status"
    aria-live="polite"
    class="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <TriangleAlertIcon class="size-4 shrink-0" aria-hidden="true" />
      <p class="min-w-0 flex-1 font-medium">{text}</p>
      <div class="flex flex-wrap items-center gap-2">
        {#if !deleted}
          <Button
            size="sm"
            variant="outline"
            aria-expanded={reviewing}
            aria-controls="alfakit-conflict-review"
            onclick={review}
          >
            {t('realtime.conflict.review', {}, 'Review changes')}
          </Button>
        {/if}
        <Button size="sm" variant="outline" onclick={() => monitor?.reload()}>
          <RefreshCwIcon aria-hidden="true" />
          {t('realtime.conflict.reload', {}, 'Reload')}
        </Button>
        {#if !deleted}
          <Button size="sm" onclick={() => void monitor?.keepMine()}>
            {t('realtime.conflict.keep_mine', {}, 'Keep mine')}
          </Button>
        {/if}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('realtime.conflict.dismiss', {}, 'Dismiss')}
          onclick={() => monitor?.dismiss()}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
    {#if reviewing}
      <div id="alfakit-conflict-review" data-slot="conflict-review" class="flex flex-col gap-2">
        {#if monitorState.loading}
          <p class="text-muted-foreground">
            {t('realtime.conflict.loading', {}, 'Loading changes…')}
          </p>
        {:else if monitorState.failed}
          <p>{t('realtime.conflict.failed', {}, 'The changes could not be loaded.')}</p>
        {:else if fields.length === 0}
          <p>{t('realtime.conflict.no_changes', {}, 'No field differs from what you loaded.')}</p>
        {:else}
          <table
            class="bg-background/60 text-foreground w-full overflow-hidden rounded-md text-start text-sm"
          >
            <caption class="sr-only"
              >{t(
                'realtime.conflict.caption',
                {},
                'Fields changed since you opened the record',
              )}</caption
            >
            <thead>
              <tr class="border-b">
                <th scope="col" class="px-3 py-2 text-start font-medium"
                  >{t('realtime.conflict.field', {}, 'Field')}</th
                >
                <th scope="col" class="px-3 py-2 text-start font-medium"
                  >{t('realtime.conflict.theirs', {}, 'Saved')}</th
                >
                <th scope="col" class="px-3 py-2 text-start font-medium"
                  >{t('realtime.conflict.mine', {}, 'Yours')}</th
                >
                <th scope="col" class="px-3 py-2"
                  ><span class="sr-only">{t('realtime.conflict.actions', {}, 'Actions')}</span></th
                >
              </tr>
            </thead>
            <tbody>
              {#each fields as field (field.path)}
                <tr
                  data-conflicting={field.conflicting || undefined}
                  class="border-b last:border-b-0"
                >
                  <th scope="row" class="px-3 py-2 text-start font-medium">
                    {field.label}
                    {#if field.conflicting}
                      <span
                        class="ms-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-normal text-amber-950 dark:bg-amber-800 dark:text-amber-50"
                        >{t('realtime.conflict.both_changed', {}, 'Changed by both')}</span
                      >
                    {/if}
                  </th>
                  <td class="px-3 py-2 break-words">{field.theirs ?? empty}</td>
                  <td class="px-3 py-2 break-words">{field.mine ?? empty}</td>
                  <td class="px-3 py-2 text-end">
                    <Button
                      size="xs"
                      variant="outline"
                      aria-label={t(
                        'realtime.conflict.use_theirs_label',
                        { field: field.label },
                        'Use the saved value of :field',
                      )}
                      onclick={() => monitor?.useTheirs(field.path)}
                    >
                      {t('realtime.conflict.use_theirs', {}, 'Use saved value')}
                    </Button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    {/if}
  </div>
{/if}
