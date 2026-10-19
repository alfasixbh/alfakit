import { FormStore, type FormBlock as FormBlockSchema, type SchemaComponent } from '@alfakit/core'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

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

function renderForm(store: FormStore) {
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return mountWithAlfakit(() => h(Form))
}

describe('schema renderer + fields', () => {
  it('renders fields bound to the form store', async () => {
    const store = new FormStore(
      { components, state: { title: 'Hello', is_published: false, status: 'draft' } },
      { token: 't', component: 'form' },
    )
    const wrapper = renderForm(store)

    expect(wrapper.find('h3').text()).toBe('Details')

    const title = wrapper.find<HTMLInputElement>('input#alfakit-title')
    expect(title.element.value).toBe('Hello')
    expect(wrapper.find('label[for="alfakit-title"]').text()).toContain('Title')
    // Same markup as React: no whitespace between the label and the required asterisk.
    expect(wrapper.find('label[for="alfakit-title"]').element.textContent?.trim()).toBe('Title*')
    expect(wrapper.text()).toContain('Keep it short')

    await title.setValue('Changed')
    expect(store.getValue('title')).toBe('Changed')
    expect(store.isDirty).toBe(true)

    await wrapper.find('[role="switch"]').trigger('click')
    expect(store.getValue('is_published')).toBe(true)

    await wrapper.find<HTMLSelectElement>('select#alfakit-status').setValue('live')
    expect(store.getValue('status')).toBe('live')

    wrapper.unmount()
  })

  it('shows validation errors', () => {
    const store = new FormStore({ components, state: {} }, { token: 't', component: 'form' })
    store.setErrors({ title: ['The title is required.'] })

    const wrapper = renderForm(store)

    expect(wrapper.find('[role="alert"]').text()).toBe('The title is required.')
    expect(wrapper.find('input#alfakit-title').attributes('aria-invalid')).toBe('true')

    wrapper.unmount()
  })

  it('warns about unknown component types', () => {
    const store = new FormStore(
      { components: [{ type: 'Mystery', key: 'm' }], state: {} },
      { token: 't', component: 'form' },
    )
    const wrapper = renderForm(store)

    expect(wrapper.text()).toMatch(/Unknown component type/)

    wrapper.unmount()
  })
})

describe('form block keyboard submit', () => {
  it('runs the primary action when Enter is pressed in a text field', async () => {
    const { default: FormBlock } = await import('../src/components/form/FormBlock.vue')
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

    const wrapper = mountWithAlfakit(() => h(FormBlock, { block }))

    // Actions are type="button", so without the handler browsers never submit implicitly.
    await wrapper.find('input#alfakit-email').trigger('keydown', { key: 'Enter' })
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'authenticate' }),
      expect.anything(),
      expect.anything(),
    )

    execute.mockRestore()
    wrapper.unmount()
  })
})

describe('form block after another action', () => {
  const block = (label: string): FormBlockSchema => ({
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
    state: { name: 'Home' },
    actions: [{ type: 'Action', name: 'save', label: 'Save', hasAction: true }],
    operation: 'edit',
  })

  // An embedded action (e.g. "Publish" in a field) changed the record the form shows.
  async function runOtherAction(edit: boolean) {
    const { default: FormBlock } = await import('../src/components/form/FormBlock.vue')
    const { setPageProps } = await import('./mocks')
    const { router } = await import('@inertiajs/vue3')
    const handlers: Record<string, ((event: unknown) => void)[]> = {}
    const emit = (name: string, event: unknown) =>
      handlers[name]?.forEach((handler) => handler(event))
    const on = vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      callback: (event: unknown) => void,
    ) => {
      ;(handlers[name] ??= []).push(callback)

      return () => {}
    }) as never)

    setPageProps({
      page: { class: 'EditPage', layout: 'auth', title: 'Edit', content: [], token: 't' },
    })
    const current = shallowRef(block('Draft'))
    const wrapper = mountWithAlfakit(() => h(FormBlock, { block: current.value }))

    if (edit) await wrapper.find('input#alfakit-name').setValue('Typed')

    emit('start', { detail: { visit: { id: 'v1', method: 'post' } } })
    emit('success', {
      detail: {
        visitId: 'v1',
        page: { props: {}, flash: { alfakitAction: { name: 'publish', status: 'success' } } },
      },
    })
    current.value = block('Published')
    await nextTick()

    const result = {
      label: wrapper.find('label[for="alfakit-name"]').text(),
      value: (wrapper.find('input#alfakit-name').element as HTMLInputElement).value,
    }

    on.mockRestore()
    wrapper.unmount()

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
