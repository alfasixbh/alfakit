import { selectColumnEmptyMessage } from '../src/table'

describe('select column messages', () => {
  const custom = {
    loadingMessage: 'Fetching',
    searchingMessage: 'Looking',
    noOptionsMessage: 'Nothing here',
    noSearchResultsMessage: 'No match',
  }

  it('uses the column messages for each state', () => {
    expect(
      selectColumnEmptyMessage(custom, { loading: true, search: '', optionCount: 0 }).message,
    ).toBe('Fetching')
    expect(
      selectColumnEmptyMessage(custom, { loading: true, search: 'a', optionCount: 0 }).message,
    ).toBe('Looking')
    expect(
      selectColumnEmptyMessage(custom, { loading: false, search: '', optionCount: 0 }).message,
    ).toBe('Nothing here')
    expect(
      selectColumnEmptyMessage(custom, { loading: false, search: 'a', optionCount: 0 }).message,
    ).toBe('No match')
  })

  it('falls back to translation keys', () => {
    expect(selectColumnEmptyMessage({}, { loading: false, search: 'a', optionCount: 0 })).toEqual({
      message: undefined,
      key: 'no_results',
      fallback: 'No results.',
    })
    expect(selectColumnEmptyMessage({}, { loading: false, search: '', optionCount: 0 }).key).toBe(
      'form.no_options',
    )
    expect(selectColumnEmptyMessage({}, { loading: true, search: 'x', optionCount: 0 }).key).toBe(
      'form.searching',
    )
  })
})
