import { callPageMethod } from './page-methods'
import type { CmsAutosaveResult } from './schema/cms'

/**
 * The framework-agnostic half of the page editor's live preview (alfasix/alfakit-cms):
 * debounced autosaves of the form state through the page's exposed `cmsAutosave` method,
 * and the preview URL and reload counter the renderers bind an iframe to. The server
 * stores the draft and signs the preview; nothing here renders or validates content.
 */

export type CmsAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface CmsAutosaveSnapshot {
  status: CmsAutosaveStatus
  savedAt: string | null
  previewUrl: string | null
  /** Bumped after every successful save: remount the preview iframe on change. */
  version: number
  /** The saved draft differs from what visitors see (`hasPendingChanges()`). */
  hasChanges: boolean
}

export interface CmsAutosaveOptions {
  /** Send the state (the editor page's `cmsAutosave` method). */
  save: (state: Record<string, unknown>) => Promise<CmsAutosaveResult>
  debounce: number
  previewUrl: string | null
  savedAt?: string | null
  hasChanges?: boolean
  onChange?: (snapshot: CmsAutosaveSnapshot) => void
  /** Retry delay after a failed save (milliseconds). */
  retryAfter?: number
}

/** Preview widths: `null` fills the pane. */
export const CMS_PREVIEW_DEVICES = {
  desktop: null,
  tablet: 768,
  phone: 390,
} as const

export type CmsPreviewDevice = keyof typeof CMS_PREVIEW_DEVICES

export class CmsAutosave {
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: Record<string, unknown> | null = null
  private running = false
  private disposed = false
  private current: CmsAutosaveSnapshot

  constructor(private readonly options: CmsAutosaveOptions) {
    this.current = {
      status: options.savedAt ? 'saved' : 'idle',
      savedAt: options.savedAt ?? null,
      previewUrl: options.previewUrl,
      version: 0,
      hasChanges: options.hasChanges ?? false,
    }
  }

  get snapshot(): CmsAutosaveSnapshot {
    return this.current
  }

  /** The form changed: save its state once it stays unchanged for `debounce` ms. */
  schedule(state: Record<string, unknown>): void {
    if (this.disposed) return

    this.pending = state
    this.update({ status: 'pending' })

    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.options.debounce)
  }

  /** Save the latest state now (when one is waiting). */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.disposed || this.running || this.pending === null) return

    const state = this.pending
    this.pending = null
    this.running = true
    this.update({ status: 'saving' })

    try {
      const result = await this.options.save(state)

      if (this.disposed) return

      this.update({
        status: this.pending === null ? 'saved' : 'pending',
        savedAt: result.savedAt,
        previewUrl: result.previewUrl ?? this.current.previewUrl,
        version: this.current.version + 1,
        hasChanges: result.hasChanges,
      })
    } catch {
      if (this.disposed) return

      // Keep the newest state and try again later.
      this.pending ??= state
      this.update({ status: 'error' })
      this.timer = setTimeout(() => void this.flush(), this.options.retryAfter ?? 5000)
    } finally {
      this.running = false
    }

    if (this.pending !== null && this.timer === null) {
      this.timer = setTimeout(() => void this.flush(), this.options.debounce)
    }
  }

  dispose(): void {
    this.disposed = true

    if (this.timer) clearTimeout(this.timer)
  }

  private update(patch: Partial<CmsAutosaveSnapshot>): void {
    this.current = { ...this.current, ...patch }
    this.options.onChange?.(this.current)
  }
}

/**
 * While the side-by-side preview is open, make room for it: the panel's content area
 * (`[data-slot="content"]`) keeps clear of the pane with an inline end margin of the pane's
 * width (it may be centred with a maximum width, so padding would only squeeze the form),
 * restored when it closes. Returns the function that restores it.
 */
