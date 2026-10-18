import { describe, expect, it, vi } from 'vitest'
import {
  attachToolbarKeyboard,
  customBlockNodeConfig,
  findAutofocusField,
  findGridContext,
  focusAutofocusField,
  focusMovedItem,
  focusToolbar,
  gridNodeConfigs,
  groupBuilderBlocks,
  isAllowedLinkUrl,
  isToolbarShortcut,
  ItemMoveTracker,
  nextToolbarItem,
  oneTimeCodeDigits,
  OneTimeCodeSubmitter,
  revealAutofocusField,
  RichEditorRemote,
  TOOLBAR_COMMANDS,
  toolbarButtonLabel,
  type SchemaComponent,
} from '../src'

describe('heading and paragraph tools (A7)', () => {
  it('toggles h4–h6 and sets a paragraph', () => {
    const calls: unknown[][] = []
    const chain: Record<string, unknown> = {}

    for (const name of ['focus', 'toggleHeading', 'setParagraph']) {
      chain[name] = (...args: unknown[]) => {
        calls.push([name, ...args])

        return chain
      }
    }
    chain.run = () => true
    const editor = { chain: () => chain, isActive: () => false, getAttributes: () => ({}) }
    const context = {
      prompt: () => null,
      pickImage: () => {},
      togglePanel: () => {},
      t: (_: string, f: string) => f,
    }

    TOOLBAR_COMMANDS.h5!.run(editor, context)
    TOOLBAR_COMMANDS.paragraph!.run(editor, context)

    expect(calls).toEqual([['focus'], ['toggleHeading', { level: 5 }], ['focus'], ['setParagraph']])
    expect(toolbarButtonLabel('h6', (_, fallback) => fallback)).toBe('Heading 6')
    expect(toolbarButtonLabel('paragraph', (_, fallback) => fallback)).toBe('Paragraph')
  })
})

describe('grid column commands (A25)', () => {
  const node = (name: string, children: number) => ({
    type: { name },
    attrs: { columns: children },
    nodeSize: 10,
    childCount: children,
    forEach: (callback: (child: never, offset: number) => void) => {
      for (let i = 0; i < children; i++) {
        callback(
          {
            type: { name: 'gridColumn' },
            attrs: {},
            nodeSize: 4,
            childCount: 1,
            forEach: (cb: (n: never) => void) => cb({ type: { name: 'paragraph' } } as never),
          } as never,
          i * 4,
        )
      }
    },
  })

  it('finds the grid and column around the selection and adds or removes columns', () => {
    const grid = node('grid', 3)
    const column = node('gridColumn', 1)
    const $from = {
      depth: 3,
      node: (depth: number) => [null, grid, column, node('paragraph', 0)][depth] as never,
      before: (depth: number) => [0, 5, 6, 7][depth]!,
    }

    expect(findGridContext($from)?.grid.pos).toBe(5)

    const tr = {
      selection: { $from },
      doc: { resolve: () => null },
      setNodeMarkup: vi.fn(() => tr),
      insert: vi.fn(() => tr),
      delete: vi.fn(() => tr),
      replaceWith: vi.fn(() => tr),
      scrollIntoView: vi.fn(() => tr),
    }
    const editor = { schema: { nodes: { gridColumn: { createAndFill: () => 'column' } } } }
    const commands = gridNodeConfigs()[0]!.addCommands!() as Record<
      string,
      () => (props: never) => boolean
    >

    expect(commands.addGridColumnAfter!()({ tr, dispatch: true, editor } as never)).toBe(true)
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(5, undefined, { columns: 4 })
    expect(tr.insert).toHaveBeenCalledWith(16, 'column')

    expect(commands.deleteGridColumn!()({ tr, dispatch: true, editor } as never)).toBe(true)
    expect(tr.delete).toHaveBeenCalledWith(6, 16)
  })
})

describe('toolbar keyboard navigation (A29)', () => {
  const toolbar = () => {
    document.body.innerHTML = `<div dir="ltr"><div role="toolbar" id="t">
      <button id="a">A</button><button id="b" disabled>B</button><button id="c">C</button><button id="d">D</button>
    </div><div role="toolbar" id="f"><button id="x">X</button></div></div>`

    return document.getElementById('t')!
  }

  it('keeps one tab stop and moves with arrows, Home and End', () => {
    const element = toolbar()
    const onEscape = vi.fn()
    const detach = attachToolbarKeyboard(element, { onEscape })
    const a = document.getElementById('a')!

    expect([...element.querySelectorAll('button')].map((button) => button.tabIndex)).toEqual([
      0, -1, -1, -1,
    ])

    a.focus()
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement?.id).toBe('c')
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    )
    expect(document.activeElement?.id).toBe('d')
    expect(document.getElementById('d')!.tabIndex).toBe(0)
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(onEscape).toHaveBeenCalled()

    detach()
  })

  it('swaps the arrows right to left and jumps between toolbars with Alt+F10', () => {
    const element = toolbar()
    const items = [...element.querySelectorAll<HTMLElement>('button:not(:disabled)')]

    expect(nextToolbarItem(items, items[1]!, 'ArrowRight', true)?.id).toBe('a')
    expect(
      isToolbarShortcut({
        key: 'F10',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true)
    expect(focusToolbar([null, document.getElementById('f'), element])).toBe(true)
    expect(document.activeElement?.id).toBe('x')
  })
})

