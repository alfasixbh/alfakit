import type { PageSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import AppBlocksHarness from './AppBlocksHarness.svelte'
import AppBoardHarness from './AppBoardHarness.svelte'
import AppCheckoutHarness from './AppCheckoutHarness.svelte'
import AppFullscreenHarness from './AppFullscreenHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const page: PageSchema = {
  class: 'App\\Pages\\Pos',
  layout: 'fullscreen',
  title: 'Point of sale',
  token: 'page-token',
  fullscreen: { header: true, exitUrl: '/admin' },
  content: [
    {
      type: 'Form',
      key: 'form:customer',
      component: 'form:customer',
      components: [
        {
          type: 'TextInput',
          key: 'email',
          name: 'email',
          statePath: 'email',
          label: 'E-mail',
          inputType: 'email',
        },
      ],
      state: { email: 'ada@example.com' },
      actions: [],
    },
    {
      type: 'Infolist',
      key: 'infolist:summary',
      components: [{ type: 'TextEntry', key: 'total', name: 'total', label: 'Total', state: '42' }],
      columns: { default: 1, lg: 1 },
    },
  ] as PageSchema['content'],
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('app page components', () => {
  beforeEach(() => {
    setPageProps({
      alfakit: { ...panel, endpoints: { ...panel.endpoints, pageCall: '/call' } },
      page,
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders named forms and infolists, and a fallback for missing blocks', () => {
    const { container } = render(Wrapper, { props: { component: AppBlocksHarness } })

    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('ada@example.com')
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('No products table')).toBeInTheDocument()
    expect(container.querySelector('[data-block="form:customer"]')).not.toBeNull()
  })

  it("follows the infolist's columns() (W-S1-16)", () => {
    const { container } = render(Wrapper, { props: { component: AppBlocksHarness } })
    const grid = container.querySelector('[data-slot="infolist"] > *')!

    expect(grid.className).toContain('lg:grid-cols-1')
    expect(grid.className).not.toContain('lg:grid-cols-2')
  })

  it('calls a page method with the named form state, loading state and validation errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respond(422, {
          result: null,
          notifications: [],
          errors: { sku: ['Unknown SKU'], 'forms.customer.email': ['Taken'] },
        }),
      )
      .mockResolvedValueOnce(respond(200, { result: { total: 3 }, notifications: [] }))
    vi.stubGlobal('fetch', fetchMock)

    render(Wrapper, { props: { component: AppCheckoutHarness } })
    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('ada@example.com'))

    await fireEvent.click(screen.getByText('Charge'))
    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Unknown SKU'))
    await waitFor(() => expect(screen.getByText('Taken')).toBeInTheDocument())
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
      token: 'page-token',
      method: 'checkout',
      arguments: { sku: 'A-1' },
      forms: { customer: { email: 'ada@example.com' } },
    })

    await fireEvent.click(screen.getByText('Charge'))
    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('3'))
    expect(screen.getByTestId('error').textContent).toBe('')
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('rolls an optimistic update back when the call fails and runs shortcuts while mounted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(422, { errors: { status: ['No'] } })))
    const onShortcut = vi.fn()

    const { unmount } = render(Wrapper, {
      props: { component: AppBoardHarness, props: { onShortcut } },
    })

    await fireEvent.click(screen.getByTestId('card'))
    expect(screen.getByTestId('card').textContent).toBe('shipped')
    await waitFor(() => expect(screen.getByTestId('card').textContent).toBe('pending'))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))
    expect(onShortcut).toHaveBeenCalledTimes(1)
  })

  it('renders the fullscreen layout with the page title and an exit link, without a sidebar', () => {
    const { container } = render(Wrapper, {
      props: { component: AppFullscreenHarness, props: { page } },
    })

    expect(container.querySelector('[data-layout="fullscreen"]')).not.toBeNull()
    expect(container.querySelector('[data-sidebar="sidebar"]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Point of sale' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="fullscreen-exit"]')?.getAttribute('href')).toBe(
      '/admin',
    )
    expect(screen.getByText('Register')).toBeInTheDocument()
  })
})