export function reserveCmsPreviewSpace(from: Element | null, width: string): () => void {
  const content = from?.closest<HTMLElement>('[data-slot="content"]')

  if (
    !content ||
    typeof window === 'undefined' ||
    !window.matchMedia?.('(min-width: 1024px)').matches
  ) {
    return () => {}
  }

  const previous = { margin: content.style.marginInlineEnd, width: content.style.width }
  content.style.marginInlineEnd = width
  content.style.width = 'auto'

  return () => {
    content.style.marginInlineEnd = previous.margin
    content.style.width = previous.width
  }
}

/**
 * Whether the side-by-side preview should open on its own: a wide enough screen for the
 * form and the pane (`minWidth`, 1536px by default), unless this viewer closed it last
 * time (`remembered === 'closed'`).
 */
export function cmsPreviewOpensByDefault(
  remembered: string | null,
  width: number = typeof window === 'undefined' ? 0 : window.innerWidth,
  minWidth = 1536,
): boolean {
  if (remembered === 'open') return width >= 1024
  if (remembered === 'closed') return false

  return width >= minWidth
}

/** Width of the side-by-side pane: half the screen, at most 56rem (matches `lg:w-[min(50vw,56rem)]`). */
export function cmsPreviewPaneWidth(): number {
  if (typeof window === 'undefined') return 0

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

  return Math.min(window.innerWidth / 2, 56 * rem)
}

/**
 * Whether the preview fits beside the form: at least the `lg` breakpoint, and the column
 * holding the panel's content area (the parent of `[data-slot="content"]` around `from`,
 * i.e. the screen minus the sidebar) keeps `minFormWidth` pixels (640) for the form next to
 * the pane. When it doesn't, renderers open the preview as a full-screen overlay instead, so
 * the form never runs under the pane.
 */
export function cmsPreviewFitsBeside(from: Element | null, minFormWidth = 640): boolean {
  if (typeof window === 'undefined' || !window.matchMedia?.('(min-width: 1024px)').matches) {
    return false
  }

  const column = from?.closest<HTMLElement>('[data-slot="content"]')?.parentElement
  const width = column?.clientWidth || window.innerWidth

  return width - cmsPreviewPaneWidth() >= minFormWidth
}

/**
 * Whether the side-by-side preview opens when the editor loads: never below the `lg`
 * breakpoint (phones and tablets keep it closed) or when it wouldn't fit beside the form
 * (`cmsPreviewFitsBeside()`); when this viewer opened or closed it last time, their choice;
 * otherwise when the column holding the panel's content area (the parent of
 * `[data-slot="content"]` around `from`) is at least `minWidth` wide (1440px).
 */
export function cmsPreviewOpensOnLoad(from: Element | null, minWidth = 1440): boolean {
  if (typeof window === 'undefined' || !window.matchMedia?.('(min-width: 1024px)').matches) {
    return false
  }

  if (!cmsPreviewFitsBeside(from)) return false

  const remembered = rememberedCmsPreview()
  const column = from?.closest<HTMLElement>('[data-slot="content"]')?.parentElement
  const width =
    remembered === 'open' ? window.innerWidth : (column?.clientWidth ?? window.innerWidth)

  return cmsPreviewOpensByDefault(remembered, width, minWidth)
}
/** The storage key remembering whether the viewer keeps the preview open. */
export const CMS_PREVIEW_STORAGE_KEY = 'alfakit:cms-live-preview'

/** Read / write the viewer's preview choice; storage may be unavailable. */
export function rememberedCmsPreview(value?: 'open' | 'closed'): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    if (value) localStorage.setItem(CMS_PREVIEW_STORAGE_KEY, value)

    return localStorage.getItem(CMS_PREVIEW_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Call the editor page's autosave method with the form state. */
export async function callCmsAutosave(
  method: string,
  state: Record<string, unknown>,
  options: { token: string; endpoint: string },
): Promise<CmsAutosaveResult> {
  const response = await callPageMethod<CmsAutosaveResult>(method, { state }, options)

  return response.result
}
