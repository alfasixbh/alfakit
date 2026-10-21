import {
  CMS_PREVIEW_DEVICES,
  CmsAutosave,
  callCmsAutosave,
  cmsPreviewFitsBeside,
  cmsPreviewOpensOnLoad,
  rememberedCmsPreview,
  reserveCmsPreviewSpace,
  resolveStickyOffset,
  type CmsAutosaveSnapshot,
  type CmsLivePreviewSchema,
  type CmsPreviewDevice,
} from '@alfakit/core'
import {
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  Minimize2Icon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePageSchema, usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import { ActionList } from '../actions/action-list'
import { useOptionalFormStore } from '../form/form-context'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

/** Badge colours of the status (the server's `PageState` colours). */
const STATUS_COLORS: Record<string, string> = {
  gray: 'border-border bg-muted text-foreground',
  success: 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  danger: 'border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

const DEVICE_ICONS = { desktop: MonitorIcon, tablet: TabletIcon, phone: SmartphoneIcon }
const DEVICE_LABELS = { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' }

/**
 * The page editor's autosave status and live preview (schema type `CmsLivePreview`).
 * Changes are autosaved as a draft a moment after typing stops; the preview pane shows
 * the signed preview of that draft beside the form, full screen, or at tablet and phone
 * widths.
 */
export function CmsLivePreview({ component }: { component: CmsLivePreviewSchema }) {
  const t = useT()
  const form = useOptionalFormStore()
  const page = usePageSchema()
  const panel = usePanel()
  const latest = useRef({ token: page?.token ?? '', endpoint: panel?.endpoints?.pageCall ?? '' })
  const [snapshot, setSnapshot] = useState<CmsAutosaveSnapshot>({
    status: component.savedAt ? 'saved' : 'idle',
    savedAt: component.savedAt ?? null,
    previewUrl: component.previewUrl,
    version: 0,
    hasChanges: component.hasChanges ?? false,
  })
  const [top, setTop] = useState('0px')
  const actionContext = useMemo(
    () => ({ token: page?.token ?? '', component: 'page' }),
    [page?.token],
  )

  const [open, setOpenState] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  // Too narrow for the form beside the pane (e.g. 1280px with the sidebar): full-screen overlay.
  const [overlay, setOverlay] = useState(false)
  const expanded = fullScreen || overlay
  const [device, setDevice] = useState<CmsPreviewDevice>('desktop')
  const root = useRef<HTMLDivElement>(null)
  const autosaveRef = useRef<CmsAutosave | null>(null)
  const status =
    snapshot.hasChanges && component.changedStatus ? component.changedStatus : component.status
  // "Publish changes" appears as soon as an autosave makes the draft differ.
  const actions =
    snapshot.hasChanges && component.changedActions ? component.changedActions : component.actions

  // Measured in the browser after mounting: stick right under the panel's topbar when it
  // sticks too, and open the pane beside the form on wide screens (the viewer's last
  // choice wins).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTop(resolveStickyOffset(null))
      if (component.previewUrl && cmsPreviewOpensOnLoad(root.current)) setOpenState(true)
    })

    return () => cancelAnimationFrame(frame)
  }, [component.previewUrl])

  /** Open or collapse the pane, remembering the choice for the next visit. */
  const setOpen = (next: boolean) => {
    // Decided in the same render as opening, so the form never makes room for nothing.
    if (next) setOverlay(!cmsPreviewFitsBeside(root.current))
    setOpenState(next)
    rememberedCmsPreview(next ? 'open' : 'closed')
  }

  useEffect(() => {
    latest.current = { token: page?.token ?? '', endpoint: panel?.endpoints?.pageCall ?? '' }
  })

  useEffect(() => {
    if (!form) return

    const autosave = new CmsAutosave({
      debounce: component.debounce,
      previewUrl: component.previewUrl,
      savedAt: component.savedAt,
      hasChanges: component.hasChanges,
      save: (state) => callCmsAutosave(component.autosaveMethod, state, latest.current),
      onChange: setSnapshot,
    })

    autosaveRef.current = autosave
    let values = form.state.values
    const unsubscribe = form.subscribe((state) => {
      if (state.values !== values) {
        values = state.values
        autosave.schedule(state.values)
      }
    })

    return () => {
      unsubscribe()
      void autosave.flush().finally(() => autosave.dispose())
    }
  }, [form, component.autosaveMethod, component.debounce, component.previewUrl, component.savedAt])

  // Measure whether the pane fits beside the form while it is open, and again on resize.
  useEffect(() => {
    if (!open) return

    const measure = () => setOverlay(!cmsPreviewFitsBeside(root.current))
    measure()
    window.addEventListener('resize', measure)

    return () => window.removeEventListener('resize', measure)
  }, [open])

  // Side by side, the form makes room for the pane.
  useEffect(() => {
    if (!open || expanded) return

    return reserveCmsPreviewSpace(root.current, 'min(50vw, 56rem)')
  }, [open, expanded])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (fullScreen && !overlay) setFullScreen(false)
      else {
        setOpenState(false)
        rememberedCmsPreview('closed')
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open, fullScreen, overlay])

  const width = CMS_PREVIEW_DEVICES[device]

  return (
    <div
      ref={root}
      data-slot="cms-live-preview"
      style={{ top }}
      className="bg-background sticky z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2.5 shadow-sm"
    >
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
        {status && (
          <p
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            data-slot="cms-editor-status"
          >
            <Badge
              variant="outline"
              data-color={status.color}
              className={STATUS_COLORS[status.color] ?? ''}
            >
              {status.label}
            </Badge>
            <span className="text-muted-foreground">{status.description}</span>
          </p>
        )}
        <p
          className="text-muted-foreground flex min-h-4 items-center gap-1.5 text-xs"
          role="status"
          aria-live="polite"
        >
          <StatusIcon status={snapshot.status} />
          {statusLabel(snapshot.status, t)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {snapshot.previewUrl && (
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
            onClick={() => setOpen(!open)}
            data-slot="cms-live-preview-toggle"
          >
            <EyeIcon aria-hidden="true" />
            {open
              ? t('cms.hide_preview', {}, 'Hide preview')
              : t('cms.live_preview', {}, 'Live preview')}
          </Button>
        )}
        {actions && actions.length > 0 && (
          <div onPointerDownCapture={() => void autosaveRef.current?.flush()}>
            <ActionList actions={actions} context={actionContext} size="sm" />
          </div>
        )}
      </div>
      {open && snapshot.previewUrl && (
        <section
          aria-label={t('cms.live_preview', {}, 'Live preview')}
          data-slot="cms-live-preview-pane"
          data-full-screen={expanded || undefined}
          // Beside the form it starts below the sticky topbar, keeping the topbar usable.
          style={{ top: expanded ? '0px' : top }}
          className={cn(
            'bg-background fixed end-0 bottom-0 z-50 flex flex-col border-s shadow-xl',
            expanded ? 'inset-x-0 border-s-0' : 'w-full lg:w-[min(50vw,56rem)]',
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label={t('cms.preview_width', {}, 'Preview width')}
            >
              {(Object.keys(CMS_PREVIEW_DEVICES) as CmsPreviewDevice[]).map((name) => {
                const DeviceIcon = DEVICE_ICONS[name]

                return (
                  <Button
                    key={name}
                    type="button"
                    variant={device === name ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-pressed={device === name}
                    onClick={() => setDevice(name)}
                  >
                    <DeviceIcon aria-hidden="true" />
                    <span className="sr-only">
                      {t(`cms.device_${name}`, {}, DEVICE_LABELS[name])}
                    </span>
                  </Button>
                )
              })}
            </div>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {statusLabel(snapshot.status, t)}
            </p>
            <div className="flex items-center gap-1">
              {!overlay && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={fullScreen}
                  onClick={() => setFullScreen(!fullScreen)}
                >
                  {fullScreen ? (
                    <Minimize2Icon aria-hidden="true" />
                  ) : (
                    <Maximize2Icon aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {fullScreen
                      ? t('cms.exit_full_screen', {}, 'Exit full screen')
                      : t('cms.full_screen', {}, 'Full screen')}
                  </span>
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <XIcon aria-hidden="true" />
                <span className="sr-only">{t('cms.close_preview', {}, 'Close preview')}</span>
              </Button>
            </div>
          </header>
          <div className="bg-muted/40 flex flex-1 justify-center overflow-auto p-3">
            <iframe
              key={snapshot.version}
              src={snapshot.previewUrl}
              title={t('cms.preview_frame', {}, 'Page preview')}
              className="bg-background h-full rounded-md border shadow-sm"
              style={{ width: width === null ? '100%' : `${width}px`, maxWidth: '100%' }}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: CmsAutosaveSnapshot['status'] }) {
  if (status === 'saving')
    return <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
  if (status === 'error')
    return <CircleAlertIcon className="text-destructive size-4" aria-hidden="true" />
  if (status === 'saved') return <CheckIcon className="size-4" aria-hidden="true" />

  return null
}

function statusLabel(status: CmsAutosaveSnapshot['status'], t: ReturnType<typeof useT>): string {
  switch (status) {
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
}
