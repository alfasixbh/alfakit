import { describe, expect, it } from 'vitest'
import {
  fileAttachmentError,
  htmlToMarkdown,
  isSafeColor,
  runEditorCommands,
  setTextColor,
  showsTableToolbar,
  TABLE_TOOLBAR_BUTTONS,
  textAlignExtensionConfig,
  textColorMarkConfig,
  TOOLBAR_COMMANDS,
  toolbarButtonLabel,
  type ToolbarContext,
  type ToolbarEditor,
} from '../src/rich-editor-toolbar'

function fakeEditor(active: (name: unknown, attributes?: unknown) => boolean = () => false) {
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
  const editor: ToolbarEditor = {
    chain: () => chain,
    isActive: (name, attributes) => active(name, attributes),
    getAttributes: () => ({}),
  }

  return { editor, calls }
}

const context: ToolbarContext = {
  prompt: () => null,
  pickImage: () => undefined,
  togglePanel: () => undefined,
  t: (_key, fallback) => fallback,
}

describe('toolbar commands', () => {
  it('runs each button through a focused chain', () => {
    const { editor, calls } = fakeEditor()

    TOOLBAR_COMMANDS.superscript!.run(editor, context)
    TOOLBAR_COMMANDS.clearFormatting!.run(editor, context)
    TOOLBAR_COMMANDS.table!.run(editor, context)
    TOOLBAR_COMMANDS.tableAddRowAfter!.run(editor, context)

    expect(calls).toEqual([
      ['focus'],
      ['toggleMark', 'superscript'],
      ['focus'],
      ['unsetAllMarks'],
      ['clearNodes'],
      ['focus'],
      ['insertTable', { rows: 3, cols: 3, withHeaderRow: true }],
      ['focus'],
      ['addRowAfter'],
    ])
  })

  it('toggles logical alignment on paragraphs and headings', () => {
    const { editor, calls } = fakeEditor()
    TOOLBAR_COMMANDS.alignEnd!.run(editor, context)

    expect(calls).toEqual([
      ['focus'],
      ['updateAttributes', 'paragraph', { textAlign: 'end' }],
      ['updateAttributes', 'heading', { textAlign: 'end' }],
    ])

    const active = fakeEditor(
      (name) => typeof name === 'object' && (name as { textAlign?: string }).textAlign === 'end',
    )
    TOOLBAR_COMMANDS.alignEnd!.run(active.editor, context)

    expect(active.calls[1]).toEqual(['updateAttributes', 'paragraph', { textAlign: null }])
    expect(TOOLBAR_COMMANDS.alignEnd!.active!(active.editor)).toBe(true)
  })

  it('inserts a collapsible section with a translated summary', () => {
    const { editor, calls } = fakeEditor()
    TOOLBAR_COMMANDS.details!.run(editor, { ...context, t: () => 'Résumé' })

    expect(calls[1]![1]).toMatchObject({
      type: 'details',
      content: [
        { type: 'detailsSummary', content: [{ type: 'text', text: 'Résumé' }] },
        { type: 'detailsContent' },
      ],
    })
  })

  it('opens the colour palette and sets or removes colours', () => {
    const panels: string[] = []
    const { editor, calls } = fakeEditor()

    TOOLBAR_COMMANDS.textColor!.run(editor, {
      ...context,
      togglePanel: (panel) => panels.push(panel),
    })
    setTextColor(editor, '#dc2626')
    setTextColor(editor, null)

    expect(panels).toEqual(['textColor'])
    expect(calls).toEqual([
      ['focus'],
      ['setMark', 'textColor', { color: '#dc2626' }],
      ['focus'],
      ['unsetMark', 'textColor'],
    ])
  })

  it('returns false when the editor lacks a command', () => {
    const editor: ToolbarEditor = {
      chain: () => ({ focus: () => ({}) }),
      isActive: () => false,
      getAttributes: () => ({}),
    }

    expect(runEditorCommands(editor, [['insertTable']])).toBe(false)
  })

  it('labels buttons with translation keys and English fallbacks', () => {
    const keys: string[] = []
    const t = (key: string, fallback: string) => {
      keys.push(key)

      return fallback
    }

    expect(toolbarButtonLabel('tableMergeCells', t)).toBe('Merge cells')
    expect(toolbarButtonLabel('alignStart', t)).toBe('Align to start')
    expect(keys).toEqual(['editor.table_merge_cells', 'editor.align_start'])
    expect(TABLE_TOOLBAR_BUTTONS.every((name) => TOOLBAR_COMMANDS[name])).toBe(true)
  })

  it('shows the table row only with a table button and the cursor in a table', () => {
    const inTable = fakeEditor((name) => name === 'table').editor

    expect(showsTableToolbar(['table'], inTable)).toBe(true)
    expect(showsTableToolbar(['bold'], inTable)).toBe(false)
    expect(showsTableToolbar(['table'], fakeEditor().editor)).toBe(false)
    expect(showsTableToolbar(['table'], null)).toBe(false)
  })
})

