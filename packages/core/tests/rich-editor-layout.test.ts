import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  allToolbarButtons,
  applyEditorActionResult,
  commandLabel,
  floatingToolbarStyle,
  groupCustomBlocks,
  groupTriggerButton,
  resizableImageAttributes,
  resolveFloatingToolbar,
  resolveStickyOffset,
  stickyCollisionPadding,
  toolbarCommands,
  type FloatingToolbarEditor,
} from '../src/rich-editor-layout'
import {
  clearRichEditorExtensions,
  loadRichEditorExtensions,
  normalizeRichEditorExtensions,
  registerRichEditorExtensions,
} from '../src/rich-editor-plugins'
import { TOOLBAR_COMMANDS, type ToolbarEditor } from '../src/rich-editor-toolbar'

function chainEditor(active: (name: unknown, attributes?: unknown) => boolean = () => false) {
  const calls: unknown[][] = []
  const chain: Record<string, (...args: unknown[]) => unknown> = new Proxy(
    {},
    {
      get: (_target, name: string) =>
        name === 'run'
          ? () => true
          : (...args: unknown[]) => {
              calls.push([name, ...args])

              return chain
            },
    },
  )

  const editor = {
    chain: () => chain,
    isActive: active,
    getAttributes: () => ({ color: '#fff' }),
    state: { selection: { from: 2, to: 5 } },
  }

  return { editor: editor as ToolbarEditor & typeof editor, calls }
}

function selectionEditor(
  path: string[],
  options: { empty?: boolean; node?: string; editable?: boolean } = {},
): FloatingToolbarEditor {
  return {
    isEditable: options.editable ?? true,
    state: {
      selection: {
        from: 3,
        to: options.empty === false ? 6 : 3,
        empty: options.empty ?? true,
        node: options.node ? { type: { name: options.node } } : null,
        $from: {
          depth: path.length,
          node: (depth = path.length) => ({ type: { name: path[depth - 1]! } }),
        },
      },
    },
    view: { coordsAtPos: () => ({ left: 10, top: 100, bottom: 120 }) },
  }
}

afterEach(() => {
  clearRichEditorExtensions()
  vi.restoreAllMocks()
})

describe('toolbar groups', () => {
  it('lists every button of the toolbar, its groups and the floating toolbars', () => {
    expect(
      allToolbarButtons({
        toolbarButtons: ['bold', '|', 'group:0'],
        toolbarButtonGroups: { 'group:0': { label: 'Format', buttons: ['h1', 'h2'] } },
        floatingToolbars: { table: ['tableDelete'], paragraph: ['bold', 'highlight'] },
      }),
    ).toEqual(['bold', 'h1', 'h2', 'tableDelete', 'highlight'])
  })

  it('shows the active button of a group on its trigger', () => {
    const { editor } = chainEditor((name, attributes) => {
      return name === 'heading' && (attributes as { level: number }).level === 2
    })

    expect(groupTriggerButton(['h1', 'h2'], editor, TOOLBAR_COMMANDS)).toBe('h2')
    expect(groupTriggerButton(['h1', 'h2'], null, TOOLBAR_COMMANDS)).toBe('h1')
  })
})

describe('floating toolbars', () => {
  const toolbars = { paragraph: ['bold'], table: ['tableDelete'], image: ['link'] }

  it('shows text toolbars only while text is selected', () => {
    expect(resolveFloatingToolbar(selectionEditor(['paragraph']), toolbars)).toBeNull()
    expect(
      resolveFloatingToolbar(selectionEditor(['paragraph'], { empty: false }), toolbars),
    ).toMatchObject({ node: 'paragraph', buttons: ['bold'] })
  })

  it('climbs to the innermost node with a toolbar', () => {
    expect(
      resolveFloatingToolbar(
        selectionEditor(['table', 'tableRow', 'tableCell', 'paragraph']),
        toolbars,
      ),
    ).toMatchObject({ node: 'table', buttons: ['tableDelete'], coords: { top: 100 } })
  })

  it('uses the toolbar of a selected node and hides when read-only', () => {
    expect(
      resolveFloatingToolbar(selectionEditor(['paragraph'], { node: 'image' }), toolbars),
    ).toMatchObject({ node: 'image' })
    expect(
      resolveFloatingToolbar(selectionEditor(['table'], { editable: false }), toolbars),
    ).toBeNull()
    expect(resolveFloatingToolbar(selectionEditor(['table']), null)).toBeNull()
  })

  it('positions the toolbar above the selection', () => {
    expect(floatingToolbarStyle({ left: 2, top: 50, bottom: 60 })).toEqual({
      left: '8px',
      top: '42px',
      transform: 'translateY(-100%)',
    })
    expect(floatingToolbarStyle(null)).toBeUndefined()
  })
})

