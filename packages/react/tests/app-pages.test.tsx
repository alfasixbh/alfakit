import type { PageSchema } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { PageBlock, PageForm, PageInfolist } from '../src/app/components'
import { usePageForm, usePageMethod, useShortcut } from '../src/app/hooks'
import { FullscreenLayout } from '../src/layouts/fullscreen-layout'
import { Wrapper, panel, setPageProps } from './mocks'

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
    render(
      <Wrapper>
        <PageForm name="customer" />
        <PageInfolist name="summary" />
        <PageBlock name="table:products" fallback={<p>No products table</p>} />
      </Wrapper>,
    )

    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('ada@example.com')
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('No products table')).toBeInTheDocument()
    expect(document.querySelector('[data-block="form:customer"]')).not.toBeNull()
  })

  it('calls a page method with the named form state, loading state and validation errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respond(422, {
          result: null,
          notifications: [],
          message: 'Invalid',
          errors: { sku: ['Unknown SKU'], 'forms.customer.email': ['Taken'] },
        }),
      )
      .mockResolvedValueOnce(respond(200, { result: { total: 3 }, notifications: [] }))
    vi.stubGlobal('fetch', fetchMock)

    function Checkout() {
      const checkout = usePageMethod<{ total: number }, { sku: string }>('checkout', {
        forms: ['customer'],
      })
      const form = usePageForm('customer')

      return (
        <>
          <PageForm name="customer" />
          <button onClick={() => void checkout.call({ sku: 'A-1' })}>Charge</button>
          <p data-testid="loading">{String(checkout.loading)}</p>
          <p data-testid="error">{checkout.errors.sku ?? ''}</p>
          <p data-testid="result">{checkout.result?.total ?? ''}</p>
          <p data-testid="email">{String(form.values.email ?? '')}</p>
        </>
      )
    }

    render(
      <Wrapper>
        <Checkout />
      </Wrapper>,
    )

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('ada@example.com'))

    fireEvent.click(screen.getByText('Charge'))
    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Unknown SKU'))
    expect(screen.getByText('Taken')).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
      token: 'page-token',
      method: 'checkout',
      arguments: { sku: 'A-1' },
      forms: { customer: { email: 'ada@example.com' } },
    })

    fireEvent.click(screen.getByText('Charge'))
    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('3'))
    expect(screen.getByTestId('error').textContent).toBe('')
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('rolls an optimistic update back when the call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(422, { errors: { status: ['No'] } })))

    function Board() {
      const [status, setStatus] = useState('pending')
      const move = usePageMethod('moveOrder', {
        optimistic: () => {
          const before = status
          setStatus('shipped')

          return () => setStatus(before)
        },
      })

      return (
        <button onClick={() => void move.call({ status: 'shipped' })} data-testid="card">
          {status}
        </button>
      )
    }

    render(
      <Wrapper>
        <Board />
      </Wrapper>,
    )

    fireEvent.click(screen.getByTestId('card'))
    expect(screen.getByTestId('card').textContent).toBe('shipped')
    await waitFor(() => expect(screen.getByTestId('card').textContent).toBe('pending'))
  })

  it('runs shortcuts while mounted', () => {
    const handler = vi.fn()

    function Shortcut() {
      useShortcut('f2', handler)

      return null
    }

    const { unmount } = render(<Shortcut />)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))
    })
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('renders the fullscreen layout with the page title and an exit link, without a sidebar', () => {
    const { container } = render(
      <Wrapper>
        <FullscreenLayout page={page}>
          <p>Register</p>
        </FullscreenLayout>
      </Wrapper>,
    )

    expect(container.querySelector('[data-layout="fullscreen"]')).not.toBeNull()
    expect(container.querySelector('[data-sidebar="sidebar"]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Point of sale' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="fullscreen-exit"]')?.getAttribute('href')).toBe(
      '/admin',
    )
    expect(screen.getByText('Register')).toBeInTheDocument()

    const { container: bare } = render(
      <Wrapper>
        <FullscreenLayout page={{ ...page, fullscreen: { header: false } }}>
          <p>Kiosk</p>
        </FullscreenLayout>
      </Wrapper>,
    )

    expect(bare.querySelector('[data-slot="topbar"]')).toBeNull()
  })
})