describe('reordering with buttons (A28, A30)', () => {
  it('handles one move at a time and focuses the moved item', () => {
    document.body.innerHTML = `<ul>
      <li data-index="0"><button data-item-move="up" disabled>u</button><button data-item-move="down">d</button></li>
      <li data-index="1"><button data-item-move="up">u</button><button data-item-move="down" disabled>d</button></li>
    </ul>`
    const tracker = new ItemMoveTracker()

    expect(tracker.begin(1, 0)).toBe(true)
    expect(tracker.begin(0, 1)).toBe(false)
    expect(tracker.finish(document.body)).toBe(true)
    // The first item's up button is disabled: its down button takes the focus.
    expect(document.activeElement).toBe(
      document.querySelector('[data-index="0"] [data-item-move="down"]'),
    )
    expect(focusMovedItem(document.body, 1, 'down')).toBe(true)
    expect(tracker.begin(0, 1)).toBe(true)
  })
})

describe('refocusing the autofocus field (A32)', () => {
  const components = [
    {
      type: 'Wizard',
      key: 'w',
      schema: [
        {
          type: 'Step',
          key: 'one',
          schema: [{ type: 'TextInput', key: 'name', statePath: 'name', autofocus: true }],
        },
        { type: 'Step', key: 'two', schema: [] },
      ],
    },
  ] as unknown as SchemaComponent[]

  it('sends the wizard back to the step holding the field', () => {
    expect(findAutofocusField(components)?.statePath).toBe('name')

    const revealed = revealAutofocusField(components) as unknown as Array<{
      goToStep?: { step: string }
    }>

    expect(revealed[0]!.goToStep?.step).toBe('one')
  })

  it('focuses the field input', () => {
    document.body.innerHTML = '<form id="f"><div data-field="name"><input id="i"></div></form>'

    expect(focusAutofocusField(document.getElementById('f'), components)).toBe(true)
    expect(document.activeElement?.id).toBe('i')
  })
})

describe('OneTimeCodeInput (A26)', () => {
  it('keeps digits only and submits each complete code once', () => {
    expect(oneTimeCodeDigits('12 3-4a5６٧', 6)).toBe('123456')

    const form = { requestSubmit: vi.fn() } as unknown as HTMLFormElement
    const submitter = new OneTimeCodeSubmitter()

    expect(submitter.update('123', 4, form)).toBe(false)
    expect(submitter.update('1234', 4, form)).toBe(true)
    expect(submitter.update('1234', 4, form)).toBe(false)
    submitter.update('123', 4, form)
    expect(submitter.update('1234', 4, form)).toBe(true)
    expect(form.requestSubmit).toHaveBeenCalledTimes(2)
  })
})

describe('link protocols (A23)', () => {
  it('allows relative links and the configured schemes', () => {
    expect(isAllowedLinkUrl('/posts/1')).toBe(true)
    expect(isAllowedLinkUrl('ftp://x')).toBe(false)
    expect(isAllowedLinkUrl('ftp://x', ['ftp'])).toBe(true)
    expect(isAllowedLinkUrl('java\tscript:alert(1)', ['https'])).toBe(false)
  })
})

describe('Builder block groups (A31)', () => {
  it('lists ungrouped blocks first, then each group in order', () => {
    const groups = groupBuilderBlocks([
      { name: 'a', group: 'Media' },
      { name: 'b' },
      { name: 'c', group: 'Content' },
      { name: 'd', group: 'Media' },
    ])

    expect(groups.map((entry) => [entry.group, entry.blocks.map((block) => block.name)])).toEqual([
      [null, ['b']],
      ['Media', ['a', 'd']],
      ['Content', ['c']],
    ])
  })
})

describe('custom block prose previews (A16)', () => {
  it('keeps prose styles off previews unless the block asks for them', async () => {
    const view = (prose: boolean) =>
      customBlockNodeConfig({
        blocks: [
          { id: 'hero', label: 'Hero', action: { type: 'Action', name: 'customBlock:hero' } },
        ],
        loadPreview: async () => ({ html: '<h2>Hi</h2>', prose }),
        onEdit: () => {},
        labels: { edit: 'Edit', remove: 'Remove' },
      }).addNodeView()({
        node: { attrs: { id: 'hero', config: {} }, nodeSize: 1, type: 'customBlock' },
        getPos: () => 0,
        editor: {
          isEditable: true,
          view: { dispatch: () => {} },
          state: { tr: { delete: () => null } },
        },
      })

    const plain = view(false)
    const prose = view(true)

    await vi.waitFor(() => expect(prose.dom.innerHTML).toContain('<h2>Hi</h2>'))
    expect(
      plain.dom
        .querySelector('.alfakit-custom-block-preview')!
        .classList.contains('alfakit-not-prose'),
    ).toBe(true)
    expect(
      prose.dom
        .querySelector('.alfakit-custom-block-preview')!
        .classList.contains('alfakit-not-prose'),
    ).toBe(false)

    const remote = new RichEditorRemote(null, 'content')
    remote.primePreview('hero', {}, '<p>x</p>', true)

    await expect(remote.loadPreview('hero', {})).resolves.toEqual({ html: '<p>x</p>', prose: true })
  })
})
