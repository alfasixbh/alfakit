import { FormStore, type FileUploadSchema, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FileUploadHarness from './FileUploadHarness.svelte'
import Wrapper from './Wrapper.svelte'

afterEach(() => {
  vi.unstubAllGlobals()
})

const component = {
  type: 'FileUpload',
  key: 'manual',
  name: 'manual',
  statePath: 'manual',
  label: 'Manual',
  multiple: false,
  deletable: true,
  panelLayout: 'compact',
  files: [],
} as unknown as FileUploadSchema

describe('FileUpload while uploading', () => {
  it('holds a submit back until the upload completes, then sends its key', async () => {
    let finish: (() => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = () =>
            resolve(
              new Response(JSON.stringify({ key: 'tmp:manual', name: 'manual.txt', size: 6 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = new FormStore(
      { components: [component as SchemaComponent], state: { manual: null } },
      { token: 't', component: 'form' },
    )
    const { container } = render(Wrapper, {
      props: { component: FileUploadHarness, props: { store, component } },
    })

    await fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['manual'], 'manual.txt', { type: 'text/plain' })] },
    })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(store.hasPendingUploads).toBe(true)

    // Save is clicked while the file is still uploading: it waits instead of dropping it.
    const submitted: unknown[] = []
    store.whenSettled(() => submitted.push(store.getValue('manual')))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(submitted).toEqual([])

    finish?.()

    await vi.waitFor(() => expect(submitted).toEqual(['tmp:manual']))
    expect(store.hasPendingUploads).toBe(false)
  })

  it('stops a submit when the upload fails, until the file is removed', async () => {
    let fail: (() => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          fail = () =>
            resolve(
              new Response(
                JSON.stringify({ message: 'Maximum execution time of 30 seconds exceeded' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } },
              ),
            )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = new FormStore(
      { components: [component as SchemaComponent], state: { manual: null } },
      { token: 't', component: 'form' },
    )
    const { container } = render(Wrapper, {
      props: { component: FileUploadHarness, props: { store, component } },
    })

    await fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['manual'], 'manual.txt', { type: 'text/plain' })] },
    })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    // Save is clicked while the file uploads, and the upload then fails.
    const submitted: unknown[] = []
    let blocked = 0
    store.whenSettled(
      () => submitted.push(store.getValue('manual')),
      () => blocked++,
    )
    fail?.()

    // The form isn't saved without the file: the field says why.
    await vi.waitFor(() => expect(blocked).toBe(1))
    expect(submitted).toEqual([])
    expect(store.getError('manual')).toMatch(/upload it again/)

    const removeButton = await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>('button[aria-label*="manual.txt"]')
      expect(button).not.toBeNull()

      return button!
    })
    await fireEvent.click(removeButton)

    // Once the failed file is removed, saving goes ahead without it.
    store.whenSettled(() => submitted.push(store.getValue('manual')))
    expect(submitted).toEqual([null])
  })
})
