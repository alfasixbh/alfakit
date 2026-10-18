import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import { IconPickerSearch, iconGridMove, type IconPickerSource } from '../src/icon-picker'
import type { IconPickerResponse } from '../src/schema/icon-picker'

function page(values: string[], pageNumber: number, hasMore: boolean): IconPickerResponse {
  return {
    icons: values.map((value) => ({ value, icon: value === 'mdi-home' ? '<svg></svg>' : value })),
    page: pageNumber,
    hasMore,
    total: 99,
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('iconGridMove', () => {
  it('moves through rows and columns and swaps left and right in RTL', () => {
    expect(iconGridMove(-1, 10, 'ArrowDown', 4)).toBe(0)
    expect(iconGridMove(0, 10, 'ArrowRight', 4)).toBe(1)
    expect(iconGridMove(0, 10, 'ArrowRight', 4, true)).toBe(0)
    expect(iconGridMove(1, 10, 'ArrowRight', 4, true)).toBe(0)
    expect(iconGridMove(1, 10, 'ArrowDown', 4)).toBe(5)
    expect(iconGridMove(8, 10, 'ArrowDown', 4)).toBe(9)
    expect(iconGridMove(2, 10, 'ArrowUp', 4)).toBe(2)
    expect(iconGridMove(6, 10, 'ArrowUp', 4)).toBe(2)
    expect(iconGridMove(6, 10, 'Home', 4)).toBe(0)
    expect(iconGridMove(0, 10, 'End', 4)).toBe(9)
    expect(iconGridMove(0, 10, 'Enter', 4)).toBeNull()
    expect(iconGridMove(-1, 0, 'ArrowDown', 4)).toBe(-1)
  })
})

describe('IconPickerSearch', () => {
  it('loads the first page once, appends pages and remembers previews', async () => {
    const searchIcons = vi
      .fn<IconPickerSource['searchIcons']>()
      .mockResolvedValueOnce(page(['house', 'mdi-home'], 1, true))
      .mockResolvedValueOnce(page(['users'], 2, false))
    const search = new IconPickerSearch({ searchIcons }, 'icon')

    search.open()
    await flush()
    search.open()

    expect(searchIcons).toHaveBeenCalledTimes(1)
    expect(searchIcons.mock.calls[0]?.[1]).toEqual({ search: '', set: null, page: 1 })
    expect(search.state.icons.map((icon) => icon.value)).toEqual(['house', 'mdi-home'])
    expect(search.preview('mdi-home')).toBe('<svg></svg>')

    search.loadMore()
    await flush()

    expect(searchIcons.mock.calls[1]?.[1]).toEqual({ search: '', set: null, page: 2 })
    expect(search.state.icons.map((icon) => icon.value)).toEqual(['house', 'mdi-home', 'users'])
    expect(search.state.hasMore).toBe(false)

    search.loadMore()
    expect(searchIcons).toHaveBeenCalledTimes(2)
  })

  it('debounces searches, filters by set and restarts at page 1', async () => {
    vi.useFakeTimers()
    const searchIcons = vi
      .fn<IconPickerSource['searchIcons']>()
      .mockResolvedValue(page(['a'], 1, false))
    const search = new IconPickerSearch({ searchIcons }, 'icon', { debounce: 100 })

    search.setSearch('ho')
    search.setSearch('home')
    await vi.advanceTimersByTimeAsync(100)

    expect(searchIcons).toHaveBeenCalledTimes(1)
    expect(searchIcons.mock.calls[0]?.[1]).toEqual({ search: 'home', set: null, page: 1 })

    search.setSet('mdi')
    await vi.advanceTimersByTimeAsync(0)

    expect(searchIcons.mock.calls[1]?.[1]).toEqual({ search: 'home', set: 'mdi', page: 1 })
  })

  it('moves the highlight and loads more near the end', async () => {
    const searchIcons = vi
      .fn<IconPickerSource['searchIcons']>()
      .mockResolvedValueOnce(page(['a', 'b', 'c', 'd'], 1, true))
      .mockResolvedValueOnce(page(['e'], 2, false))
    const search = new IconPickerSearch({ searchIcons }, 'icon')

    search.open()
    await flush()

    expect(search.move('ArrowRight', 2)).toBe(0)
    expect(search.move('ArrowDown', 2)).toBe(2)
    await flush()

    expect(searchIcons).toHaveBeenCalledTimes(2)
    expect(search.state.icons).toHaveLength(5)
    expect(search.move('Tab', 2)).toBeNull()
  })

  it('flags failed requests', async () => {
    const search = new IconPickerSearch(
      { searchIcons: vi.fn().mockRejectedValue(new Error('nope')) },
      'icon',
    )

    search.open()
    await flush()

    expect(search.state.error).toBe(true)
    expect(search.state.loading).toBe(false)
  })
})

describe('FormStore.searchIcons', () => {
  it('queries the options endpoint with the context, search, set and page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page(['house'], 2, false)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = new FormStore(
      { components: [], state: {} },
      { token: 'tok', component: 'form', optionsUrl: '/_alfakit/schema/options' },
    )
    const response = await store.searchIcons('icon', { search: 'ho', set: 'mdi', page: 2 })
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')

    expect(response?.icons[0]?.value).toBe('house')
    expect(url.pathname).toBe('/_alfakit/schema/options')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      token: 'tok',
      component: 'form',
      path: 'icon',
      search: 'ho',
      set: 'mdi',
      page: '2',
    })
  })
})
