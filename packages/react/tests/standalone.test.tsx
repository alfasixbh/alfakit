import type { StandaloneComponentSchema } from '@alfakit/core'
import { render, screen, within } from '@testing-library/react'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import { AlfakitComponent, AlfakitToaster, configureAlfakit } from '../src/standalone'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

beforeEach(() => {
  // A host application page: no `alfakit` panel prop, the payloads are plain props.
  globalThis.__alfakitPageProps = { form, posts: table, errors: {} }
  // sonner's <Toaster> reads the colour scheme; jsdom has no matchMedia.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

describe('AlfakitComponent (outside panels)', () => {
  it('renders a form from its payload without createAlfakit()', () => {
    render(<AlfakitComponent component={form} className="max-w-xl" />)

    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument()

    const email = screen.getByLabelText(/Email/) as HTMLInputElement
    expect(email.value).toBe('hi@example.com')
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    const root = document.querySelector('[data-slot="standalone"]') as HTMLElement
    expect(root).toHaveClass('max-w-xl')
    expect(root).toHaveAttribute('data-alfakit-component', form.class)
    expect(root).toHaveAttribute('dir', 'ltr')
  })

  it('renders a table with its records and search', () => {
    render(<AlfakitComponent component={table} />)

    const grid = screen.getByRole('table')
    expect(within(grid).getByText('Title')).toBeInTheDocument()
    expect(within(grid).getByText('Alpha')).toBeInTheDocument()
    expect(within(grid).getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('applies per-instance registry overrides over configureAlfakit() defaults', () => {
    configureAlfakit({
      components: { Textarea: () => <div data-testid="global-textarea" /> },
    })

    render(
      <AlfakitComponent
        component={form}
        components={{ TextInput: () => <div data-testid="custom-input" /> }}
      />,
    )

    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    expect(screen.getByTestId('global-textarea')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()

    configureAlfakit({ components: {} })
  })

  it('lets the page render the blocks itself and mounts a toaster once', () => {
    render(
      <>
        <AlfakitToaster />
        <AlfakitComponent component={form}>
          {(blocks, renderBlock) => (
            <section data-testid="custom-layout">{blocks.map(renderBlock)}</section>
          )}
        </AlfakitComponent>
      </>,
    )

    expect(within(screen.getByTestId('custom-layout')).getByLabelText(/Email/)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-sonner-toaster]').length).toBeLessThanOrEqual(1)
  })
})
