import type { FileUploadSchema, SchemaComponent } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import FileUploadField from '../src/components/fields/FileUploadField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
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
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(FileUploadField, { component })
      },
    })
    mountWithAlfakit(() => h(Form), { attachTo: document.body })

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', {
      value: [new File(['manual'], 'manual.txt', { type: 'text/plain' })],
      configurable: true,
    })
    input.dispatchEvent(new Event('change'))

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
})
