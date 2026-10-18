import type { ActionSchema } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import ActionButton from '../src/components/actions/ActionButton.svelte'
import Icon from '../src/lib/Icon.svelte'
import { hasIcon, iconNames, loadIcon, resolveIcon } from '../src/lib/icons'
import { actions } from './mocks'
import { reactiveProps } from './reactive.svelte'
import Wrapper from './Wrapper.svelte'

describe('icons', () => {
  it('loads any Lucide icon by name on demand, including legacy aliases', async () => {
    expect(hasIcon('alarm-clock-check')).toBe(true)
    expect(hasIcon('home')).toBe(true)
    expect(hasIcon('not-an-icon')).toBe(false)
    expect(iconNames().length).toBeGreaterThan(1500)

    expect(resolveIcon('zoom-in')).toBeUndefined()
    expect(await loadIcon('zoom-in')).toBeTypeOf('function')
    expect(resolveIcon('zoom-in')).toBeTypeOf('function')
    expect(await loadIcon('trash-2')).toBeTypeOf('function')
    expect(await loadIcon('not-an-icon')).toBeUndefined()
  })

  it('renders an icon outside the old built-in set once it has loaded', async () => {
    const { container } = render(Icon, { props: { name: 'tractor' } })

    await vi.waitFor(() =>
      expect(container.querySelector('svg[data-icon="tractor"]')).not.toBeNull(),
    )
  })

  it('falls back when the name is unknown', async () => {
    const { container } = render(Icon, { props: { name: 'not-an-icon', fallback: 'circle' } })

    await vi.waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
  })
})

describe('key bindings', () => {
  it('are not re-registered when a reload brings an equal action', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const keydowns = () => add.mock.calls.filter(([type]) => type === 'keydown').length
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined as never)
    const action: ActionSchema = {
      type: 'Action',
      name: 'save',
      label: 'Save',
      hasAction: true,
      keyBindings: ['g'],
    }
    const props = reactiveProps({ action, context: { token: 't' } })

    render(Wrapper, { props: { component: ActionButton, props } })
    await tick()
    const registered = keydowns()

    expect(registered).toBeGreaterThan(0)

    props.action = { ...action, label: 'Save changes' }
    await tick()

    expect(keydowns()).toBe(registered)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Save changes' }),
      expect.anything(),
    )

    props.action = { ...action, keyBindings: ['h'] }
    await tick()

    expect(keydowns()).toBe(registered + 1)

    add.mockRestore()
    trigger.mockRestore()
  })
})
