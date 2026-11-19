import { describe, expect, it, vi } from 'vitest'
import { isImplicitSubmit } from '../src/implicit-submit'
import { isEditableTarget } from '../src/shortcuts'
import { matchesKeyBinding } from '../src/utils/keybindings'
import { applyMask } from '../src/utils/mask'

describe('keyboard edge cases', () => {
  it('ignores keydown events without a key (autofill, some IMEs)', () => {
    const event = { key: undefined, code: undefined } as unknown as KeyboardEvent

    expect(() => matchesKeyBinding(event, 'mod+s')).not.toThrow()
    expect(matchesKeyBinding(event, 'mod+s')).toBe(false)
  })

  it('treats open lists, menus and dialogs as places where single keys are typed', () => {
    document.body.innerHTML = `
      <div role="listbox"><div role="option" id="option" tabindex="0">Draft</div></div>
      <div role="menu"><div role="menuitem" id="item" tabindex="0">Edit</div></div>
      <div role="dialog"><button id="in-dialog">Save</button></div>
      <button id="plain">Plain</button>`

    expect(isEditableTarget(document.getElementById('option'))).toBe(true)
    expect(isEditableTarget(document.getElementById('item'))).toBe(true)
    expect(isEditableTarget(document.getElementById('in-dialog'))).toBe(true)
    expect(isEditableTarget(document.getElementById('plain'))).toBe(false)
  })

  it('does not submit on the Enter that confirms an IME candidate', () => {
    document.body.innerHTML = '<form><input id="name" type="text" /></form>'
    const form = document.querySelector('form')!
    const target = document.getElementById('name')
    const enter = { key: 'Enter', defaultPrevented: false, target }

    expect(isImplicitSubmit(enter, form)).toBe(true)
    expect(isImplicitSubmit({ ...enter, isComposing: true }, form)).toBe(false)
    // Safari: composition has ended, the keyCode still says IME.
    expect(isImplicitSubmit({ ...enter, keyCode: 229 }, form)).toBe(false)
  })
})

describe('input masks', () => {
  it('accepts digits typed on Arabic and Persian keyboards', () => {
    expect(applyMask('١٢٣٤٥٦٧', '999 9999')).toBe('123 4567')
    expect(applyMask('۱۲۳', '999')).toBe('123')
    expect(applyMask('1234567', '999 9999')).toBe('123 4567')
  })
})

describe('picker table query', () => {
  it('marks cleared filters, so a filter default is not applied again', async () => {
    const { modalTableQuery } = await import('../src/advanced-fields')

    expect(modalTableQuery('picker', { search: 'a' })).toEqual({ picker_search: 'a' })
    expect(modalTableQuery('picker', { filters: null })).toEqual({
      picker_filters: { _cleared: 1 },
    })
    expect(modalTableQuery('picker', { filters: { status: { value: null } } })).toEqual({
      picker_filters: { _cleared: 1 },
    })
    expect(modalTableQuery('picker', { filters: { status: { value: 'draft' } } })).toEqual({
      picker_filters: { status: { value: 'draft' } },
    })
  })
})

