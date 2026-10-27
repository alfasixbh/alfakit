import { fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { useCloseOnVisit } from '../src/context'

let url = '/admin'

vi.mock('@inertiajs/react', () => ({
  usePage: () => ({ props: globalThis.__alfakitPageProps, url, component: 'Alfakit/Page' }),
}))

function Sheet() {
  const [open, setOpen] = useState(false)

  useCloseOnVisit(useCallback(() => setOpen(false), []))

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {open ? 'open' : 'closed'}
    </button>
  )
}

describe('useCloseOnVisit()', () => {
  it('closes persistent chrome when the page URL changes, not on re-renders', () => {
    const { rerender } = render(<Sheet />)

    fireEvent.click(screen.getByRole('button'))
    // A partial reload (deferred props) re-renders with the same URL: still open.
    rerender(<Sheet />)
    expect(screen.getByRole('button')).toHaveTextContent('open')

    url = '/admin/posts'
    rerender(<Sheet />)
    expect(screen.getByRole('button')).toHaveTextContent('closed')
  })
})
