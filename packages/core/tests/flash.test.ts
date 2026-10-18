import { describe, expect, it } from 'vitest'
import { pageFlash } from '../src/flash'

describe('pageFlash', () => {
  it('reads Inertia 3 page-level flash first', () => {
    const page = {
      props: { flash: { alfakitAction: { name: 'old', status: 'success' } } },
      flash: { alfakitAction: { name: 'save', status: 'success', deselectRecords: true } },
    }

    expect(pageFlash(page).alfakitAction?.name).toBe('save')
  })

  it('falls back to a flash prop and then to an empty object', () => {
    expect(
      pageFlash({ props: { flash: { alfakitNotifications: [] } }, flash: {} }).alfakitNotifications,
    ).toEqual([])
    expect(pageFlash({ props: {} })).toEqual({})
  })
})
