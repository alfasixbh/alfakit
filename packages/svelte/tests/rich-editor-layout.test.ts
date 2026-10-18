import {
  clearRichEditorExtensions,
  FormStore,
  registerRichEditorExtensions,
  type RichEditorSchema,
  type SchemaComponent,
} from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { Mark, type Editor } from '@tiptap/core'
import { tick } from 'svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

const action = (name: string) => ({ type: 'Action', name, hasAction: true }) as never

const editorSchema = (extra: Partial<RichEditorSchema> = {}) =>
  ({
    type: 'RichEditor',
    key: 'content',
    name: 'content',
    statePath: 'content',
    label: 'Content',
    toolbarButtons: ['bold'],
    fileAttachments: { disk: 'public', directory: null },
    ...extra,
  }) as RichEditorSchema

async function renderEditor(component: RichEditorSchema, value: unknown = '<p>Hello world</p>') {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })
  const find = () =>
    (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
      ?.editor

  // The editor loads lazily: the first mount of a run can take longer than the default.
  await waitFor(() => expect(find()).toBeDefined(), { timeout: 5000 })

  return { store, editor: () => find()!, ...view }
}

// ProseMirror scrolls the selection into view; jsdom has no layout.
const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList

// Evaluate the lazily loaded editor (Tiptap) once up front so its module cost is not counted
// against the first test's timeout; the field still mounts through its lazy loader.
beforeAll(async () => {
  await import('../src/components/fields/RichEditorField.svelte')
}, 60_000)

beforeAll(() => {
  Element.prototype.getClientRects ??= emptyRects
  Range.prototype.getClientRects ??= emptyRects
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

afterEach(() => {
  clearRichEditorExtensions()
  vi.unstubAllGlobals()
})

describe('RichEditor layout', () => {
  it('collapses grouped buttons into a dropdown', async () => {
    const { editor } = await renderEditor(
      editorSchema({
        toolbarButtons: ['group:0'],
        toolbarButtonGroups: {
          'group:0': { label: 'Headings', buttons: ['h1', 'h2'], textual: true },
        },
      }),
    )

    const trigger = screen.getByRole('button', { name: 'Headings' })
    await fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })

    const item = await screen.findByRole('menuitem', { name: /Heading 2/ })
    await fireEvent.click(item)

    await waitFor(() => expect(editor().isActive('heading', { level: 2 })).toBe(true))
  })

  it('shows a floating toolbar for the selection', async () => {
    const { editor } = await renderEditor(
      editorSchema({ floatingToolbars: { paragraph: ['bold', 'italic'] } }),
    )

    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()

    editor().commands.setTextSelection({ from: 1, to: 6 })
    await tick()

    const toolbar = await screen.findByRole('toolbar', { name: 'Selection formatting' })
    await fireEvent.click(within(toolbar).getByRole('button', { name: 'Italic' }))

    expect(editor().getHTML()).toContain('<em>Hello</em>')
  })

  it('makes the toolbar sticky below the configured offset', async () => {
    await renderEditor(editorSchema({ stickyToolbar: true, stickyOffset: '5rem' }))

    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

    expect(toolbar.className).toContain('sticky')
    await waitFor(() => expect(toolbar.style.top).toBe('5rem'))
  })

  it('opens the custom blocks panel with groups, search and a grid', async () => {
    const { editor } = await renderEditor(
      editorSchema({
        toolbarButtons: ['customBlocks', 'mergeTags'],
        activePanel: 'customBlocks',
        searchableCustomBlocks: true,
        customBlocksGrid: true,
        mergeTags: [{ id: 'name', label: 'Full name' }],
        customBlocks: [
          { id: 'divider', label: 'Divider', action: action('customBlock:divider') },
          { id: 'hero', label: 'Hero', group: 'Marketing', action: action('customBlock:hero') },
        ],
      }),
    )

    const panel = screen.getByRole('complementary', { name: 'Custom blocks' })

    expect(within(panel).getByRole('group', { name: 'Marketing' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Divider' })).toBeInTheDocument()

    await fireEvent.input(within(panel).getByRole('searchbox', { name: 'Search blocks' }), {
      target: { value: 'market' },
    })

    expect(within(panel).queryByRole('button', { name: 'Divider' })).toBeNull()
    expect(within(panel).getByRole('button', { name: 'Hero' })).toBeInTheDocument()

    // The merge tag button switches panels; a tag click inserts it.
    await fireEvent.click(screen.getByRole('button', { name: 'Insert merge tag' }))

    const tags = screen.getByRole('complementary', { name: 'Merge tags' })
    await fireEvent.click(within(tags).getByRole('button', { name: /Full name/ }))

    expect(editor().getHTML()).toContain('data-type="mergeTag"')

    await fireEvent.click(within(tags).getByRole('button', { name: 'Close panel' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('stores the width of resized images and marks minimal block controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ preview: '<p>Preview</p>' }))),
    )

    const { editor, store, container } = await renderEditor(
      editorSchema({
        resizableImages: true,
        minimalCustomBlockControls: true,
        customBlocks: [{ id: 'hero', label: 'Hero', action: action('customBlock:hero') }],
      }),
      '<p><img src="https://example.com/a.png" width="320" height="200"></p><div data-type="customBlock" data-id="hero" data-config="{}"></div>',
    )

    expect(container.querySelector('[data-slot="rich-editor-custom-block"]')).toHaveAttribute(
      'data-minimal',
    )

    editor().commands.updateAttributes('image', { width: 240 })
    editor().commands.setTextSelection(2)
    editor().commands.updateAttributes('image', { width: 240 })
    await tick()

    const html = editor().getHTML()

    expect(html).toMatch(/<img[^>]*width="(320|240)"/)
    expect(html).not.toContain('height=')
    expect(String(store.getValue('content') ?? html)).not.toContain('height=')
  })

  it('loads plugin extensions and runs plugin tools', async () => {
    const loader = vi.fn(async () => ({
      default: Mark.create({
        name: 'shout',
        parseHTML: () => [{ tag: 'strong[data-shout]' }],
        renderHTML: () => ['strong', { 'data-shout': '' }, 0],
      }),
    }))

    registerRichEditorExtensions({ shout: loader })

    const { editor } = await renderEditor(
      editorSchema({
        toolbarButtons: ['shout'],
        extensions: ['shout'],
        editorTools: [
          {
            name: 'shout',
            label: 'Shout',
            commands: [['toggleMark', 'shout']],
            active: { name: 'shout' },
          },
        ],
      }),
    )

    expect(loader).toHaveBeenCalledTimes(1)

    editor().commands.setTextSelection({ from: 1, to: 6 })
    await tick()

    await fireEvent.click(screen.getByRole('button', { name: 'Shout' }))

    expect(editor().getHTML()).toContain('data-shout')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Shout' })).toHaveAttribute('aria-pressed', 'true'),
    )
  })
})
