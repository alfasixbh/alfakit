import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ActionRunner,
  confirmModalClose,
  groupMenuItems,
  guardModalUnload,
  menuActionContext,
  shouldConfirmModalClose,
} from '../src/actions'
import type * as Http from '../src/http'
import type { ActionSchema } from '../src/schema/actions'
import { applyPanelColors, customColorClasses, isCustomColorName } from '../src/theme'

const responses: unknown[] = []
const posts: string[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async () => responses.shift(),
  }
})

vi.mock('@inertiajs/core', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()

  return {
    ...original,
    router: {
      ...(original.router as object),
      post: (url: string) => posts.push(url),
      visit: vi.fn(),
      on: () => () => {},
    },
  }
})

const action: ActionSchema = { type: 'Action', name: 'limited', hasModal: true, hasAction: true }

describe('action lifecycle', () => {
  beforeEach(() => {
    responses.length = 0
    posts.length = 0
  })

  it('does not open a modal that mountUsing() cancelled and shows its notifications', async () => {
    const notify = vi.fn()
    const runner = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })
    runner.setNotificationHandler(notify)
    responses.push({
      cancelled: true,
      notifications: [{ id: '1', title: 'Slow down', status: 'warning' }],
    })

    await runner.trigger(action, { token: 't' })

    expect(runner.state.modals).toEqual([])
    expect(runner.state.loading).toBeNull()
    expect(notify).toHaveBeenCalledWith([{ id: '1', title: 'Slow down', status: 'warning' }])
  })

  it('settles a field action with undefined when its modal is cancelled on mount', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })
    responses.push({ cancelled: true })

    const result = await runner.runField(action, {
      token: 't',
      component: 'field:form::title',
      form: { state: { values: {} } } as never,
    })

    expect(result).toBeUndefined()
    expect(runner.state.modals).toEqual([])
  })

  it('sends postToUrl() actions as a POST request', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

    await runner.trigger(
      { type: 'Action', name: 'lock', url: '/lock', postToUrl: true, hasAction: true },
      { token: 't' },
    )

    expect(posts).toEqual(['/lock'])
  })

  it('asks before closing a dirty modal with unsavedChangesAlert only', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    expect(shouldConfirmModalClose({ unsavedChangesAlert: true }, { isDirty: true })).toBe(true)
    expect(shouldConfirmModalClose({ unsavedChangesAlert: true }, { isDirty: false })).toBe(false)
    expect(shouldConfirmModalClose({}, { isDirty: true })).toBe(false)
    expect(shouldConfirmModalClose({ unsavedChangesAlert: true }, null)).toBe(false)

    expect(confirmModalClose({ unsavedChangesAlert: true }, { isDirty: true }, 'Close?')).toBe(
      false,
    )
    expect(confirm).toHaveBeenCalledWith('Close?')
    expect(confirmModalClose({}, { isDirty: true }, 'Close?')).toBe(true)
    expect(confirm).toHaveBeenCalledTimes(1)

    confirm.mockRestore()
  })

  it('warns before unloading the page while a modal form is dirty', () => {
    const form = { isDirty: false }
    const remove = guardModalUnload({ unsavedChangesAlert: true }, form)

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    form.isDirty = true
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)

    remove()
    const removed = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(removed)
    expect(removed.defaultPrevented).toBe(false)
  })

  it('groups menu entries and builds menu action contexts', () => {
    expect(
      groupMenuItems([{ label: 'a' }, { label: 'b', group: 1 }, { label: 'c', group: 1 }]),
    ).toEqual([
      [{ label: 'a' }],
      [
        { label: 'b', group: 1 },
        { label: 'c', group: 1 },
      ],
    ])
    expect(groupMenuItems([])).toEqual([])
    expect(menuActionContext('tok', 'tenantMenu')).toEqual({
      token: 'tok',
      component: 'tenantMenu',
    })
  })
})

describe('custom colours', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-alfakit-gray')
    document.head.querySelector('style[data-alfakit-colors]')?.remove()
  })

  it('recognises custom colour names', () => {
    expect(isCustomColorName('brand')).toBe(true)
    expect(isCustomColorName('brand-2')).toBe(true)
    expect(isCustomColorName('primary')).toBe(false)
    expect(isCustomColorName('gray')).toBe(false)
    expect(isCustomColorName('#4f46e5')).toBe(false)
    expect(isCustomColorName('oklch(0.5 0.1 200)')).toBe(false)
    expect(isCustomColorName(undefined)).toBe(false)
    expect(customColorClasses('brand', 'alfakit-solid')).toBe('alfakit-solid alfakit-color-brand')
  })

  it('applies the gray flag and the server colour CSS', () => {
    applyPanelColors({ gray: '#71717a', brand: '#4f46e5' }, '.alfakit-color-brand{}')

    expect(document.documentElement.getAttribute('data-alfakit-gray')).toBe('true')
    expect(document.documentElement.style.getPropertyValue('--alfakit-brand')).toBe('#4f46e5')
    expect(document.head.querySelector('style[data-alfakit-colors]')?.textContent).toBe(
      '.alfakit-color-brand{}',
    )

    applyPanelColors({ primary: '#000' }, undefined)

    expect(document.documentElement.hasAttribute('data-alfakit-gray')).toBe(false)
    expect(document.head.querySelector('style[data-alfakit-colors]')).toBeNull()
  })
})
