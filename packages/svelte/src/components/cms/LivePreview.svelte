<script lang="ts">
  import {
    CMS_PREVIEW_DEVICES,
    CmsAutosave,
    callCmsAutosave,
    cmsPreviewFitsBeside,
    cmsPreviewOpensOnLoad,
    rememberedCmsPreview,
    resolveStickyOffset,
    reserveCmsPreviewSpace,
    type CmsAutosaveSnapshot,
    type CmsLivePreviewSchema,
    type CmsPreviewDevice,
  } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
  import EyeIcon from '@lucide/svelte/icons/eye'
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
  import Maximize2Icon from '@lucide/svelte/icons/maximize-2'
  import Minimize2Icon from '@lucide/svelte/icons/minimize-2'
  import MonitorIcon from '@lucide/svelte/icons/monitor'
  import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
  import TabletIcon from '@lucide/svelte/icons/tablet'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { usePageSchema, usePanel, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import ActionList from '../actions/ActionList.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'

  /**
   * The page editor's autosave status and live preview (schema type `CmsLivePreview`).
   * Changes are autosaved as a draft a moment after typing stops; the preview pane shows
   * the signed preview of that draft beside the form, full screen, or at tablet and phone
   * widths.
   */
  let { component }: { component: CmsLivePreviewSchema } = $props()

  const t = useT()
  const form = useOptionalFormStore()
  const devices = Object.keys(CMS_PREVIEW_DEVICES) as CmsPreviewDevice[]
  const icons = { desktop: MonitorIcon, tablet: TabletIcon, phone: SmartphoneIcon }
  const labels = { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' }

  let root = $state<HTMLElement | null>(null)
  let open = $state(false)
  let fullScreen = $state(false)
  // Too narrow for the form beside the pane (e.g. 1280px with the sidebar): full-screen overlay.
  let overlay = $state(false)
  const expanded = $derived(fullScreen || overlay)
  let device = $state<CmsPreviewDevice>('desktop')
  let snapshot = $state<CmsAutosaveSnapshot>(
    untrack(() => ({
      status: component.savedAt ? 'saved' : 'idle',
      savedAt: component.savedAt ?? null,
      previewUrl: component.previewUrl,
      version: 0,
      hasChanges: component.hasChanges ?? false,
    })),
  )
  const pageAction = usePageActionContext()
  const actionContext = $derived({ token: pageAction.token, component: 'page' })
  const status = $derived(
    snapshot.hasChanges && component.changedStatus ? component.changedStatus : component.status,
  )
  let top = $state('0px')
  /** Badge colours of the status (the server's `PageState` colours). */
  const STATUS_COLORS: Record<string, string> = {
    gray: 'border-border bg-muted text-foreground',
    success: 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    info: 'border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    danger: 'border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-300',
  }

  // Stick right under the panel's topbar when it sticks too.
  onMount(() => {
    top = resolveStickyOffset(null)
    // Wide screens open the pane beside the form; the viewer's last choice wins.
    if (component.previewUrl && cmsPreviewOpensOnLoad(root)) open = true
  })

  /** Open or collapse the pane, remembering the choice for the next visit. */
  function setOpen(next: boolean) {
    open = next
    rememberedCmsPreview(next ? 'open' : 'closed')
  }

  const width = $derived(CMS_PREVIEW_DEVICES[device])
  const statusLabel = $derived.by(() => {
    switch (snapshot.status) {
      case 'saving':
        return t('cms.saving', {}, 'Saving…')
      case 'saved':
        return t('cms.saved', {}, 'Draft saved automatically')
      case 'pending':
        return t('cms.unsaved', {}, 'Unsaved changes')
      case 'error':
        return t(
          'cms.save_failed',
          {},
          "Your latest changes couldn't be saved. They will be tried again.",
        )
      default:
        return ''
    }
  })

  const autosave = untrack(() =>
    form
      ? new CmsAutosave({
          debounce: component.debounce,
          previewUrl: component.previewUrl,
          savedAt: component.savedAt,
          hasChanges: component.hasChanges,
          save: (state) =>
            callCmsAutosave(component.autosaveMethod, state, {
              token: usePageSchema()?.token ?? '',
              endpoint: usePanel()?.endpoints?.pageCall ?? '',
            }),
          onChange: (next) => (snapshot = next),
        })
      : null,
  )

  let values = form?.state.values
  const unsubscribe = form?.subscribe((state) => {
    if (state.values !== values) {
      values = state.values
      autosave?.schedule(state.values)
    }
  })

  // Measure whether the pane fits beside the form while it is open, and again on resize.
  $effect(() => {
    if (!open) return

    const measure = () => (overlay = !cmsPreviewFitsBeside(root))
    measure()
    window.addEventListener('resize', measure)

    return () => window.removeEventListener('resize', measure)
  })

  // Side by side, the form makes room for the pane.
  $effect(() => {
    if (!open || expanded) return

    return reserveCmsPreviewSpace(root, 'min(50vw, 56rem)')
  })

  $effect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (fullScreen && !overlay) fullScreen = false
      else setOpen(false)
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  })

  onDestroy(() => {
    unsubscribe?.()
    void autosave?.flush().finally(() => autosave.dispose())
  })
