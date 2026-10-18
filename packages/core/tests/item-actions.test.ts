import { describe, expect, it } from 'vitest'
import {
  addActionJustify,
  itemActionContext,
  reorderedItemKeys,
  resolveItemAction,
  runsItemActionOnServer,
  withItemActionState,
} from '../src/item-actions'

const fallback = { label: 'Delete', icon: 'trash-2', color: 'danger' as const }

describe('item actions', () => {
  it('prefers the item schema, then the field schema, then the fallback', () => {
    const field = {
      itemActions: { delete: { type: 'Action' as const, name: 'delete', label: 'Field' } },
    }
    const item = { itemActions: { delete: null } }

    expect(resolveItemAction('delete', field, item, fallback)).toBeNull()
    expect(resolveItemAction('delete', field, undefined, fallback)?.label).toBe('Field')
    // The server only sends customised actions: the others use the defaults.
    expect(resolveItemAction('clone', field, undefined, fallback)?.label).toBe('Delete')
    expect(resolveItemAction('delete', {}, undefined, fallback)).toMatchObject({
      name: 'delete',
      label: 'Delete',
      icon: 'trash-2',
      color: 'danger',
      variant: 'icon-button',
    })
  })

  it('knows server actions and builds their context and state', () => {
    expect(runsItemActionOnServer({ type: 'Action', name: 'delete', server: true })).toBe(true)
    expect(runsItemActionOnServer(null)).toBe(false)
    expect(itemActionContext({ token: 't', arguments: { a: 1 } }, { item: '2' }).arguments).toEqual(
      {
        a: 1,
        item: '2',
      },
    )
    expect(
      withItemActionState(
        { type: 'Action', name: 'moveUp' },
        { disabled: true, attributes: { 'aria-expanded': 'true' } },
      ),
    ).toMatchObject({ disabled: true, extraAttributes: { 'aria-expanded': 'true' } })
  })

  it('computes reordered keys and the add alignment', () => {
    expect(reorderedItemKeys(3, 0, 2)).toEqual(['1', '2', '0'])
    expect(reorderedItemKeys(3, 0, 5)).toEqual(['0', '1', '2'])
    expect(addActionJustify('center')).toBe('center')
    expect(addActionJustify('end')).toBe('end')
    expect(addActionJustify(undefined)).toBe('start')
  })
})
