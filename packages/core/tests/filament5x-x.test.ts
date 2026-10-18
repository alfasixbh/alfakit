import { describe, expect, it } from 'vitest'
import {
  flexLayoutClasses,
  listTabIds,
  tabKeyTarget,
  withoutDefaultActionQuery,
  wizardRequestedStepIndex,
} from '../src'

describe('Flex::alignment()', () => {
  it('adds the main-axis alignment class', () => {
    expect(flexLayoutClasses({ from: 'md', alignment: 'center' })).toContain('justify-center')
    expect(flexLayoutClasses({ from: 'md', alignment: 'justify' })).toContain('justify-between')
    expect(flexLayoutClasses({ from: 'md' })).not.toContain('justify-')
  })
})

describe('Wizard::goToStep()', () => {
  const steps = [{ key: 'cart' }, { key: 'payment' }, { key: 'review' }]

  it('moves to a known step', () => {
    expect(wizardRequestedStepIndex(steps, { step: 'cart', id: '1' }, 2, false)).toBe(0)
    expect(wizardRequestedStepIndex(steps, { step: 'review', id: '1' }, 0, true)).toBe(2)
  })

  it('ignores unknown steps, missing requests and forward jumps of non-skippable wizards', () => {
    expect(wizardRequestedStepIndex(steps, undefined, 0)).toBeNull()
    expect(wizardRequestedStepIndex(steps, { step: 'missing', id: '1' }, 0, true)).toBeNull()
    expect(wizardRequestedStepIndex(steps, { step: 'review', id: '1' }, 0, false)).toBeNull()
  })
})

describe('list tabs keyboard', () => {
  it('moves focus with arrows, wrapping, Home and End', () => {
    expect(tabKeyTarget('ArrowRight', 0, 3)).toBe(1)
    expect(tabKeyTarget('ArrowRight', 2, 3)).toBe(0)
    expect(tabKeyTarget('ArrowLeft', 0, 3)).toBe(2)
    expect(tabKeyTarget('Home', 2, 3)).toBe(0)
    expect(tabKeyTarget('End', 0, 3)).toBe(2)
    expect(tabKeyTarget('Enter', 0, 3)).toBeNull()
  })

  it('follows the reading direction in RTL and uses up/down for vertical tabs', () => {
    expect(tabKeyTarget('ArrowLeft', 0, 3, 'rtl')).toBe(1)
    expect(tabKeyTarget('ArrowRight', 0, 3, 'rtl')).toBe(2)
    expect(tabKeyTarget('ArrowDown', 0, 3, 'ltr', 'vertical')).toBe(1)
    expect(tabKeyTarget('ArrowRight', 0, 3, 'ltr', 'vertical')).toBeNull()
  })

  it('builds ids that link tabs and the panel', () => {
    expect(listTabIds('t1', 'all posts')).toEqual({ tab: 't1-tab-all-posts', panel: 't1-panel' })
  })
})

describe('Filament deep links', () => {
  it('removes ?action= keys once the action opened', () => {
    expect(
      withoutDefaultActionQuery(
        '/posts?action=send&actionArguments[source]=email&actionComponent=page&q=1',
      ),
    ).toBe('/posts?q=1')
  })
})
