import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CMS_PREVIEW_STORAGE_KEY,
  CmsAutosave,
  cmsPreviewFitsBeside,
  cmsPreviewOpensByDefault,
  cmsPreviewOpensOnLoad,
  rememberedCmsPreview,
  reserveCmsPreviewSpace,
} from '../src/cms-live-preview'

describe('CmsAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces changes, saves the latest state and bumps the preview version', async () => {
    const save = vi.fn(async () => ({
      savedAt: '2026-10-14T10:00:00+00:00',
      hasChanges: true,
      previewUrl: '/p?2',
    }))
    const snapshots: string[] = []
    const autosave = new CmsAutosave({
      save,
      debounce: 500,
      previewUrl: '/p?1',
      onChange: (s) => snapshots.push(s.status),
    })

    autosave.schedule({ title: 'A' })
    autosave.schedule({ title: 'AB' })
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'AB' })
    expect(autosave.snapshot).toMatchObject({
      status: 'saved',
      previewUrl: '/p?2',
      version: 1,
      hasChanges: true,
    })
    expect(snapshots).toContain('saving')
  })

  it('keeps the state after a failure and retries', async () => {
    let fail = true
    const save = vi.fn(async () => {
      if (fail) throw new Error('offline')
      return { savedAt: null, hasChanges: true, previewUrl: null }
    })
    const autosave = new CmsAutosave({ save, debounce: 100, previewUrl: '/p', retryAfter: 1000 })

    autosave.schedule({ title: 'X' })
    await vi.advanceTimersByTimeAsync(100)
    expect(autosave.snapshot.status).toBe('error')

    fail = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(autosave.snapshot).toMatchObject({ status: 'saved', previewUrl: '/p', version: 1 })
    autosave.dispose()
  })
})

describe('cmsPreviewOpensByDefault', () => {
  it('opens beside the form on wide screens unless the viewer closed it', () => {
    expect(cmsPreviewOpensByDefault(null, 1920)).toBe(true)
    expect(cmsPreviewOpensByDefault(null, 1440)).toBe(false)
    expect(cmsPreviewOpensByDefault('closed', 1920)).toBe(false)
    expect(cmsPreviewOpensByDefault('open', 1280)).toBe(true)
    expect(cmsPreviewOpensByDefault('open', 800)).toBe(false)
  })
})

describe('cmsPreviewOpensOnLoad', () => {
  const setScreen = (width: number) => {
    vi.stubGlobal('innerWidth', width)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 1024px)' && width >= 1024,
    }))
  }

  const editor = (columnWidth: number) => {
    const column = document.createElement('div')
    Object.defineProperty(column, 'clientWidth', { value: columnWidth })
    const content = document.createElement('main')
    content.setAttribute('data-slot', 'content')
    const bar = document.createElement('div')
    column.append(content)
    content.append(bar)

    return bar
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.removeItem(CMS_PREVIEW_STORAGE_KEY)
  })

  it('opens when the content area has room, and follows the remembered choice', () => {
    setScreen(1920)
    expect(cmsPreviewOpensOnLoad(editor(1664))).toBe(true)
    expect(cmsPreviewOpensOnLoad(editor(1200))).toBe(false)

    expect(rememberedCmsPreview('closed')).toBe('closed')
    expect(cmsPreviewOpensOnLoad(editor(1664))).toBe(false)

    rememberedCmsPreview('open')
    expect(cmsPreviewOpensOnLoad(editor(1664))).toBe(true)

    // 1280px with the sidebar: the pane would leave the form 384px, so it stays closed.
    setScreen(1280)
    expect(cmsPreviewOpensOnLoad(editor(1024))).toBe(false)
  })

  it('only fits beside the form when the form keeps 640px', () => {
    setScreen(1280)
    expect(cmsPreviewFitsBeside(editor(1024))).toBe(false)
    expect(cmsPreviewFitsBeside(editor(1280))).toBe(true)
    setScreen(1920)
    expect(cmsPreviewFitsBeside(editor(1664))).toBe(true)
    expect(cmsPreviewFitsBeside(editor(1400))).toBe(false)
    setScreen(800)
    expect(cmsPreviewFitsBeside(editor(800))).toBe(false)
  })

  it('stays closed on small screens', () => {
    setScreen(800)
    rememberedCmsPreview('open')
    expect(cmsPreviewOpensOnLoad(editor(800))).toBe(false)
  })
})

describe('reserveCmsPreviewSpace', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('moves the content area clear of the pane and restores it', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const content = document.createElement('main')
    content.setAttribute('data-slot', 'content')
    const bar = document.createElement('div')
    content.append(bar)

    const release = reserveCmsPreviewSpace(bar, '40rem')
    expect(content.style.marginInlineEnd).toBe('40rem')
    expect(content.style.width).toBe('auto')

    release()
    expect(content.style.marginInlineEnd).toBe('')
    expect(content.style.width).toBe('')
  })
})
