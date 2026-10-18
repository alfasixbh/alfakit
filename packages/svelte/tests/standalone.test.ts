import type { StandaloneComponentSchema } from '@alfakit/core'
import { render, screen, within } from '@testing-library/svelte'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import { configureAlfakit } from '../src/standalone'
import CustomIcon from './CustomIcon.svelte'
import StandaloneHarness from './StandaloneHarness.svelte'
import StatusBadge from './StatusBadge.svelte'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

beforeEach(() => {
  // A host application page: no `alfakit` panel prop, the payloads are plain props.
  globalThis.__alfakitPageProps = { form, posts: table, errors: {} }
})

describe('AlfakitComponent (outside panels)', () => {
  it('renders a form from its payload without createAlfakit()', async () => {
    render(StandaloneHarness, { props: { component: form, class: 'max-w-xl' } })

    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument()

    const email = (await screen.findByLabelText(/Email/)) as HTMLInputElement
    expect(email.value).toBe('hi@example.com')
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    const root = document.querySelector('[data-slot="standalone"]') as HTMLElement
    expect(root).toHaveClass('max-w-xl')
    expect(root).toHaveAttribute('data-alfakit-component', form.class)
    expect(root).toHaveAttribute('dir', 'ltr')
  })

  it('renders a table with its records and search', () => {
    render(StandaloneHarness, { props: { component: table } })

    const grid = screen.getByRole('table')
    expect(within(grid).getByText('Title')).toBeInTheDocument()
    expect(within(grid).getByText('Alpha')).toBeInTheDocument()
    expect(within(grid).getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('applies per-instance registry overrides over configureAlfakit() defaults', () => {
    configureAlfakit({ components: { Textarea: StatusBadge } })

    render(StandaloneHarness, {
      props: { component: form, components: { TextInput: CustomIcon } },
    })

    // The overrides render in place of the built-in fields (any component will do here).
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Message/)).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="field"]').length).toBe(0)

    configureAlfakit({ components: {} })
  })

  it('lets the page render the blocks itself next to a layout toaster', () => {
    render(StandaloneHarness, { props: { component: form, withToaster: true, customLayout: true } })

    expect(screen.getByTestId('custom-layout')).toHaveTextContent('1 block')
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
  })
})
