import { FormStore, type IconPickerResponse, type IconPickerSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormHarness from './FormHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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

function response(values: string[], hasMore = false, page = 1): IconPickerResponse {
  return {
    icons: values.map((value) => ({
      value,
      icon: value.startsWith('mdi-') ? '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' : value,
    })),
    page,
    hasMore,
    total: values.length,
  }
}

function renderPicker(component: IconPickerSchema, state: Record<string, unknown>) {
  const store = new FormStore({ components: [component], state }, { token: 't', component: 'form' })
  const searchIcons = vi
    .spyOn(store, 'searchIcons')
    .mockResolvedValue(response(['house', 'users', 'mdi-home']))
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, searchIcons, ...view }
}

/** The trigger once the picker's code has loaded (the placeholder's is disabled). */
async function loadedTrigger(): Promise<HTMLButtonElement> {
  await waitFor(
    () =>
      expect(
        document.querySelector('[data-slot="icon-picker-trigger"]:not([aria-busy])'),
      ).not.toBeNull(),
    { timeout: 5000 },
  )

  return document.querySelector<HTMLButtonElement>('[data-slot="icon-picker-trigger"]')!
}

async function options(): Promise<HTMLElement[]> {
  return within(await screen.findByRole('listbox')).findAllByRole('option')
}

// Compile the lazily loaded picker up front so `loadedTrigger()` doesn't time out.
beforeAll(async () => {
  await import('../src/components/fields/IconPickerField.svelte')
}, 60_000)

describe('IconPicker', () => {
  it('renders the selection named by the label and the value, then loads the picker', async () => {
    renderPicker(
      { ...field, selected: { value: 'mdi-home', icon: '<svg viewBox="0 0 1 1"></svg>' } },
      { icon: 'mdi-home' },
    )

    const trigger = await loadedTrigger()

    expect(trigger).toHaveAccessibleName('Icon mdi-home')
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
  })

  it('searches on the server and picks an icon with the keyboard', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: null })

    await fireEvent.click(await loadedTrigger())

    expect((await options()).map((option) => option.getAttribute('aria-label'))).toEqual([
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

    await fireEvent.keyDown(input, { key: 'ArrowRight' })
    await fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', (await options())[2]!.id)

    await fireEvent.keyDown(input, { key: 'Enter' })
    expect(store.getValue('icon')).toBe('mdi-home')
    await tick()
    expect(document.querySelector('[data-slot="icon-picker-value"] svg')).not.toBeNull()
  })

  it('swaps left and right in RTL', async () => {
    setPageProps({
      alfakit: { ...panel, localization: { ...panel.localization, direction: 'rtl' } },
    })
    renderPicker(field, { icon: null })

    await fireEvent.click(await loadedTrigger())
    const icons = await options()
    const input = screen.getByRole('combobox', { name: 'Search icons' })

    await fireEvent.keyDown(input, { key: 'ArrowLeft' })
    await fireEvent.keyDown(input, { key: 'ArrowLeft' })
    expect(input).toHaveAttribute('aria-activedescendant', icons[1]!.id)

    await fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(input).toHaveAttribute('aria-activedescendant', icons[0]!.id)

    setPageProps({ alfakit: panel })
  })

  it('filters by set, loads more, clicks an option and clears the value', async () => {
    const { store, searchIcons } = renderPicker(field, { icon: 'house' })
    searchIcons.mockResolvedValueOnce(response(['house', 'users'], true))

    await fireEvent.click(await loadedTrigger())
    expect((await options())[0]).toHaveAttribute('aria-selected', 'true')

    searchIcons.mockResolvedValueOnce(response(['bell'], false, 2))
    await fireEvent.click(screen.getByRole('button', { name: 'Load more icons' }))
    await waitFor(async () => expect(await options()).toHaveLength(3))
    expect(searchIcons).toHaveBeenLastCalledWith(
      'icon',
      { search: '', set: null, page: 2 },
      expect.anything(),
    )

    await fireEvent.change(screen.getByRole('combobox', { name: 'Icon set' }), {
      target: { value: 'mdi' },
    })
    expect(searchIcons).toHaveBeenLastCalledWith(
      'icon',
      { search: '', set: 'mdi', page: 1 },
      expect.anything(),
    )

    await fireEvent.click((await options())[1]!)
    expect(store.getValue('icon')).toBe('users')

    await fireEvent.click(screen.getByRole('button', { name: 'Clear icon' }))
    expect(store.getValue('icon')).toBeNull()
  })

  it('accepts custom svg without drawing it unsanitised', async () => {
    const { store } = renderPicker({ ...field, allowCustomSvg: true }, { icon: null })

    await fireEvent.click(await loadedTrigger())
    await options()

    await fireEvent.input(screen.getByLabelText('Paste SVG markup'), {
      target: { value: '<svg viewBox="0 0 1 1"><path d="M9 9"/></svg>' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Use SVG' }))

    expect(store.getValue('icon')).toBe('<svg viewBox="0 0 1 1"><path d="M9 9"/></svg>')
    await tick()
    expect(screen.getByText('Custom SVG')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="icon-picker-value"] path[d="M9 9"]')).toBeNull()
  })

  it('stays locked when read-only', async () => {
    renderPicker({ ...field, readOnly: true }, { icon: 'house' })

    expect(await loadedTrigger()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Clear icon' })).toBeNull()
  })
})
