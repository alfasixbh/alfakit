import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import {
  customBlockNodeConfig,
  EditorSuggestions,
  filterSuggestionItems,
  findSuggestionMatch,
  mentionNodeConfig,
  mergeTagNodeConfig,
  RichEditorRemote,
  toEditorDocument,
  type SuggestionEditor,
} from '../src/rich-editor'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function fakeEditor(textBefore: string) {
  const inserted: Array<{ range: { from: number; to: number }; content: unknown }> = []
  const chain = {
    focus: () => chain,
    insertContentAt: (range: { from: number; to: number }, content: unknown) => {
      inserted.push({ range, content })

      return chain
    },
    run: () => true,
  }
  const editor: SuggestionEditor = {
    state: {
      selection: {
        from: 10 + textBefore.length,
        empty: true,
        $from: { parentOffset: textBefore.length, parent: { textBetween: () => textBefore } },
      },
    },
    view: { coordsAtPos: () => ({ left: 1, top: 2, bottom: 3 }) },
    chain: () => chain,
  }

  return { editor, inserted }
}

describe('findSuggestionMatch', () => {
  it('finds the trigger and query before the cursor', () => {
    expect(findSuggestionMatch('Hello @ja', ['@', '#'])).toEqual({ trigger: '@', query: 'ja' })
    expect(findSuggestionMatch('@', ['@'])).toEqual({ trigger: '@', query: '' })
    expect(findSuggestionMatch('Dear {{na', ['@', '{{'])).toEqual({ trigger: '{{', query: 'na' })
  })

  it('ignores triggers inside words or followed by spaces', () => {
    expect(findSuggestionMatch('mail@example', ['@'])).toBeNull()
    expect(findSuggestionMatch('@jane doe', ['@'])).toBeNull()
    expect(findSuggestionMatch('no trigger', ['@'])).toBeNull()
  })

  it('filters items by label or id', () => {
    const items = [
      { id: 'php', label: 'PHP' },
      { id: 'js', label: 'JavaScript' },
    ]

    expect(filterSuggestionItems(items, 'java')).toEqual([{ id: 'js', label: 'JavaScript' }])
    expect(filterSuggestionItems(items, '')).toHaveLength(2)
  })
})

describe('EditorSuggestions', () => {
  it('lists static mentions and inserts the selected one', () => {
    const suggestions = new EditorSuggestions({
      mentions: [
        {
          trigger: '#',
          items: [
            { id: 'php', label: 'PHP' },
            { id: 'js', label: 'JavaScript' },
          ],
        },
      ],
      mergeTags: [],
      search: async () => [],
    })
    const { editor, inserted } = fakeEditor('Topic #ja')

    suggestions.update(editor)

    expect(suggestions.state).toMatchObject({
      open: true,
      kind: 'mention',
      query: 'ja',
      items: [{ id: 'js' }],
    })
    expect(suggestions.handleKeyDown({ key: 'Enter' }, editor)).toBe(true)
    expect(inserted[0]).toEqual({
      range: { from: 16, to: 19 },
      content: [
        { type: 'mention', attrs: { id: 'js', label: 'JavaScript', char: '#' } },
        { type: 'text', text: ' ' },
      ],
    })
    expect(suggestions.state.open).toBe(false)
  })

  it('searches the server for searchable mentions, debounced', async () => {
    vi.useFakeTimers()
    const search = vi.fn(async () => [{ id: '5', label: 'Jane' }])
    const suggestions = new EditorSuggestions({
      mentions: [{ trigger: '@', searchable: true, searchDebounce: 100 }],
      mergeTags: [],
      search,
    })

    suggestions.update(fakeEditor('@j').editor)
    suggestions.update(fakeEditor('@ja').editor)

    expect(suggestions.state.loading).toBe(true)
    await vi.advanceTimersByTimeAsync(150)

    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('@', 'ja')
    expect(suggestions.state).toMatchObject({ loading: false, items: [{ id: '5', label: 'Jane' }] })
  })

  it('offers merge tags after {{ and closes on Escape', () => {
    const suggestions = new EditorSuggestions({
      mentions: [],
      mergeTags: [
        { id: 'name', label: 'Name' },
        { id: 'today', label: 'Today' },
      ],
      search: async () => [],
    })
    const { editor, inserted } = fakeEditor('Hi {{na')

    suggestions.update(editor)
    expect(suggestions.state.items).toEqual([{ id: 'name', label: 'Name' }])

    suggestions.select(0, editor)
    expect(inserted[0]?.content).toEqual([{ type: 'mergeTag', attrs: { id: 'name' } }])

    suggestions.update(editor)
    expect(suggestions.handleKeyDown({ key: 'Escape' }, editor)).toBe(true)
    expect(suggestions.state.open).toBe(false)
  })
})

