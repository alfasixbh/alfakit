import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import { buildChartConfig } from '../src/chart'
import { FormStore } from '../src/form'
import {
  applyFormRefresh,
  chartFiltersUrl,
  defaultActionContext,
  defaultActionKey,
  formActionsVisible,
  formRefreshFor,
  openDefaultAction,
  registerFormSubmitter,
  shouldResyncForm,
  submitFormById,
  withoutDefaultActionQuery,
} from '../src/page-actions'
import { withDeferredTabBadges } from '../src/resource-tabs'
import type { ActionSchema } from '../src/schema/actions'
import type { PageSchema } from '../src/schema/panel'

const action = (overrides: Partial<ActionSchema> = {}): ActionSchema =>
  ({ type: 'Action', name: 'edit', hasModal: true, ...overrides }) as ActionSchema

const page = (overrides: Partial<PageSchema> = {}): PageSchema =>
  ({
    class: 'App\\ListPosts',
    layout: 'app',
    title: 'Posts',
    content: [],
    token: 'tok',
    ...overrides,
  }) as PageSchema

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('default actions', () => {
  it('builds the context of a table record action', () => {
    expect(
      defaultActionContext(page(), {
        action: action(),
        component: 'table',
        record: 5,
        arguments: { step: 2 },
      }),
    ).toEqual({ token: 'tok', component: 'table', record: 5, arguments: { step: 2 } })

    expect(defaultActionContext(page(), { action: action(), component: 'page' })).toEqual({
      token: 'tok',
      component: 'page',
    })
  })

  it('strips the query keys that open an action, keeping the rest', () => {
    expect(
      withoutDefaultActionQuery(
        '/admin/posts?tableAction=edit&tableActionRecord=1&page=2&defaultActionArguments[step]=3',
      ),
    ).toBe('/admin/posts?page=2')
    expect(withoutDefaultActionQuery('https://app.test/x?defaultAction=a#top')).toBe(
      'https://app.test/x#top',
    )
  })

  it('opens the default action once per page and cleans the URL', () => {
    window.history.replaceState(null, '', '/admin/posts?tableAction=edit&tableActionRecord=1&q=x')
    const trigger = vi.fn()
    const opener = { opened: null as string | null }
    const schema = page({ defaultAction: { action: action(), component: 'table', record: 1 } })

    expect(openDefaultAction(schema, opener, trigger)).toBe(true)
    expect(trigger).toHaveBeenCalledWith(action(), { token: 'tok', component: 'table', record: 1 })
    expect(window.location.search).toBe('?q=x')

    // The page re-rendered after the action ran (redirect back): not opened again.
    expect(openDefaultAction({ ...schema, token: 'new' }, opener, trigger)).toBe(false)
    expect(trigger).toHaveBeenCalledTimes(1)

    // Another page forgets it.
    expect(openDefaultAction(page(), opener, trigger)).toBe(false)
    expect(opener.opened).toBeNull()
    expect(openDefaultAction(schema, opener, trigger)).toBe(true)
  })

  it('keys default actions by page, record and action', () => {
    const schema = page({ defaultAction: { action: action(), component: 'page' } })

    expect(defaultActionKey(schema, '/a')).not.toBe(defaultActionKey(schema, '/b'))
    expect(defaultActionKey(page(), '/a')).toBeNull()
  })
})

describe('form submitters', () => {
  it('submits the form a formId names and lets other actions run normally', () => {
    const submit = vi.fn()
    const off = registerFormSubmitter('form', submit)
    const context = { token: 't', component: 'page' }

    expect(submitFormById(action({ formId: 'form' }), context)).toBe(true)
    expect(submit).toHaveBeenCalledWith(action({ formId: 'form' }), context)
    expect(submitFormById(action(), context)).toBe(false)
    expect(submitFormById(action({ formId: 'other' }), context)).toBe(false)
    // A link with a formId navigates.
    expect(submitFormById(action({ formId: 'form', url: '/x', hasAction: false }), context)).toBe(
      false,
    )

    off()
    expect(submitFormById(action({ formId: 'form' }), context)).toBe(false)
  })

  it('resolves named forms by name', () => {
    const submit = vi.fn()
    const off = registerFormSubmitter('form:customer', submit)

    expect(submitFormById(action({ formId: 'customer' }), { token: 't' })).toBe(true)
    off()
  })

  it('routes runner triggers with a formId to the form', async () => {
    const submit = vi.fn()
    const off = registerFormSubmitter('form', submit)
    const runner = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

    await runner.trigger(action({ name: 'save', formId: 'form', hasModal: false }), { token: 't' })

    expect(submit).toHaveBeenCalledTimes(1)
    off()
  })
})

