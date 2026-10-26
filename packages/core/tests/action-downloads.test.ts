import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import { fieldActionContext } from '../src/field-actions'
import { FormStore } from '../src/form'
import type * as Http from '../src/http'
import type { ActionSchema } from '../src/schema/actions'
import type { SchemaComponent } from '../src/schema/components'

/*
 * W-V5-02 / W-F-08: a handler that returns a file is answered with a signed, one-time link
 * (`alfakitAction.download` after an Inertia visit, `download` in a field action's JSON);
 * the runner opens it so the browser saves the file.
 */

const posts: Array<{ success: (props: Record<string, unknown>) => void }> = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    inertiaPost: (
      _url: string,
      _data: Record<string, unknown>,
      options: { onSuccess?: (page: { props: Record<string, unknown> }) => void },
    ) => {
      posts.push({ success: (props) => options.onSuccess?.({ props }) })
    },
  }
})

const exportAction: ActionSchema = { type: 'Action', name: 'export', hasAction: true }
const url = 'http://localhost/admin/_alfakit/actions/download/abc?signature=x'

function clickedLinks(): HTMLAnchorElement[] {
  const clicked: HTMLAnchorElement[] = []

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this)
  })

  return clicked
}

describe('action downloads', () => {
  beforeEach(() => {
    posts.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens the download link flashed after an Inertia visit and still reports success', () => {
    const clicked = clickedLinks()
    const onSuccess = vi.fn()
    const runner = new ActionRunner({
      endpoints: { action: '/actions', modal: '/modal' },
      onSuccess,
    })

    runner.execute(exportAction, { token: 't', component: 'table' })
    posts[0]?.success({
      flash: { alfakitAction: { name: 'export', status: 'success', download: url } },
    })

    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.href).toBe(url)
    expect(clicked[0]?.hasAttribute('download')).toBe(true)
    // The temporary link is gone again.
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('opens nothing for a run without a file', () => {
    const clicked = clickedLinks()
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    runner.execute(exportAction, { token: 't', component: 'table' })
    posts[0]?.success({ flash: { alfakitAction: { name: 'export', status: 'success' } } })

    expect(clicked).toHaveLength(0)
  })

  it('opens the download link of a field action', async () => {
    const clicked = clickedLinks()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ status: 'success', download: url }), { status: 200 }),
      ),
    )

    const slug = {
      type: 'TextInput',
      key: 'slug',
      name: 'slug',
      statePath: 'slug',
      inputType: 'text',
    } as SchemaComponent
    const form = new FormStore({ components: [slug], state: {} }, { token: 't', component: 'form' })
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    await runner.runField(exportAction, fieldActionContext({ token: 't', form, key: 'slug' }))

    expect(clicked.map((link) => link.href)).toEqual([url])
  })
})