describe('node configurations', () => {
  it('render the stored HTML formats', () => {
    const mention = mentionNodeConfig()
    const mergeTag = mergeTagNodeConfig()
    const block = customBlockNodeConfig({
      blocks: [],
      loadPreview: async () => '',
      onEdit: () => {},
      labels: { edit: 'Edit', remove: 'Remove' },
    })
    const node = (attrs: Record<string, unknown>) => ({ attrs, nodeSize: 1, type: 'x' })

    expect(
      mention.renderHTML({
        node: node({ id: '5', label: 'Jane', char: '@' }),
        HTMLAttributes: { 'data-id': '5' },
      }),
    ).toEqual([
      'span',
      { 'data-id': '5', 'data-type': 'mention', class: 'alfakit-mention' },
      '@Jane',
    ])
    expect(mergeTag.renderText({ node: node({ id: 'name' }) })).toBe('{{ name }}')

    const config = block.addAttributes().config
    const element = document.createElement('div')
    element.setAttribute('data-config', '{"heading":"Hi"}')

    expect(config.parseHTML(element)).toEqual({ heading: 'Hi' })
    expect(config.renderHTML({ config: { heading: 'Hi' } })).toEqual({
      'data-config': '{"heading":"Hi"}',
    })
  })

  it('shows the server preview in the custom block node view', async () => {
    const loadPreview = vi.fn(async () => '<h2>Preview</h2>')
    const onEdit = vi.fn()
    const view = customBlockNodeConfig({
      blocks: [
        {
          id: 'hero',
          label: 'Hero',
          action: { type: 'Action', name: 'customBlock:hero', hasModal: true },
        },
      ],
      loadPreview,
      onEdit,
      labels: { edit: 'Edit block', remove: 'Remove block' },
    }).addNodeView()({
      node: { attrs: { id: 'hero', config: { heading: 'Hi' } }, nodeSize: 1, type: 'customBlock' },
      getPos: () => 4,
      editor: {
        isEditable: true,
        view: { dispatch: () => {} },
        state: { tr: { delete: () => ({}) } },
      },
    })

    await vi.waitFor(() => expect(view.dom.innerHTML).toContain('<h2>Preview</h2>'))
    expect(loadPreview).toHaveBeenCalledWith('hero', { heading: 'Hi' })

    view.dom.querySelector('button')?.click()
    expect(onEdit).toHaveBeenCalledWith({ id: 'hero', config: { heading: 'Hi' }, pos: 4 })
  })
})

describe('RichEditorRemote', () => {
  it('searches mentions and caches block previews through the options endpoint', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(decodeURIComponent(url))

        return new Response(
          JSON.stringify(
            url.includes('mention')
              ? { options: [{ value: '5', label: 'Jane' }] }
              : { preview: '<p>P</p>' },
          ),
          { status: 200 },
        )
      }),
    )

    const form = new FormStore(
      { components: [], state: {} },
      { token: 't', component: 'form', optionsUrl: '/o' },
    )
    const remote = new RichEditorRemote(form, 'content')

    await expect(remote.searchMentions('@', 'ja')).resolves.toEqual([{ id: '5', label: 'Jane' }])
    await expect(remote.preview('hero', { a: 1 })).resolves.toBe('<p>P</p>')
    await remote.preview('hero', { a: 1 })

    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('mention=@')
    expect(urls[1]).toContain('block=hero')
    expect(urls[1]).toContain('config={"a":1}')

    remote.primePreview('hero', { a: 2 }, '<p>Primed</p>')
    await expect(remote.preview('hero', { a: 2 })).resolves.toBe('<p>Primed</p>')
    expect(urls).toHaveLength(2)
  })

  it('reads JSON documents', () => {
    expect(toEditorDocument({ type: 'doc' })).toEqual({ type: 'doc' })
    expect(toEditorDocument('{"type":"doc"}')).toEqual({ type: 'doc' })
    expect(toEditorDocument('<p>x</p>')).toBeNull()
  })
})
