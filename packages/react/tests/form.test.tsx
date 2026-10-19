import { FormStore, type FormBlock as FormBlockSchema, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormBlock } from '../src/components/form/form-block'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper, actions, setPageProps } from './mocks'

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
  it('renders fields bound to the form store', () => {
    const store = new FormStore(
      { components, state: { title: 'Hello', is_published: false, status: 'draft' } },
      { token: 't', component: 'form' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={store.state.components} />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument()

    const title = screen.getByLabelText(/Title/) as HTMLInputElement
    expect(title.value).toBe('Hello')
    expect(screen.getByText('Keep it short')).toBeInTheDocument()

    fireEvent.change(title, { target: { value: 'Changed' } })
    expect(store.getValue('title')).toBe('Changed')
    expect(store.isDirty).toBe(true)

    fireEvent.click(screen.getByRole('switch'))
    expect(store.getValue('is_published')).toBe(true)

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'live' } })
    expect(store.getValue('status')).toBe('live')
  })

  it('shows validation errors', () => {
    const store = new FormStore({ components, state: {} }, { token: 't', component: 'form' })
    store.setErrors({ title: ['The title is required.'] })

    render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={store.state.components} />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('The title is required.')
    expect(screen.getByLabelText(/Title/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('warns about unknown component types', () => {
    const store = new FormStore(
      { components: [{ type: 'Mystery', key: 'm' }], state: {} },
      { token: 't', component: 'form' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={store.state.components} />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.getByText(/Unknown component type/)).toBeInTheDocument()
  })
})

describe('form block', () => {
  const block = (state: Record<string, unknown>): FormBlockSchema => ({
    type: 'Form',
    key: 'form',
    component: 'form',
    components: [
      {
        type: 'TextInput',
        key: 'title',
        name: 'title',
        statePath: 'title',
        label: 'Title',
        inputType: 'text',
      } as SchemaComponent,
    ],
    state,
    actions: [],
    operation: 'edit',
  })

  it('keeps unsaved input when the same form is reloaded with new props', () => {
    setPageProps({
      page: { class: 'EditPost', layout: 'app', title: 'Edit', content: [], token: 'a', record: 1 },
    })

    const { rerender } = render(
      <Wrapper>
        <FormBlock block={block({ title: 'Hello' })} />
      </Wrapper>,
    )

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Unsaved' } })

    // A table poll / relation-manager reload: new objects and a re-issued token.
    setPageProps({
      page: { class: 'EditPost', layout: 'app', title: 'Edit', content: [], token: 'b', record: 1 },
    })
    rerender(
      <Wrapper>
        <FormBlock block={block({ title: 'Hello' })} />
      </Wrapper>,
    )

    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe('Unsaved')

    // A different record is a different form: start from server state.
    setPageProps({
      page: { class: 'EditPost', layout: 'app', title: 'Edit', content: [], token: 'c', record: 2 },
    })
    rerender(
      <Wrapper>
        <FormBlock block={block({ title: 'Other' })} />
      </Wrapper>,
    )

    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe('Other')
  })
})

describe('form block keyboard submit', () => {
  it('runs the primary action when Enter is pressed in a text field', () => {
    setPageProps({
      page: { class: 'Login', layout: 'auth', title: 'Sign in', content: [], token: 't' },
    })
    const trigger = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)
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

    const { unmount } = render(
      <Wrapper>
        <FormBlock block={block} />
      </Wrapper>,
    )

    // Actions are type="button", so without the handler browsers never submit implicitly.
    fireEvent.keyDown(screen.getByLabelText(/Email/), { key: 'Enter' })
    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'authenticate' }),
      expect.anything(),
      expect.anything(),
    )

    trigger.mockClear()
    fireEvent.keyDown(screen.getByLabelText(/Email/), { key: 'a' })
    expect(trigger).not.toHaveBeenCalled()

    trigger.mockRestore()
    unmount()
  })
})

