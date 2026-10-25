import type { RichEditorSchema } from '@alfakit/core'
import {
  clearRichEditorExtensions,
  FormStore,
  registerRichEditorExtensions,
  type SchemaComponent,
} from '@alfakit/core'
import { Mark, type Editor } from '@tiptap/vue-3'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import RichEditorField from '../src/components/fields/RichEditorField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

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
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(RichEditorField, { component })
    },
  })
  const wrapper = mountWithAlfakit(() => h(Form), { attachTo: document.body })
  const editor = () =>
    (document.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)?.editor

  return { store, wrapper, editor }
}

/** The element with this role and accessible name (aria-label), optionally inside `within`. */
function byRole(role: string, name: string, within: ParentNode = document): HTMLElement | null {
  const selector =
    role === 'button'
      ? `button[aria-label="${name}"]`
      : role === 'complementary'
        ? `aside[aria-label="${name}"]`
        : `[role="${role}"][aria-label="${name}"]`

  return within.querySelector<HTMLElement>(selector)
}

function getByRole(role: string, name: string, within: ParentNode = document): HTMLElement {
  const element = byRole(role, name, within)

  if (!element) throw new Error(`No ${role} named "${name}"`)

  return element
}

/** A button by its accessible name: aria-label, else its text. */
function buttonByText(text: string | RegExp, within: ParentNode = document): HTMLElement | null {
  return (
    [...within.querySelectorAll<HTMLElement>('button')].find((button) => {
      const name = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? ''

      return typeof text === 'string' ? name === text : text.test(name)
    }) ?? null
  )
}

async function click(element: Element) {
  ;(element as HTMLElement).click()
  await nextTick()
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
  document.body.innerHTML = ''
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

    await vi.waitFor(() => expect(editor()).toBeDefined())

    const trigger = getByRole('button', 'Headings')
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    let item: HTMLElement | undefined
    await vi.waitFor(() => {
      item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((node) =>
        node.textContent?.includes('Heading 2'),
      )
      expect(item).toBeDefined()
    })
    // The menu must not hand focus back to its trigger after a pick (typing would be lost).
    const triggerFocus = vi.spyOn(trigger, 'focus')
    item!.focus()
    item!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await vi.waitFor(() => expect(editor()!.isActive('heading', { level: 2 })).toBe(true))
    // Typing goes on in the editor: focus doesn't return to the group's trigger.
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(triggerFocus).not.toHaveBeenCalled()
    expect(document.activeElement).not.toBe(trigger)
    expect(editor()!.view.dom.contains(document.activeElement)).toBe(true)
  })

  it('shows a floating toolbar for the selection', async () => {
    const { editor } = renderEditor(
      editorSchema({ floatingToolbars: { paragraph: ['bold', 'italic'] } }),
    )

    await vi.waitFor(() => expect(editor()).toBeDefined())
    expect(byRole('toolbar', 'Selection formatting')).toBeNull()

    editor()!.commands.setTextSelection({ from: 1, to: 6 })
    await nextTick()

    let toolbar: HTMLElement | null = null
    await vi.waitFor(() => {
      toolbar = byRole('toolbar', 'Selection formatting')
      expect(toolbar).not.toBeNull()
    })
    await click(getByRole('button', 'Italic', toolbar!))

    expect(editor()!.getHTML()).toContain('<em>Hello</em>')
  })

  it('makes the toolbar sticky below the configured offset', async () => {
    const { editor } = renderEditor(editorSchema({ stickyToolbar: true, stickyOffset: '5rem' }))

    await vi.waitFor(() => expect(editor()).toBeDefined())

    const toolbar = getByRole('toolbar', 'Formatting')

    expect(toolbar.className).toContain('sticky')
    await vi.waitFor(() => expect(toolbar.style.top).toBe('5rem'))
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

    await vi.waitFor(() => expect(editor()).toBeDefined())

    const panel = getByRole('complementary', 'Custom blocks')

    expect(panel.getAttribute('data-slot')).toBe('rich-editor-panel')
    expect(byRole('group', 'Marketing', panel)).not.toBeNull()
    expect(buttonByText('Divider', panel)).not.toBeNull()
    expect(panel.querySelector('.grid.grid-cols-2')).not.toBeNull()

    const search = panel.querySelector<HTMLInputElement>('input[type="search"]')!
    expect(search.getAttribute('aria-label')).toBe('Search blocks')
    search.value = 'market'
    search.dispatchEvent(new Event('input'))
    await nextTick()

    expect(buttonByText('Divider', panel)).toBeNull()
    expect(buttonByText('Hero', panel)).not.toBeNull()

    // The merge tag button switches panels; a tag click inserts it.
    const toggle = getByRole('button', 'Insert merge tag')
    await click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const tags = getByRole('complementary', 'Merge tags')
    await click(buttonByText(/Full name/, tags)!)

    expect(editor()!.getHTML()).toContain('data-type="mergeTag"')

    await click(getByRole('button', 'Close panel', tags))
    expect(document.querySelector('aside')).toBeNull()
  })

  it('stores the width of resized images and marks minimal block controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ preview: '<p>Preview</p>' }))),
    )

    const { editor, store } = renderEditor(
      editorSchema({
        resizableImages: true,
        minimalCustomBlockControls: true,
        customBlocks: [{ id: 'hero', label: 'Hero', action: action('customBlock:hero') }],
      }),
      '<p><img src="https://example.com/a.png" width="320" height="200"></p><div data-type="customBlock" data-id="hero" data-config="{}"></div>',
    )

    await vi.waitFor(() => expect(editor()).toBeDefined())

    expect(
      document
        .querySelector('[data-slot="rich-editor-custom-block"]')
        ?.hasAttribute('data-minimal'),
    ).toBe(true)

    editor()!.commands.updateAttributes('image', { width: 240 })
    editor()!.commands.setTextSelection(2)
    editor()!.commands.updateAttributes('image', { width: 240 })
    await nextTick()

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

    await vi.waitFor(() => expect(editor()).toBeDefined())
    expect(loader).toHaveBeenCalledTimes(1)

    editor()!.commands.setTextSelection({ from: 1, to: 6 })
    await nextTick()

    await click(getByRole('button', 'Shout'))

    expect(editor()!.getHTML()).toContain('data-shout')
    await vi.waitFor(() =>
      expect(getByRole('button', 'Shout').getAttribute('aria-pressed')).toBe('true'),
    )
  })
})