</script>

<div
  bind:this={root}
  data-slot="cms-live-preview"
  style:top
  class="bg-background sticky z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2.5 shadow-sm"
>
  <div class="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
    {#if status}
      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" data-slot="cms-editor-status">
        <Badge variant="outline" data-color={status.color} class={STATUS_COLORS[status.color] ?? ''}
          >{status.label}</Badge
        >
        <span class="text-muted-foreground">{status.description}</span>
      </p>
    {/if}
    <p
      class="text-muted-foreground flex min-h-4 items-center gap-1.5 text-xs"
      role="status"
      aria-live="polite"
    >
      {#if snapshot.status === 'saving'}
        <LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
      {:else if snapshot.status === 'error'}
        <CircleAlertIcon class="text-destructive size-4" aria-hidden="true" />
      {:else if snapshot.status === 'saved'}
        <CheckIcon class="size-4" aria-hidden="true" />
      {/if}
      {statusLabel}
    </p>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    {#if snapshot.previewUrl}
      <Button
        type="button"
        variant={open ? 'secondary' : 'outline'}
        size="sm"
        aria-pressed={open}
        title={t(
          'cms.live_preview_help',
          {},
          'See the page as visitors will, updated as you type.',
        )}
        data-slot="cms-live-preview-toggle"
        onclick={() => setOpen(!open)}
      >
        <EyeIcon aria-hidden="true" />
        {open
          ? t('cms.hide_preview', {}, 'Hide preview')
          : t('cms.live_preview', {}, 'Live preview')}
      </Button>
    {/if}
    {#if component.actions?.length}
      <!-- Pressing a main action saves the latest typing first. -->
      <div onpointerdowncapture={() => void autosave?.flush()} role="presentation">
        <ActionList actions={component.actions} context={actionContext} size="sm" />
      </div>
    {/if}
  </div>
  {#if open && snapshot.previewUrl}
    <section
      aria-label={t('cms.live_preview', {}, 'Live preview')}
      data-slot="cms-live-preview-pane"
      data-full-screen={expanded || undefined}
      style:top={expanded ? '0px' : top}
      class={cn(
        'bg-background fixed end-0 bottom-0 z-50 flex flex-col border-s shadow-xl',
        expanded ? 'inset-x-0 border-s-0' : 'w-full lg:w-[min(50vw,56rem)]',
      )}
    >
      <header class="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div
          class="flex items-center gap-1"
          role="group"
          aria-label={t('cms.preview_width', {}, 'Preview width')}
        >
          {#each devices as name (name)}
            {@const DeviceIcon = icons[name]}
            <Button
              type="button"
              variant={device === name ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-pressed={device === name}
              onclick={() => (device = name)}
            >
              <DeviceIcon aria-hidden="true" />
              <span class="sr-only">{t(`cms.device_${name}`, {}, labels[name])}</span>
            </Button>
          {/each}
        </div>
        <p class="text-muted-foreground hidden truncate text-xs sm:block">{statusLabel}</p>
        <div class="flex items-center gap-1">
          {#if !overlay}<Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-pressed={fullScreen}
              onclick={() => (fullScreen = !fullScreen)}
            >
              {#if fullScreen}<Minimize2Icon aria-hidden="true" />{:else}<Maximize2Icon
                  aria-hidden="true"
                />{/if}
              <span class="sr-only"
                >{fullScreen
                  ? t('cms.exit_full_screen', {}, 'Exit full screen')
                  : t('cms.full_screen', {}, 'Full screen')}</span
              >
            </Button>{/if}
          <Button type="button" variant="ghost" size="icon-sm" onclick={() => setOpen(false)}>
            <XIcon aria-hidden="true" />
            <span class="sr-only">{t('cms.close_preview', {}, 'Close preview')}</span>
          </Button>
        </div>
      </header>
      <div class="bg-muted/40 flex flex-1 justify-center overflow-auto p-3">
        {#key snapshot.version}
          <iframe
            src={snapshot.previewUrl}
            title={t('cms.preview_frame', {}, 'Page preview')}
            class="bg-background h-full rounded-md border shadow-sm"
            style:width={width === null ? '100%' : `${width}px`}
            style:max-width="100%"
          ></iframe>
        {/key}
      </div>
    </section>
  {/if}
</div>
