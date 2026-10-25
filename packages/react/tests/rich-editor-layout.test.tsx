import type { RichEditorSchema } from '@alfakit/core'
import {
  clearRichEditorExtensions,
  FormStore,
  registerRichEditorExtensions,
  type SchemaComponent,
} from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Mark, type Editor } from '@tiptap/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RichEditorField } from '../src/components/fields/rich-editor'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

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

function renderEditor(component: RichEditorSchema, value: unknown = '<p>Hello world</p>') {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <RichEditorField component={component} />
      </FormProvider>
    </Wrapper>,
  )

  const editor = () =>
    (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
      ?.editor

  return { store, editor, ...view }
}

// ProseMirror scrolls the selection into view; jsdom has no layout.
const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList

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
    const { editor } = renderEditor(
      editorSchema({
        toolbarButtons: ['group:0'],
        toolbarButtonGroups: {
          'group:0': { label: 'Headings', buttons: ['h1', 'h2'], textual: true },
        },
      }),
    )

    await waitFor(() => expect(editor()).toBeDefined())

    const trigger = screen.getByRole('button', { name: 'Headings' })
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })

    const item = await screen.findByRole('menuitem', { name: /Heading 2/ })
    // The menu must not hand focus back to its trigger after a pick (typing would be lost).
    const triggerFocus = vi.spyOn(trigger, 'focus')
    fireEvent.click(item)

    await waitFor(() => expect(editor()!.isActive('heading', { level: 2 })).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(triggerFocus).not.toHaveBeenCalled()
  })

  it('shows a floating toolbar for the selection', async () => {
    const { editor } = renderEditor(
      editorSchema({ floatingToolbars: { paragraph: ['bold', 'italic'] } }),
    )

    await waitFor(() => expect(editor()).toBeDefined())
    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()

    act(() => {
      editor()!.commands.setTextSelection({ from: 1, to: 6 })
    })

    const toolbar = await screen.findByRole('toolbar', { name: 'Selection formatting' })
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Italic' }))

    expect(editor()!.getHTML()).toContain('<em>Hello</em>')
  })

  it('makes the toolbar sticky below the configured offset', async () => {
    const { editor } = renderEditor(editorSchema({ stickyToolbar: true, stickyOffset: '5rem' }))

    await waitFor(() => expect(editor()).toBeDefined())

    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

    expect(toolbar.className).toContain('sticky')
    await waitFor(() => expect(toolbar.style.top).toBe('5rem'))
  })

  it('opens the custom blocks panel with groups, search and a grid', async () => {
    const { editor } = renderEditor(
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

    await waitFor(() => expect(editor()).toBeDefined())

    const panel = screen.getByRole('complementary', { name: 'Custom blocks' })

    expect(within(panel).getByRole('group', { name: 'Marketing' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Divider' })).toBeInTheDocument()

    fireEvent.change(within(panel).getByRole('searchbox', { name: 'Search blocks' }), {
      target: { value: 'market' },
    })

    expect(within(panel).queryByRole('button', { name: 'Divider' })).toBeNull()
    expect(within(panel).getByRole('button', { name: 'Hero' })).toBeInTheDocument()

    // The merge tag button switches panels; a tag click inserts it.
    fireEvent.click(screen.getByRole('button', { name: 'Insert merge tag' }))

    const tags = screen.getByRole('complementary', { name: 'Merge tags' })
    fireEvent.click(within(tags).getByRole('button', { name: /Full name/ }))

    expect(editor()!.getHTML()).toContain('data-type="mergeTag"')

    fireEvent.click(within(tags).getByRole('button', { name: 'Close panel' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('stores the width of resized images and marks minimal block controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ preview: '<p>Preview</p>' }))),
    )

    const { editor, store, container } = renderEditor(
      editorSchema({
        resizableImages: true,
        minimalCustomBlockControls: true,
        customBlocks: [{ id: 'hero', label: 'Hero', action: action('customBlock:hero') }],
      }),
      '<p><img src="https://example.com/a.png" width="320" height="200"></p><div data-type="customBlock" data-id="hero" data-config="{}"></div>',
    )

    await waitFor(() => expect(editor()).toBeDefined())

    expect(container.querySelector('[data-slot="rich-editor-custom-block"]')).toHaveAttribute(
      'data-minimal',
    )

    act(() => {
      editor()!.commands.updateAttributes('image', { width: 240 })
      editor()!.commands.setTextSelection(2)
      editor()!.commands.updateAttributes('image', { width: 240 })
    })

    const html = editor()!.getHTML()

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

    const { editor } = renderEditor(
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

    await waitFor(() => expect(editor()).toBeDefined())
    expect(loader).toHaveBeenCalledTimes(1)

    act(() => {
      editor()!.commands.setTextSelection({ from: 1, to: 6 })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Shout' }))

    expect(editor()!.getHTML()).toContain('data-shout')
    expect(screen.getByRole('button', { name: 'Shout' })).toHaveAttribute('aria-pressed', 'true')
  })
})
