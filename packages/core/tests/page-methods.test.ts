import type * as InertiaCore from '@inertiajs/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import {
  callPageMethod,
  distributePageFormErrors,
  firstErrors,
  getPageForm,
  optimistic,
  PageMethodError,
  registerPageForm,
} from '../src/page-methods'
import { registerShortcut, runPageMethod, watchPageProps } from '../src/page-runtime'

const { reload, visit } = vi.hoisted(() => ({ reload: vi.fn(), visit: vi.fn() }))

vi.mock('@inertiajs/core', async (importOriginal) => {
  const original = await importOriginal<typeof InertiaCore>()

  return {
    ...original,
    router: {
      ...original.router,
      reload: (options: { onFinish?: () => void }) => {
        reload(options)
        options.onFinish?.()
      },
      visit,
      on: () => () => {},
    },
  }
})

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function customerForm(): FormStore {
  return new FormStore(
    {
      components: [{ type: 'TextInput', key: 'email', statePath: 'email', name: 'email' } as never],
      state: { email: 'ada@example.com' },
    },
    { token: 't', component: 'form:customer' },
  )
}

const runtime = (showToast = vi.fn()) => ({
  token: 'token-1',
  panel: { endpoints: { pageCall: '/call', upload: '/upload' }, errorNotifications: undefined },
  showToast,
  t: (_key: string, _replacements?: Record<string, string | number>, fallback?: string) =>
    fallback ?? '',
})

describe('callPageMethod', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    reload.mockReset()
    visit.mockReset()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('posts the token, method, arguments and the state of named forms', async () => {
    const store = customerForm()
    const unregister = registerPageForm('customer', store)
    fetchMock.mockResolvedValue(respond(200, { result: { id: 7 }, notifications: [] }))

    const response = await callPageMethod<{ id: number }>(
      'checkout',
      { items: [1] },
      { token: 'tok', endpoint: '/call', forms: ['customer', 'missing'] },
    )

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/call')
    expect(JSON.parse(init.body as string)).toEqual({
      token: 'tok',
      method: 'checkout',
      arguments: { items: [1] },
      forms: { customer: { email: 'ada@example.com' } },
    })
    expect(response).toEqual({ result: { id: 7 }, notifications: [], errors: null })

    unregister()
    expect(getPageForm('customer')).toBeUndefined()
  })

  it('uploads files first and sends their temporary keys', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === '/upload'
        ? respond(200, { key: 'tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png' })
        : respond(200, { result: 'ok', notifications: [] }),
    )

    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await callPageMethod(
      'attach',
      { photo: file, nested: [{ file }] },
      {
        token: 'tok',
        endpoint: '/call',
        uploadEndpoint: '/upload',
      },
    )

    expect(fetchMock.mock.calls[0]![0]).toBe('/upload')
    expect(fetchMock.mock.calls[0]![1].body).toBeInstanceOf(FormData)
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body as string).arguments).toEqual({
      photo: 'tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png',
      nested: [{ file: 'tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png' }],
    })
  })

  it('rejects with a PageMethodError and puts form errors on the named form', async () => {
    const store = customerForm()
    const unregister = registerPageForm('customer', store)
    fetchMock.mockResolvedValue(
      respond(422, {
        message: 'Invalid',
        result: null,
        notifications: [],
        errors: { 'forms.customer.email': ['Bad e-mail'], items: ['Required'] },
      }),
    )

    const error = await callPageMethod(
      'checkout',
      {},
      {
        token: 'tok',
        endpoint: '/call',
        forms: ['customer'],
      },
    ).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(PageMethodError)
    expect((error as PageMethodError).isValidation).toBe(true)
    expect((error as PageMethodError).errors.items).toEqual(['Required'])
    expect(store.state.errors).toEqual({ email: ['Bad e-mail'] })
    unregister()
  })
})