describe('round 4', () => {
  it('treats a custom field as a field by its shape', async () => {
    const { isField } = await import('../src/schema/components')

    expect(isField({ type: 'ColorWheel', name: 'x', statePath: 'data.x' } as never)).toBe(true)
    expect(isField({ type: 'Section' } as never)).toBe(false)
    expect(isField({ type: 'TextEntry', name: 'x' } as never)).toBe(false)
  })

  it('does not collapse a content grid to one column on wide containers', async () => {
    const { contentGridClasses } = await import('../src/utils/container-breakpoints')

    expect(contentGridClasses({ default: 1, lg: 3 })).not.toContain('@7xl:grid-cols-1')
    expect(contentGridClasses({ default: 1, lg: 3 })).toContain('grid-cols-3')
  })

  it('knows local hostnames exactly', async () => {
    const { isLocalHostname } = await import('../src/analytics')

    expect(
      ['localhost', '127.0.0.1', '[::1]', 'shop.localhost', 'shop.test'].every(isLocalHostname),
    ).toBe(true)
    expect(['localhost-shop.com', '127.example.com', 'example.com'].some(isLocalHostname)).toBe(
      false,
    )
  })

  it('reads colours with an alpha channel and space-separated channels', async () => {
    const { colorToHex } = await import('../src/utils/color')

    expect(colorToHex('hsla(120, 50%, 50%, 0.5)')).toBe('#40bf40')
    expect(colorToHex('#11223344')).toBe('#112233')
    expect(colorToHex('rgb(10 20 30)')).toBe('#0a141e')
    expect(colorToHex('rgb(10 20 30 / 50%)')).toBe('#0a141e')
    expect(colorToHex('rgba(10, 20, 30, 0.5)')).toBe('#0a141e')
  })

  it('saves the edits made during a running save before flush resolves', async () => {
    const { CmsAutosave } = await import('../src/cms-live-preview')
    const saved: unknown[] = []
    let release: () => void = () => undefined

    const autosave = new CmsAutosave({
      debounce: 10_000,
      save: async (state: Record<string, unknown>) => {
        saved.push(state)
        if (saved.length === 1) await new Promise<void>((resolve) => (release = resolve))

        return { savedAt: 'now', hasChanges: true }
      },
    } as never)

    autosave.schedule({ title: 'a' })
    const first = autosave.flush()
    autosave.schedule({ title: 'b' })
    const closing = autosave.flush().finally(() => autosave.dispose())
    release()
    await first
    await closing

    expect(saved).toEqual([{ title: 'a' }, { title: 'b' }])
  })
})

describe('second reading pass', () => {
  it('tells a plain Enter from the Enter that confirms an IME candidate', async () => {
    const { isPlainEnter } = await import('../src/implicit-submit')

    expect(isPlainEnter({ key: 'Enter' })).toBe(true)
    expect(isPlainEnter({ key: 'Enter', isComposing: true })).toBe(false)
    expect(isPlainEnter({ key: 'Enter', keyCode: 229 })).toBe(false)
    expect(isPlainEnter({ key: 'a' })).toBe(false)
  })

  it('writes an unread count in the given digits and caps it', async () => {
    const { unreadCountLabel } = await import('../src/notifications')
    const arabic = (value: number) => new Intl.NumberFormat('ar-EG').format(value)

    expect(unreadCountLabel(7, String)).toBe('7')
    expect(unreadCountLabel(120, String)).toBe('99+')
    expect(unreadCountLabel(120, arabic)).toBe('٩٩+')
  })
})

describe('0.2.8: expired pages and request time limits', () => {
  it('gives a background request up after the panel time limit', async () => {
    const { requestJson, setRequestTimeout, RequestTimeoutError } = await import('../src/http')
    const { resolveRequestErrorNotification } = await import('../src/error-notifications')
    const original = globalThis.fetch

    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })) as typeof fetch

    try {
      setRequestTimeout(0.05)
      const error = await requestJson('/slow').catch((failure: unknown) => failure)

      expect(error).toBeInstanceOf(RequestTimeoutError)
      expect(
        resolveRequestErrorNotification(
          error,
          undefined,
          (_key, _replacements, fallback) => fallback ?? '',
        )?.title,
      ).toBe('The request took too long.')

      // No limit: by default, when asked for one request, and for a file being sent.
      setRequestTimeout(null)
      const controller = new AbortController()
      const pending = requestJson('/slow', { signal: controller.signal }).catch(
        (failure: unknown) => failure,
      )
      await new Promise((resolve) => setTimeout(resolve, 120))
      controller.abort()

      expect(await pending).not.toBeInstanceOf(RequestTimeoutError)
    } finally {
      setRequestTimeout(null)
      globalThis.fetch = original
    }
  })

  it('asks before reloading an expired page only while a form on screen has unsaved changes', async () => {
    const { reloadExpiredPage, unsavedWork } = await import('../src/http')
    const { installExpiredPageNotice, RELOAD_EXPIRED_PAGE_EVENT } =
      await import('../src/error-notifications')
    const shown: Array<{ id: string; actions?: Array<{ dispatch?: { event: string } }> }> = []
    const form = { isDirty: true }
    const remove = installExpiredPageNotice(
      (notification) => shown.push(notification),
      (_key, _replacements, fallback) => fallback ?? '',
    )

    try {
      unsavedWork.add(form)
      reloadExpiredPage()

      expect(shown).toHaveLength(1)
      expect(shown[0]?.id).toBe('alfakit-page-expired')
      expect(shown[0]?.actions?.[0]?.dispatch?.event).toBe(RELOAD_EXPIRED_PAGE_EVENT)
    } finally {
      unsavedWork.delete(form)
      remove()
    }
  })

  it('counts a form as on screen only while something renders it', async () => {
    const { FormStore } = await import('../src/form')
    const { hasUnsavedWork } = await import('../src/http')
    const form = new FormStore({ components: [], state: { title: '' } } as never, {} as never)

    form.setValue('title', 'Draft')
    expect(hasUnsavedWork()).toBe(false)

    const stop = form.subscribe(() => undefined)
    expect(hasUnsavedWork()).toBe(true)

    stop()
    expect(hasUnsavedWork()).toBe(false)
  })
})

