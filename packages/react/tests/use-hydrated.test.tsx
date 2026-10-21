import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useHydrated } from '../src/hooks/use-hydrated'

function Probe() {
  return <span data-testid="hydrated">{String(useHydrated())}</span>
}

describe('useHydrated()', () => {
  it('is false in server markup and true once mounted in the browser', () => {
    expect(renderToString(<Probe />)).toContain('>false<')

    render(<Probe />)
    expect(screen.getByTestId('hydrated')).toHaveTextContent('true')
  })
})