describe('runPageMethod', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    reload.mockReset()
    visit.mockReset()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('shows notifications, reloads props and returns the result', async () => {
    const showToast = vi.fn()
    fetchMock.mockResolvedValue(
      respond(200, { result: 3, notifications: [{ id: 'n', title: 'Saved' }], reload: ['cart'] }),
    )

    await expect(runPageMethod('add', { sku: 'A' }, runtime(showToast))).resolves.toBe(3)
    expect(showToast).toHaveBeenCalledWith({ id: 'n', title: 'Saved' })
    expect(reload).toHaveBeenCalledWith(expect.objectContaining({ only: ['cart'] }))
  })

  it('follows redirects', async () => {
    fetchMock.mockResolvedValue(respond(200, { result: null, notifications: [], redirect: '/x' }))

    await runPageMethod('leave', undefined, runtime())
    expect(visit).toHaveBeenCalledWith('/x')
  })

  it('rolls an optimistic change back and toasts the failure', async () => {
    const showToast = vi.fn()
    const rollback = vi.fn()
    fetchMock.mockResolvedValue(respond(500, { message: 'Server Error' }))

    await expect(
      runPageMethod('move', { id: 1 }, runtime(showToast), { optimistic: () => rollback }),
    ).rejects.toBeInstanceOf(PageMethodError)
    expect(rollback).toHaveBeenCalledOnce()
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'danger' }))
  })

  it('shows the server notification of a rate-limited call instead of a generic one', async () => {
    const showToast = vi.fn()
    fetchMock.mockResolvedValue(
      respond(429, { result: null, notifications: [{ id: 'r', title: 'Too many attempts' }] }),
    )

    await expect(runPageMethod('ping', undefined, runtime(showToast))).rejects.toBeInstanceOf(
      PageMethodError,
    )
    expect(showToast).toHaveBeenCalledTimes(1)
    expect(showToast).toHaveBeenCalledWith({ id: 'r', title: 'Too many attempts' })
  })
})

describe('helpers', () => {
  it('optimistic() applies, keeps on success and rolls back on failure', async () => {
    let value = 'a'
    const apply = () => {
      const before = value
      value = 'b'

      return () => {
        value = before
      }
    }

    await optimistic(apply, async () => 'ok')
    expect(value).toBe('b')

    value = 'a'
    await expect(optimistic(apply, () => Promise.reject(new Error('no')))).rejects.toThrow('no')
    expect(value).toBe('a')
  })

  it('distributes form errors and keeps the rest', () => {
    const store = customerForm()
    const unregister = registerPageForm('customer', store)

    expect(
      distributePageFormErrors({ 'forms.customer.email': ['x'], 'forms.other.a': ['y'], b: ['z'] }),
    ).toEqual({ 'forms.other.a': ['y'], b: ['z'] })
    expect(store.state.errors).toEqual({ email: ['x'] })
    expect(firstErrors({ a: ['1', '2'], b: [] })).toEqual({ a: '1' })
    unregister()
  })

  it('registerShortcut ignores plain keys while typing unless allowed', () => {
    const plain = vi.fn()
    const inInputs = vi.fn()
    const offPlain = registerShortcut('/', plain)
    const offEscape = registerShortcut('esc', inInputs, { allowInInputs: true })
    const input = document.createElement('input')
    document.body.append(input)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))

    expect(plain).toHaveBeenCalledTimes(1)
    expect(inInputs).toHaveBeenCalledTimes(1)

    offPlain()
    offEscape()
    input.remove()
  })

  it('watchPageProps polls view data and reloads on Echo events', async () => {
    vi.useFakeTimers()
    reload.mockReset()
    const listeners: Record<string, (payload: unknown) => void> = {}
    const echo = {
      private: () => ({
        listen: (event: string, callback: (payload: unknown) => void) => {
          listeners[event] = callback
        },
        stopListening: vi.fn(),
      }),
    }

    const stop = watchPageProps(['orders'], {
      poll: '5s',
      echo: { channel: 'stores.1', events: ['.OrderUpdated'], echo },
    })

    await vi.advanceTimersByTimeAsync(5000)
    expect(reload).toHaveBeenCalledWith(expect.objectContaining({ only: ['orders'] }))

    reload.mockReset()
    listeners['.OrderUpdated']!({})
    expect(reload).toHaveBeenCalledWith(expect.objectContaining({ only: ['orders'] }))

    stop()
    reload.mockReset()
    await vi.advanceTimersByTimeAsync(10000)
    expect(reload).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