describe('form refresh', () => {
  it('reads the refresh of one form from the flash', () => {
    const flash = { alfakitFormRefresh: { component: 'form', state: { status: 'published' } } }

    expect(formRefreshFor(flash, 'form')).toEqual({ status: 'published' })
    expect(formRefreshFor(flash, 'form:other')).toBeNull()
    expect(formRefreshFor({}, 'form')).toBeNull()
  })

  it('copies refreshed values without touching other edits', () => {
    const store = new FormStore(
      { components: [], state: { title: 'Old', status: 'draft', meta: { a: 1 } } },
      { token: 't', component: 'form' },
    )

    store.setValue('title', 'Typed')
    store.setValue('status', 'review')
    store.setErrors({ status: 'Invalid' })

    applyFormRefresh(store, { status: 'published', 'meta.a': 2 })

    expect(store.state.values).toEqual({ title: 'Typed', status: 'published', meta: { a: 2 } })
    expect([...store.state.dirty]).toEqual(['title'])
    expect(store.state.errors.status).toBeUndefined()
  })

  it('stops counting the fields below a refreshed path as edited (CMS "Discard changes")', () => {
    const store = new FormStore(
      { components: [], state: { title: 'Live', content: [{ data: { heading: 'Live' } }] } },
      { token: 't', component: 'form' },
    )

    store.setValue('title', 'Draft')
    store.setValue('content.0.data.heading', 'Draft')
    store.setErrors({ 'content.0.data.heading': 'Too long' })

    applyFormRefresh(store, { title: 'Live', content: [{ data: { heading: 'Live' } }] })

    expect(store.isDirty).toBe(false)
    expect(store.getValue('content.0.data.heading')).toBe('Live')
    expect(store.state.errors).toEqual({})
  })
})

describe('wizard form actions', () => {
  it('shows the form buttons on the last step only', () => {
    expect(formActionsVisible({}, { step: 0, count: 3 })).toBe(true)
    expect(formActionsVisible({ wizard: true }, { step: 1, count: 3 })).toBe(false)
    expect(formActionsVisible({ wizard: true }, { step: 2, count: 3 })).toBe(true)
    expect(formActionsVisible({ wizard: true }, null)).toBe(true)
  })
})

describe('chart filters', () => {
  it('writes the widget filters into the query string', () => {
    expect(
      chartFiltersUrl(
        '/admin?chartFilters[orders][range]=week&chartFilters[other][x]=1&page=2',
        'chartFilters',
        'orders',
        { range: 'month', tags: [1, 2], empty: '', on: true },
      ),
    ).toBe(
      '/admin?chartFilters%5Bother%5D%5Bx%5D=1&page=2&chartFilters%5Borders%5D%5Brange%5D=month&chartFilters%5Borders%5D%5Btags%5D%5B%5D=1&chartFilters%5Borders%5D%5Btags%5D%5B%5D=2&chartFilters%5Borders%5D%5Bon%5D=1',
    )
    expect(
      chartFiltersUrl('/admin?chartFilters[orders][range]=week', 'chartFilters', 'orders', null),
    ).toBe('/admin')
  })

  it('paints datasets in the widget colour, keeping a palette for pie charts', () => {
    const resolveColor = (name: string) => `[${name}]`
    const bar = buildChartConfig({
      type: 'bar',
      data: { datasets: [{ data: [1] }, { data: [2] }] },
      rtl: false,
      locale: 'en',
      resolveColor,
      color: 'danger',
    })
    const datasets = bar.data.datasets as Array<Record<string, unknown>>

    expect(datasets[0]!.backgroundColor).toBe('[--destructive]')
    expect(datasets[1]!.borderColor).toBe('[--destructive]')

    const pie = buildChartConfig({
      type: 'pie',
      data: { datasets: [{ data: [1, 2] }] },
      rtl: false,
      locale: 'en',
      resolveColor,
      color: 'info',
    })

    expect((pie.data.datasets as Array<Record<string, unknown>>)[0]!.backgroundColor).toEqual([
      '[--chart-1]',
      '[--chart-2]',
    ])
  })
})

describe('deferred tab badges', () => {
  it('fills deferred badges once they arrived', () => {
    const tabs = [
      { key: 'all', label: 'All', badge: 3 },
      { key: 'open', label: 'Open', badgeDeferred: true },
    ]

    expect(withDeferredTabBadges(tabs, undefined)[1]).toMatchObject({ badgePending: true })
    expect(withDeferredTabBadges(tabs, { open: { badge: 7, badgeColor: 'danger' } })).toEqual([
      { key: 'all', label: 'All', badge: 3 },
      { key: 'open', label: 'Open', badgeDeferred: true, badge: 7, badgeColor: 'danger' },
    ])
    expect(withDeferredTabBadges(tabs, {})[1]!.badge).toBeUndefined()
  })
})

describe('shouldResyncForm', () => {
  it('resyncs a form without edits after another action succeeded', () => {
    const success = { alfakitAction: { name: 'publish', status: 'success' as const } }

    expect(shouldResyncForm(success, { isDirty: false })).toBe(true)
    expect(shouldResyncForm(success, { isDirty: true })).toBe(false)
    expect(
      shouldResyncForm(
        { alfakitAction: { name: 'publish', status: 'halted' } },
        { isDirty: false },
      ),
    ).toBe(false)
    expect(shouldResyncForm({}, { isDirty: false })).toBe(false)
  })
})