describe('form block after its own submit', () => {
  const block = (state: Record<string, unknown>): FormBlockSchema => ({
    type: 'Form',
    key: 'form',
    component: 'form',
    components: [
      {
        type: 'TextInput',
        key: 'name',
        name: 'name',
        statePath: 'name',
        label: 'Name',
        inputType: 'text',
      } as SchemaComponent,
    ],
    state,
    actions: [{ type: 'Action', name: 'submit', label: 'Send', hasAction: true }],
    operation: 'create',
  })

  async function submitAndRespond(status: 'success' | 'halted') {
    const { router } = await import('@inertiajs/react')
    const handlers: Record<string, (event: unknown) => void> = {}
    const on = vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      callback: (event: unknown) => void,
    ) => {
      handlers[name] = callback

      return () => {}
    }) as never)
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    setPageProps({
      page: { class: 'Contact', layout: 'auth', title: 'Contact', content: [], token: 't' },
    })
    const { rerender, unmount } = render(
      <Wrapper>
        <FormBlock block={block({ name: null })} />
      </Wrapper>,
    )

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Noor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // The action's visit: the server answers with a fresh (empty) form.
    act(() => handlers.start?.({ detail: { visit: { id: 'v1', method: 'post' } } }))
    rerender(
      <Wrapper>
        <FormBlock block={block({ name: null })} />
      </Wrapper>,
    )
    act(() =>
      handlers.success?.({
        detail: {
          visitId: 'v1',
          page: { props: {}, flash: { alfakitAction: { name: 'submit', status } } },
        },
      }),
    )
    act(() => handlers.finish?.({ detail: { visit: { id: 'v1' } } }))

    const value = (screen.getByLabelText(/Name/) as HTMLInputElement).value

    on.mockRestore()
    execute.mockRestore()
    unmount()

    return value
  }

  it('refills from the server after a successful submit', async () => {
    expect(await submitAndRespond('success')).toBe('')
  })

  // A rate-limited (or halted) submit saved nothing: the visitor keeps what they typed.
  it('keeps the input when the action was halted', async () => {
    expect(await submitAndRespond('halted')).toBe('Noor')
  })
})

describe('form block after another action', () => {
  const block = (label: string, name: string | null): FormBlockSchema => ({
    type: 'Form',
    key: 'form',
    component: 'form',
    components: [
      {
        type: 'TextInput',
        key: 'name',
        name: 'name',
        statePath: 'name',
        label,
        inputType: 'text',
      } as SchemaComponent,
    ],
    state: { name },
    actions: [{ type: 'Action', name: 'save', label: 'Save', hasAction: true }],
    operation: 'edit',
  })

  // An embedded action (e.g. "Publish" in a field) changed the record the form shows.
  async function runOtherAction(edit: boolean) {
    const { router } = await import('@inertiajs/react')
    const handlers: Record<string, (event: unknown) => void> = {}
    const on = vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      callback: (event: unknown) => void,
    ) => {
      handlers[name] = callback

      return () => {}
    }) as never)

    setPageProps({
      page: { class: 'EditPage', layout: 'auth', title: 'Edit', content: [], token: 't' },
    })
    const { rerender, unmount } = render(
      <Wrapper>
        <FormBlock block={block('Draft', 'Home')} />
      </Wrapper>,
    )

    if (edit) fireEvent.change(screen.getByLabelText(/Draft/), { target: { value: 'Typed' } })

    act(() => handlers.start?.({ detail: { visit: { id: 'v1', method: 'post' } } }))
    act(() =>
      handlers.success?.({
        detail: {
          visitId: 'v1',
          page: { props: {}, flash: { alfakitAction: { name: 'publish', status: 'success' } } },
        },
      }),
    )
    rerender(
      <Wrapper>
        <FormBlock block={block('Published', 'Home')} />
      </Wrapper>,
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    const result = { label: input.labels?.[0]?.textContent ?? '', value: input.value }

    on.mockRestore()
    unmount()

    return result
  }

  it('shows the server state when the form holds no edits', async () => {
    const result = await runOtherAction(false)

    expect(result.label).toContain('Published')
    expect(result.value).toBe('Home')
  })

  it('keeps unsaved edits', async () => {
    const result = await runOtherAction(true)

    expect(result.label).toContain('Draft')
    expect(result.value).toBe('Typed')
  })
})