describe('translator', () => {
  it('tells its listeners when the language changes, and only then', async () => {
    const { Translator } = await import('../src/i18n')
    const translator = new Translator({ hello: 'Hello' }, 'en')
    let calls = 0
    const stop = translator.subscribe(() => calls++)

    translator.setTranslations({ hello: 'Hello' })
    translator.setLocale('en')
    expect(calls).toBe(0)

    translator.setTranslations({ hello: 'مرحبا' })
    translator.setLocale('ar')
    expect(calls).toBe(1)
    expect(translator.getVersion()).toBe(1)
    expect(translator.t('hello')).toBe('مرحبا')

    stop()
    translator.setLocale('en')
    expect(calls).toBe(1)
  })
})

describe('form store lifecycle', () => {
  it('works again when it is rendered after destroy()', async () => {
    const { FormStore } = await import('../src/form')
    const original = globalThis.fetch
    const calls: string[] = []

    globalThis.fetch = (async (url: string) => {
      calls.push(String(url))

      return new Response(JSON.stringify({ components: [], state: { title: 'A' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    try {
      const field = {
        type: 'TextInput',
        name: 'title',
        statePath: 'title',
        live: { onBlur: true, debounce: null },
      }
      const form = new FormStore(
        { components: [field], state: { title: '' } } as never,
        {
          token: 't',
          component: 'form',
          refreshUrl: '/refresh',
        } as never,
      )

      let stop = form.subscribe(() => undefined)
      // The form is hidden for a moment: listeners go, effect cleanups run.
      stop()
      form.destroy()
      // And shown again with the same store.
      stop = form.subscribe(() => undefined)

      form.setValue('title', 'A')
      form.blur('title')
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(calls).toEqual(['/refresh'])
      stop()
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('visits while an action is posted', () => {
  it('holds a reload until the action visit has finished', async () => {
    const http = await import('../src/http')
    const calls: string[] = []
    let finish: (() => void) | undefined
    const post = vi.spyOn(http.router, 'post').mockImplementation(((
      _url: string,
      _data: unknown,
      options: { onFinish?: (visit: never) => void },
    ) => {
      calls.push('post')
      finish = () => options.onFinish?.({} as never)
    }) as never)
    const visit = vi.spyOn(http.router, 'visit').mockImplementation((() => {
      calls.push('visit')
    }) as never)

    try {
      http.inertiaPost('/action', {})
      http.inertiaVisit('/table?search=a')
      expect(calls).toEqual(['post'])

      finish?.()
      expect(calls).toEqual(['post', 'visit'])

      http.inertiaVisit('/table?search=b')
      expect(calls).toEqual(['post', 'visit', 'visit'])
    } finally {
      post.mockRestore()
      visit.mockRestore()
    }
  })
})
