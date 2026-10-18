import { FormStore, type FormBlock as FormBlockSchema, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

const components: SchemaComponent[] = [
  {
    type: 'Section',
    key: 'main',
    heading: 'Details',
    columns: { default: 1, lg: 2 },
    schema: [
      {
        type: 'TextInput',
        key: 'title',
        name: 'title',
        statePath: 'title',
        label: 'Title',
        inputType: 'text',
        required: true,
        helperText: 'Keep it short',
      },
      {
        type: 'Toggle',
        key: 'is_published',
        name: 'is_published',
        statePath: 'is_published',
        label: 'Published',
        inline: true,
      },
      {
        type: 'Select',
        key: 'status',
        name: 'status',
        statePath: 'status',
        label: 'Status',
        native: true,
        selectablePlaceholder: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'live', label: 'Live' },
        ],
      },
    ],
  } as SchemaComponent,
]

describe('schema renderer + fields', () => {
  it('renders fields bound to the form store', async () => {
    const store = new FormStore(
      { components, state: { title: 'Hello', is_published: false, status: 'draft' } },
      { token: 't', component: 'form' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument()

    const title = screen.getByLabelText(/Title/) as HTMLInputElement
    expect(title.value).toBe('Hello')
    // Same markup as React: no whitespace between the label and the required asterisk.
    expect(document.querySelector('label[for="alfakit-title"]')?.textContent?.trim()).toBe('Title*')
    expect(screen.getByText('Keep it short')).toBeInTheDocument()

    await fireEvent.input(title, { target: { value: 'Changed' } })
    expect(store.getValue('title')).toBe('Changed')
    expect(store.isDirty).toBe(true)

    await fireEvent.click(screen.getByRole('switch'))
    expect(store.getValue('is_published')).toBe(true)

    await fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'live' } })
    expect(store.getValue('status')).toBe('live')
  })

  it('shows validation errors', () => {
    const store = new FormStore({ components, state: {} }, { token: 't', component: 'form' })
    store.setErrors({ title: ['The title is required.'] })

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    expect(screen.getByRole('alert')).toHaveTextContent('The title is required.')
    expect(screen.getByLabelText(/Title/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('warns about unknown component types', () => {
    const store = new FormStore(
      { components: [{ type: 'Mystery', key: 'm' }], state: {} },
      { token: 't', component: 'form' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    expect(screen.getByText(/Unknown component type/)).toBeInTheDocument()
  })
})

describe('form block keyboard submit', () => {
  it('runs the primary action when Enter is pressed in a text field', async () => {
    const { default: FormBlock } = await import('../src/components/form/FormBlock.svelte')
    const { actions, setPageProps } = await import('./mocks')

    setPageProps({
      page: { class: 'Login', layout: 'auth', title: 'Sign in', content: [], token: 't' },
    })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)
    const block: FormBlockSchema = {
      type: 'Form',
      key: 'form',
      component: 'form',
      components: [
        {
          type: 'TextInput',
          key: 'email',
          name: 'email',
          statePath: 'email',
          label: 'Email',
          inputType: 'email',
        } as SchemaComponent,
      ],
      state: { email: '' },
      actions: [{ type: 'Action', name: 'authenticate', label: 'Sign in', hasAction: true }],
      operation: 'create',
    }

    const { unmount } = render(Wrapper, { props: { component: FormBlock, props: { block } } })

    // Actions are type="button", so without the handler browsers never submit implicitly.
    await fireEvent.keyDown(screen.getByLabelText(/Email/), { key: 'Enter' })
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'authenticate' }),
      expect.anything(),
      expect.anything(),
    )

    execute.mockRestore()
    unmount()
  })
})
