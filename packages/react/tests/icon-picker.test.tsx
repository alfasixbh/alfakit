import { FormStore, type IconPickerResponse, type IconPickerSchema } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IconPickerField } from '../src/components/fields/icon-picker'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

const field: IconPickerSchema = {
  type: 'IconPicker',
  key: 'icon',
  name: 'icon',
  statePath: 'icon',
  label: 'Icon',
  sets: [
    { key: 'lucide', label: 'Lucide' },
    { key: 'mdi', label: 'Material Design Icons' },
  ],
  searchable: true,
  gridColumns: 2,
  previewSize: 'md',
}

function response(values: string[], hasMore = false): IconPickerResponse {
  return {
    icons: values.map((value) => ({
      value,
      icon: value.startsWith('mdi-') ? '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' : value,
    })),
    page: 1,
    hasMore,
    total: values.length,
  }
}

/** The icons of the grid (the set filter's `<option>`s are options too). */
async function gridOptions(): Promise<HTMLElement[]> {
  return within(await screen.findByRole('listbox')).findAllByRole('option')
}

function renderPicker(component: IconPickerSchema, state: Record<string, unknown>) {
  const store = new FormStore({ components: [component], state }, { token: 't', component: 'form' })
  const searchIcons = vi
    .spyOn(store, 'searchIcons')
    .mockResolvedValue(response(['house', 'users', 'mdi-home']))

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <IconPickerField component={component} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, searchIcons, ...view }
}

describe('IconPicker', () => {
  it('shows the server-rendered selection and the placeholder', () => {
    const { unmount } = renderPicker(
      { ...field, selected: { value: 'mdi-home', icon: '<svg viewBox="0 0 1 1"></svg>' } },
      { icon: 'mdi-home' },
    )

    expect(screen.getByRole('button', { name: /mdi-home/ })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
    unmount()

    renderPicker({ ...field, placeholder: 'Pick one' }, { icon: null })
    expect(screen.getByText('Pick one')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear icon' })).toBeNull()
  })

  it('searches on the server and picks an icon with the keyboard', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: null })

    fireEvent.click(screen.getByRole('button', { name: /Choose an icon/ }))

    const options = await gridOptions()
    expect(options.map((option) => option.getAttribute('aria-label'))).toEqual([
      'house',
      'users',
      'mdi-home',
    ])
    expect(searchIcons).toHaveBeenCalledWith(
      'icon',
      { search: '', set: null, page: 1 },
      expect.anything(),
    )

    const input = screen.getByRole('combobox', { name: 'Search icons' })

    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', options[2]!.id)

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(store.getValue('icon')).toBe('mdi-home')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

    // The pick is drawn from the result's SVG.
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
  })

  it('filters by set, clicks an option and clears the value', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: 'house' })

    fireEvent.click(screen.getByRole('button', { name: /house/ }))
    await gridOptions()

    fireEvent.change(screen.getByRole('combobox', { name: 'Icon set' }), {
      target: { value: 'mdi' },
    })
    await waitFor(() =>
      expect(searchIcons).toHaveBeenLastCalledWith(
        'icon',
        { search: '', set: 'mdi', page: 1 },
        expect.anything(),
      ),
    )

    expect(screen.getByRole('option', { name: 'house' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'users' }))
    expect(store.getValue('icon')).toBe('users')

    fireEvent.click(screen.getByRole('button', { name: 'Clear icon' }))
    expect(store.getValue('icon')).toBeNull()
  })

  it('loads more icons and accepts custom svg when allowed', async () => {
    const { store, searchIcons } = renderPicker({ ...field, allowCustomSvg: true }, { icon: null })
    searchIcons.mockResolvedValueOnce(response(['star', 'heart'], true))

    fireEvent.click(screen.getByRole('button', { name: /Choose an icon/ }))
    await gridOptions()

    searchIcons.mockResolvedValueOnce({ ...response(['bell']), page: 2 })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load more icons' }))
    })

    expect(searchIcons).toHaveBeenLastCalledWith(
      'icon',
      { search: '', set: null, page: 2 },
      expect.anything(),
    )
    expect(await gridOptions()).toHaveLength(3)

    fireEvent.change(screen.getByLabelText('Paste SVG markup'), {
      target: { value: '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use SVG' }))

    expect(store.getValue('icon')).toBe('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>')
    // Unsanitised markup is never drawn: a generic glyph and "Custom SVG" instead.
    expect(screen.getByRole('button', { name: /Custom SVG/ })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="icon-picker-value"] path[d="M0 0"]')).toBeNull()
  })

  it('stays closed when read-only', () => {
    renderPicker({ ...field, readOnly: true }, { icon: 'house' })

    expect(screen.getByRole('button', { name: /house/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Clear icon' })).toBeNull()
  })
})