describe('marks and attributes', () => {
  it('stores text colours as data-color plus a colour style, refusing unsafe values', () => {
    const color = textColorMarkConfig().addAttributes().color
    const span = document.createElement('span')
    span.setAttribute('data-color', 'red;background:url(x)')

    expect(color.renderHTML({ color: '#2563eb' })).toEqual({
      'data-color': '#2563eb',
      style: 'color: #2563eb',
    })
    expect(color.renderHTML({ color: 'url(x)' })).toEqual({})
    expect(color.parseHTML(span)).toBeNull()
  })

  it('reads and writes logical text alignment only', () => {
    const attribute = textAlignExtensionConfig().addGlobalAttributes()[0]!.attributes.textAlign
    const paragraph = document.createElement('p')
    paragraph.style.textAlign = 'center'

    expect(attribute.parseHTML(paragraph)).toBe('center')
    expect(attribute.renderHTML({ textAlign: 'end' })).toEqual({ style: 'text-align: end' })
    expect(attribute.renderHTML({ textAlign: 'evil; position: fixed' })).toEqual({})
  })

  it('mirrors the server colour check', () => {
    expect(isSafeColor('#fff')).toBe(true)
    expect(isSafeColor('rgb(1, 2, 3)')).toBe(true)
    expect(isSafeColor('var(--x)')).toBe(false)
    expect(isSafeColor('url(x)')).toBe(false)
  })
})

describe('attachments', () => {
  it('checks accepted types and size before uploading', () => {
    const png = { type: 'image/png', size: 2048 }

    expect(fileAttachmentError(png, {})).toBeNull()
    expect(fileAttachmentError(png, { acceptedFileTypes: ['image/jpeg'] })).toBe('invalid_type')
    expect(fileAttachmentError(png, { acceptedFileTypes: ['image/*'], maxSize: 1 })).toBe(
      'too_large',
    )
    expect(
      fileAttachmentError({ type: 'image/svg+xml', size: 1 }, { acceptedFileTypes: ['*/*'] }),
    ).toBe('invalid_type')
    expect(
      fileAttachmentError({ type: 'application/pdf', size: 1 }, { acceptedFileTypes: ['*/*'] }),
    ).toBe('invalid_type')
  })
})

describe('htmlToMarkdown', () => {
  it('converts tables to GitHub tables', () => {
    const html =
      '<table><colgroup><col></colgroup><tbody><tr><th><p>Name</p></th><th><p>Note</p></th></tr>' +
      '<tr><td><p><strong>Jane</strong></p></td><td><p>a | b</p></td></tr><tr><td><p>Solo</p></td></tr></tbody></table>'

    expect(htmlToMarkdown(html)).toBe(
      '| Name | Note |\n| --- | --- |\n| **Jane** | a \\| b |\n| Solo |  |',
    )
  })

  it('keeps nested lists nested, and an ordered list its first number', () => {
    expect(
      htmlToMarkdown(
        '<ul><li><p>one</p><ul><li><p>nested</p><ol><li><p>deep</p></li></ol></li></ul></li><li><p>two</p></li></ul>',
      ),
    ).toBe('- one\n  - nested\n    1. deep\n- two')
    expect(htmlToMarkdown('<ol start="5"><li><p>five</p></li><li><p>six</p></li></ol>')).toBe(
      '5. five\n6. six',
    )
  })

  it('escapes characters the user typed as text', () => {
    expect(htmlToMarkdown('<p>2 * 3 * 4 and snake_case and [a](b)</p>')).toBe(
      '2 \\* 3 \\* 4 and snake\\_case and \\[a\\](b)',
    )
    expect(htmlToMarkdown('<p># not a heading</p><p>1. not a list</p><p>- nor this</p>')).toBe(
      '\\# not a heading\n\n1\\. not a list\n\n\\- nor this',
    )
    // Code is left as typed.
    expect(htmlToMarkdown('<p><code>a_b * c</code></p>')).toBe('`a_b * c`')
  })

  it('keeps hard line breaks and the language of code blocks', () => {
    expect(htmlToMarkdown('<p>line one<br>line two</p>')).toBe('line one  \nline two')
    expect(
      htmlToMarkdown('<pre><code class="language-php">$a_b = 1 * 2;\necho $a_b;</code></pre>'),
    ).toBe('```php\n$a_b = 1 * 2;\necho $a_b;\n```')
  })

  it('keeps the existing conversions', () => {
    expect(
      htmlToMarkdown(
        '<h2>Title</h2><p>A <em>b</em> <s>c</s> <code>d</code> <a href="/x">e</a></p><ul><li><p>one</p></li></ul><h4>Four</h4>',
      ),
    ).toBe('## Title\n\nA *b* ~~c~~ `d` [e](/x)\n\n- one\n\n#### Four')
  })
})

describe('second reading pass', () => {
  it('escapes every paragraph of a table cell, not only the first', () => {
    const markdown = htmlToMarkdown(
      '<table><tr><th><p>Name</p></th></tr><tr><td><p>a</p><p>b * c * d</p></td></tr></table>',
    )

    expect(markdown).toContain('b \\* c \\* d')
  })

  it('removes the whole link when the URL is cleared with the caret inside it', () => {
    const { editor, calls } = fakeEditor()

    TOOLBAR_COMMANDS.link!.run(editor, {
      prompt: () => '',
      pickImage: () => undefined,
      togglePanel: () => undefined,
      t: (_key, fallback) => fallback,
    } as ToolbarContext)

    expect(calls).toEqual([['focus'], ['extendMarkRange', 'link'], ['unsetLink']])
  })
})