describe('sticky offset', () => {
  it('uses the configured offset or the sticky topbar height', () => {
    expect(resolveStickyOffset('5rem')).toBe('5rem')
    expect(resolveStickyOffset(null)).toBe('0px')

    const topbar = document.createElement('header')
    topbar.setAttribute('data-slot', 'topbar')
    topbar.style.position = 'sticky'
    topbar.getBoundingClientRect = () => ({ height: 56 }) as DOMRect
    document.body.append(topbar)

    expect(resolveStickyOffset(undefined)).toBe('56px')
    expect(stickyCollisionPadding()).toEqual({ top: 72, right: 16, bottom: 16, left: 16 })
    topbar.remove()
    expect(stickyCollisionPadding(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
  })
})

describe('custom block panel', () => {
  const action = { type: 'Action', name: 'x' } as never
  const blocks = [
    { id: 'hero', label: 'Hero', group: 'Marketing', action },
    { id: 'divider', label: 'Divider', action },
    { id: 'cta', label: 'Call to action', group: 'Marketing', action },
    { id: 'quote', label: 'Quote', group: 'Content', action },
  ]

  it('lists ungrouped blocks first, then the groups in order', () => {
    expect(
      groupCustomBlocks(blocks).map(({ group, blocks: items }) => [group, items.map((b) => b.id)]),
    ).toEqual([
      [null, ['divider']],
      ['Marketing', ['hero', 'cta']],
      ['Content', ['quote']],
    ])
  })

  it('searches labels and group names', () => {
    expect(groupCustomBlocks(blocks, '  HERO ').flatMap((g) => g.blocks.map((b) => b.id))).toEqual([
      'hero',
    ])
    expect(groupCustomBlocks(blocks, 'market').flatMap((g) => g.blocks.map((b) => b.id))).toEqual([
      'hero',
      'cta',
    ])
    expect(groupCustomBlocks(blocks, 'nothing')).toEqual([])
  })
})

describe('plugin tools', () => {
  it('runs a tool’s commands and shows it pressed while its mark is active', () => {
    const commands = toolbarCommands(
      [
        {
          name: 'highlightColor',
          label: 'Highlight',
          commands: [['toggleMark', 'highlight']],
          active: { name: 'highlight' },
        },
      ],
      { runAction: vi.fn(), editor: () => null },
    )
    const { editor, calls } = chainEditor((name) => name === 'highlight')

    commands.highlightColor!.run(editor, {} as never)

    expect(calls).toEqual([['focus'], ['toggleMark', 'highlight']])
    expect(commands.highlightColor!.active!(editor)).toBe(true)
    expect(commands.bold).toBe(TOOLBAR_COMMANDS.bold)
    expect(commandLabel('highlightColor', commands, (_key, fallback) => `t:${fallback}`)).toBe(
      'Highlight',
    )
    expect(commandLabel('bold', commands, (_key, fallback) => `t:${fallback}`)).toBe('t:Bold')
  })

  it('opens the tool’s action with the selection and applies the returned commands', async () => {
    const { editor, calls } = chainEditor()
    const runAction = vi.fn(async () => ({
      editorCommands: [['setMark', 'highlight', { color: '#ff0' }]],
      editorSelection: { from: 2, to: 5 },
    }))
    const commands = toolbarCommands(
      [
        {
          name: 'color',
          label: 'Color',
          action: { type: 'Action', name: 'color' } as never,
          active: { name: 'highlight' },
        },
      ],
      { runAction, editor: () => editor },
    )

    commands.color!.run(editor, {} as never)
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0))

    expect(runAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'color' }), {
      editorSelection: { from: 2, to: 5 },
      attributes: { color: '#fff' },
    })
    expect(calls).toEqual([
      ['focus'],
      ['setTextSelection', { from: 2, to: 5 }],
      ['setMark', 'highlight', { color: '#ff0' }],
    ])
  })

  it('ignores results that are not commands and prefers registered commands', () => {
    const { editor, calls } = chainEditor()

    expect(applyEditorActionResult(editor, { id: 'x' })).toBe(false)
    expect(applyEditorActionResult(editor, [['toggleBold']])).toBe(true)
    expect(calls).toEqual([['focus'], ['toggleBold']])

    const run = vi.fn()
    const commands = toolbarCommands(
      [{ name: 'shout', label: 'Shout' }],
      { runAction: vi.fn(), editor: () => null },
      { shout: { key: 'shout', label: 'x', run }, extra: { key: 'extra', label: 'Extra', run } },
    )

    expect(commands.shout!.label).toBe('Shout')
    commands.shout!.run(editor, {} as never)
    expect(run).toHaveBeenCalled()
    expect(commands.extra!.label).toBe('Extra')
  })
})

describe('plugin extensions', () => {
  it('loads registered extensions once and merges their commands', async () => {
    const extension = { name: 'callout' }
    const loader = vi.fn(async () => ({
      default: extension,
      commands: { callout: { key: 'callout', label: 'Callout', run: () => {} } },
    }))

    registerRichEditorExtensions({ callout: loader, list: () => [{ name: 'a' }, { name: 'b' }] })

    const first = await loadRichEditorExtensions(['callout', 'list', 'callout'])
    await loadRichEditorExtensions(['callout'])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first.extensions).toEqual([extension, { name: 'a' }, { name: 'b' }])
    expect(Object.keys(first.commands)).toEqual(['callout'])
  })

  it('skips unknown and failing extensions', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    registerRichEditorExtensions({
      broken: () => Promise.reject(new Error('nope')),
    })

    expect(await loadRichEditorExtensions(['missing', 'broken'])).toEqual({
      extensions: [],
      commands: {},
    })
    expect(warn).toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
  })

  it('normalises definitions', () => {
    expect(normalizeRichEditorExtensions({ extensions: { name: 'x' } }).extensions).toEqual([
      { name: 'x' },
    ])
    expect(normalizeRichEditorExtensions(null)).toEqual({ extensions: [], commands: {} })
  })
})

describe('resizable images', () => {
  it('stores the width as whole pixels and never the height', () => {
    const attributes = resizableImageAttributes({ src: {} })
    const img = document.createElement('img')
    img.setAttribute('width', '320.6')
    img.setAttribute('height', '100')

    expect(attributes.width.parseHTML(img)).toBe(320)
    expect(attributes.width.renderHTML({ width: 320.6 })).toEqual({ width: '321' })
    expect(attributes.width.renderHTML({ width: 'abc' })).toEqual({})
    expect(attributes.height.renderHTML()).toEqual({})
    expect(attributes).toHaveProperty('src')
  })
})

describe('minimal custom block controls', () => {
  it('hides the block label visually and floats the controls at the end', async () => {
    const { customBlockNodeConfig } = await import('../src/rich-editor')
    const config = customBlockNodeConfig({
      blocks: [{ id: 'hero', label: 'Hero', action: { type: 'Action', name: 'x' } as never }],
      loadPreview: async () => '<p>Preview</p>',
      onEdit: () => {},
      labels: { edit: 'Edit', remove: 'Remove' },
      minimal: true,
    })
    const view = config.addNodeView()({
      node: { attrs: { id: 'hero', config: {} }, nodeSize: 1, type: 'customBlock' },
      getPos: () => 0,
      editor: {
        isEditable: true,
        view: { dispatch: () => {} },
        state: { tr: { delete: () => ({}) } },
      },
    })

    expect(view.dom.hasAttribute('data-minimal')).toBe(true)
    expect(view.dom.textContent).toContain('Hero')
    const header = view.dom.querySelector('.alfakit-custom-block-header') as HTMLElement
    expect(header.style.position).toBe('absolute')
    expect((header.firstElementChild as HTMLElement).style.position).toBe('absolute')
  })
})
