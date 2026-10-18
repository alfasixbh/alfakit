<script setup lang="ts">
import type { LoadedRichEditorExtensions, RichEditorPanel, RichEditorSchema } from '@alfakit/core'
import {
  allToolbarButtons,
  attachToolbarKeyboard,
  focusToolbar,
  isToolbarShortcut,
  detailsNodeConfigs,
  gridNodeConfigs,
  leadExtensionConfig,
  linkExtensionOptions,
  smallMarkConfig,
  EditorAttachments,
  fieldIds,
  fileAttachmentError,
  floatingToolbarStyle,
  highlightMarkConfig,
  htmlToMarkdown,
  resizableImageAttributes,
  resizableImageOptions,
  resolveFloatingToolbar,
  resolveStickyOffset,
  setTextColor,
  showsTableToolbar,
  subscriptMarkConfig,
  superscriptMarkConfig,
  TABLE_TOOLBAR_BUTTONS,
  textAlignExtensionConfig,
  textColorMarkConfig,
  toEditorDocument,
  toolbarButtonLabel,
  toolbarCommands,
  panelUploadOptions,
  uploadTemporaryFile,
} from '@alfakit/core'
import { EraserIcon } from '@lucide/vue'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import {
  EditorContent,
  Extension,
  Mark,
  Node,
  useEditor,
  type Editor,
  type Extensions,
} from '@tiptap/vue-3'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useActionRunner, usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import { useRichEditorExtensions } from './rich-editor-extensions'
import RichEditorSidePanel from './RichEditorSidePanel.vue'
import RichEditorSuggestions from './RichEditorSuggestions.vue'
import RichEditorToolbarEntries from './RichEditorToolbarEntries.vue'

type MarkConfig = Parameters<typeof Mark.create>[0]
type NodeConfig = Parameters<typeof Node.create>[0]
type ExtensionConfig = Parameters<typeof Extension.create>[0]

/**
 * Resize handles of `resizableImages()` (Tiptap's node view adds bare `data-resize-handle`
 * elements): round dots on the corners, shown on hover and while the image is selected.
 */
const RESIZE_HANDLE_CLASSES =
  '[&_[data-resize-handle]]:z-10 [&_[data-resize-handle]]:size-3 [&_[data-resize-handle]]:rounded-full [&_[data-resize-handle]]:border-2 [&_[data-resize-handle]]:border-background [&_[data-resize-handle]]:bg-primary [&_[data-resize-handle]]:opacity-0 [&_[data-resize-container]:hover_[data-resize-handle]]:opacity-100 [&_.ProseMirror-selectednode_[data-resize-handle]]:opacity-100 [&_[data-resize-handle=bottom-right]]:cursor-nwse-resize [&_[data-resize-handle=top-left]]:cursor-nwse-resize [&_[data-resize-handle=bottom-left]]:cursor-nesw-resize [&_[data-resize-handle=top-right]]:cursor-nesw-resize'

/** The image extension, with drag handles for `resizableImages()`. */
function imageExtension(resizable: boolean) {
  if (!resizable) return Image

  return Image.extend({
    addAttributes() {
      return resizableImageAttributes(this.parent?.() ?? {})
    },
  }).configure(resizableImageOptions())
}

/** Extensions for the extra toolbar buttons (only those the toolbar uses are loaded). */
function toolbarExtensions(buttons: string[], markdown: boolean): Extensions {
  const has = (...names: string[]) => names.some((name) => buttons.includes(name))
  const extensions: Extensions = []

  if (has('table')) extensions.push(TableKit.configure({ table: { resizable: false } }))
  // Markdown has no syntax for these.
  if (markdown) return extensions

  if (has('highlight')) extensions.push(Mark.create(highlightMarkConfig() as MarkConfig))
  if (has('subscript')) extensions.push(Mark.create(subscriptMarkConfig() as MarkConfig))
  if (has('superscript')) extensions.push(Mark.create(superscriptMarkConfig() as MarkConfig))
  if (has('textColor')) extensions.push(Mark.create(textColorMarkConfig() as MarkConfig))
  if (has('alignStart', 'alignCenter', 'alignEnd', 'alignJustify')) {
    extensions.push(Extension.create(textAlignExtensionConfig() as ExtensionConfig))
  }
  if (has('details')) {
    extensions.push(...detailsNodeConfigs().map((config) => Node.create(config as NodeConfig)))
  }
  if (has('small')) extensions.push(Mark.create(smallMarkConfig() as MarkConfig))
  if (has('lead')) extensions.push(Extension.create(leadExtensionConfig() as ExtensionConfig))
  if (has('grid', 'gridDelete', 'gridAddColumnBefore', 'gridAddColumnAfter', 'gridDeleteColumn')) {
    extensions.push(...gridNodeConfigs().map((config) => Node.create(config as NodeConfig)))
  }

  return extensions
}

const props = defineProps<{ component: RichEditorSchema; plugins: LoadedRichEditorExtensions }>()
const t = useT()
const panel = usePanel()
const runner = useActionRunner()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<unknown>(
  () => props.component,
)
const fileInput = ref<HTMLInputElement | null>(null)
const isMarkdown = computed(() => props.component.type === 'MarkdownEditor')
const editable = computed(() => !disabled.value && !readOnly.value)
// Uploaded images preview from a local URL but are stored by their `tmp:` key.
const attachments = new EditorAttachments()
const isJson = computed(() => Boolean(props.component.json) && !isMarkdown.value)
// The editor's live instance, for the custom block node views and suggestions.
const liveEditor = shallowRef<Editor | undefined>()
const rich = useRichEditorExtensions(() => props.component, liveEditor)
// The open toolbar panel (the text colour palette).
const openPanel = ref<'textColor' | null>(null)
// The open side panel (custom blocks or merge tags).
const initialSidePanel = (): RichEditorPanel | null => {
  const initial = props.component.activePanel ?? null

  if (initial === 'customBlocks') return props.component.customBlocks?.length ? initial : null
  if (initial === 'mergeTags') return props.component.mergeTags?.length ? initial : null

  return null
}
const sidePanel = ref<RichEditorPanel | null>(initialSidePanel())
const attachmentError = ref<string | null>(null)
// Bumped on every transaction so active states and the table row follow the cursor.
const selectionTick = ref(0)
const stickyTop = ref<string | null>(null)
const sticky = computed(() =>
  Boolean(props.component.stickyToolbar || props.component.stickyPanels),
)

const updateStickyTop = () => {
  stickyTop.value = sticky.value ? resolveStickyOffset(props.component.stickyOffset) : null
}

onMounted(updateStickyTop)
watch([sticky, () => props.component.stickyOffset], updateStickyTop)

// Built-in buttons, plugin tools and commands of plugin JavaScript extensions.
const commands = computed(() =>
  toolbarCommands(
    props.component.editorTools,
    {
      runAction: (tool, args) =>
        tool.action
          ? runner.runField(tool.action, { ...rich.context.value, arguments: args })
          : Promise.resolve(undefined),
      editor: () => liveEditor.value ?? null,
    },
    props.plugins.commands,
  ),
)

// Field state ↔ editor content: HTML, Markdown (loaded from the server's HTML) or a
// Tiptap JSON document. `tmp:` upload keys become local preview URLs and back.
const stateToContent = (state: unknown): string | Record<string, unknown> => {
  if (isJson.value) {
    const document = toEditorDocument(state)

    return document ? JSON.parse(attachments.toEditor(JSON.stringify(document))) : ''
  }

  return attachments.toEditor(
    ((isMarkdown.value
      ? typeof props.component.html === 'string'
        ? props.component.html
        : null
      : state) as string | null) ?? '',
  )
}
const editorToState = (instance: Pick<Editor, 'isEmpty' | 'getJSON' | 'getHTML'>): unknown => {
  if (instance.isEmpty) return null
  if (isJson.value) return JSON.parse(attachments.toState(JSON.stringify(instance.getJSON())))

  const html = instance.getHTML()

  return attachments.toState(isMarkdown.value ? htmlToMarkdown(html) : html)
}

onBeforeUnmount(() => attachments.destroy())

// Keyboard access to the toolbars (roving tabindex, arrows, Escape, Alt+F10).
type ToolbarSlot = 'main' | 'table' | 'floating'
const toolbarElements: Record<ToolbarSlot, { element: HTMLElement; detach: () => void } | null> = {
  main: null,
  table: null,
  floating: null,
}
const toolbars = () => [
  toolbarElements.floating?.element,
  toolbarElements.main?.element,
  toolbarElements.table?.element,
]
const setToolbar = (slot: ToolbarSlot, element: unknown) => {
  const current = toolbarElements[slot]

  if (current?.element === element) return

  current?.detach()
  toolbarElements[slot] =
    element instanceof HTMLElement
      ? {
          element,
          detach: attachToolbarKeyboard(element, {
            onEscape: () => liveEditor.value?.commands.focus(),
            toolbars,
          }),
        }
      : null
}

onBeforeUnmount(() => {
  for (const slot of ['main', 'table', 'floating'] as const) setToolbar(slot, null)
})

const editor = useEditor({
  extensions: [
    StarterKit.configure({ link: false }),
    Link.configure(linkExtensionOptions(props.component.linkProtocols)),
    imageExtension(Boolean(props.component.resizableImages) && !isMarkdown.value),
    Placeholder.configure({ placeholder: props.component.placeholder ?? '' }),
    ...toolbarExtensions(allToolbarButtons(props.component), isMarkdown.value),
    ...(isMarkdown.value ? [] : rich.extensions),
    ...(isMarkdown.value ? [] : (props.plugins.extensions as Extensions)),
  ],
  // Markdown is loaded from the server's HTML rendering of it, never parsed as HTML.
  content: stateToContent(value.value),
  editable: editable.value,
  editorProps: {
    // The mention / merge tag popup takes the arrow, Enter, Tab and Escape keys.
    handleKeyDown: (_view, event) => {
      // Alt+F10: into the floating toolbar, else the main one.
      if (isToolbarShortcut(event)) return focusToolbar(toolbars())

      return liveEditor.value ? rich.suggestions.handleKeyDown(event, liveEditor.value) : false
    },
    // ProseMirror reads its DOM attributes on every view update, so they follow `aria`.
    attributes: () => ({
      class: cn(
        'alfakit-prose min-h-32 px-3 py-2 text-sm outline-none',
        props.component.resizableImages && RESIZE_HANDLE_CLASSES,
      ),
      // Runtime sizes cannot be Tailwind classes (they would never be generated).
      ...(props.component.minHeight ? { style: `min-height: ${props.component.minHeight}px` } : {}),
      id,
      // Each paragraph follows its own script, so Arabic and English mix correctly.
      dir: 'auto',
      role: 'textbox',
      'aria-multiline': 'true',
      ...(props.component.label ? { 'aria-labelledby': fieldIds(id).label } : {}),
      ...Object.fromEntries(
        Object.entries(aria.value).map(([name, attribute]) => [name, String(attribute)]),
      ),
    }),
  },
  onUpdate: ({ editor: instance }) => {
    setValue(editorToState(instance))
  },
  onTransaction: ({ editor: instance }) => {
    rich.suggestions.update(instance)
    selectionTick.value++
  },
  onBlur: () => {
    rich.suggestions.close()
    blur()
  },
})

watch(
  editor,
  (instance) => {
    liveEditor.value = instance
  },
  { immediate: true },
)

// Keep editor in sync when the server refreshes the state.
watch(value, (next) => {
  const instance = editor.value

  if (!instance) return

  const current = editorToState(instance)
  const same = isJson.value
    ? JSON.stringify(toEditorDocument(next)) === JSON.stringify(current)
    : (next ?? '') === (current ?? '')

  if (!same) {
    instance.commands.setContent(stateToContent(next), { emitUpdate: false })
  }
})

watch(editable, (isEditable) => {
  editor.value?.setEditable(isEditable)
})

// Re-apply the editable element's attributes when the error or description changes.
watch(aria, () => {
  if (editor.value && !editor.value.isDestroyed) {
    editor.value.view.setProps({})
  }
})

// A floating toolbar follows its selection while the page scrolls.
watch(
  () => Boolean(props.component.floatingToolbars),
  (hasFloatingToolbars, _previous, onCleanup) => {
    if (!hasFloatingToolbars || typeof window === 'undefined') return

    const onScroll = () => selectionTick.value++

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    onCleanup(() => window.removeEventListener('scroll', onScroll, { capture: true }))
  },
  { immediate: true },
)

const pickImage = () => fileInput.value?.click()

const uploadImage = async (file: File) => {
  if (!panel.value.endpoints.upload || !editor.value) return

  // The server checks again when the form is saved.
  const problem = fileAttachmentError(file, props.component.fileAttachments)

  if (problem) {
    attachmentError.value =
      problem === 'too_large'
        ? t('form.file_too_large', {}, 'This file is too large.')
        : t('form.file_invalid_type', {}, 'This file type is not allowed.')

    return
  }

  attachmentError.value = null

  let response: { key: string }

  try {
    // Large attachments go in resumable chunks.
    response = await uploadTemporaryFile(
      panel.value.endpoints.upload,
      file,
      panelUploadOptions(panel.value, props.component.fileAttachments.uploadPolicy),
    )
  } catch (error) {
    attachmentError.value =
      (error as { errors?: Record<string, string[]> }).errors?.file?.[0] ??
      t('form.upload_failed', {}, 'The file could not be uploaded.')

    return
  }

  const src = attachments.add(response.key, file)

  editor.value.chain().focus().setImage({ src, alt: file.name }).run()
}

const onFilePicked = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (file) void uploadImage(file)
}

const accept = computed(() =>
  (props.component.fileAttachments.acceptedFileTypes ?? ['image/*']).join(','),
)

const translate = (key: string, fallback: string) => t(key, {}, fallback)

const runCommand = (name: string) => {
  const button = commands.value[name]

  if (!button || !editor.value) return

  button.run(editor.value, {
    // Messages arrive translated (`form.link_prompt`, `editor.grid_columns`).
    prompt: (message) => window.prompt(message),
    pickImage,
    togglePanel: (target) => {
      openPanel.value = openPanel.value === target ? null : target
    },
    t: translate,
  })
}

const toggleSidePanel = (target: RichEditorPanel) => {
  sidePanel.value = sidePanel.value === target ? null : target
}

const insertMergeTag = (tagId: string) => {
  editor.value
    ?.chain()
    .focus()
    .insertContent({ type: 'mergeTag', attrs: { id: tagId } })
    .run()
}

const currentTextColor = () => {
  void selectionTick.value

  return editor.value?.getAttributes('textColor').color
}

// A `table` floating toolbar replaces the table row of buttons.
const showTableToolbar = () => {
  void selectionTick.value

  return Boolean(
    editor.value &&
    editable.value &&
    !props.component.floatingToolbars?.table &&
    showsTableToolbar(allToolbarButtons(props.component), editor.value),
  )
}

const floating = computed(() => {
  void selectionTick.value

  return editable.value
    ? resolveFloatingToolbar(editor.value ?? null, props.component.floatingToolbars)
    : null
})

const applyColor = (color: string | null, close = true) => {
  if (!editor.value) return

  setTextColor(editor.value, color)

  if (close) openPanel.value = null
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      :class="
        cn(
          'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 rounded-md border shadow-xs focus-within:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-60',
        )
      "
    >
      <!-- The sticky offset is a runtime value: no Tailwind class can hold it. -->
      <div
        v-if="props.component.toolbarButtons.length > 0 && editor"
        :ref="(element) => setToolbar('main', element)"
        role="toolbar"
        :aria-label="t('editor.toolbar', {}, 'Formatting')"
        aria-keyshortcuts="Alt+F10"
        data-slot="rich-editor-toolbar"
        :class="
          cn(
            'flex flex-wrap items-center gap-0.5 border-b p-1',
            props.component.stickyToolbar && 'bg-background sticky z-10 rounded-t-md',
          )
        "
        :style="props.component.stickyToolbar ? { top: stickyTop ?? '0px' } : undefined"
      >
        <RichEditorToolbarEntries
          :names="props.component.toolbarButtons"
          :component="props.component"
          :editor="editor"
          :editable="editable"
          :commands="commands"
          :tick="selectionTick"
          :open-panel="openPanel"
          :side-panel="sidePanel"
          @run="runCommand"
          @toggle-panel="toggleSidePanel"
        />
      </div>
      <div
        v-if="editor && openPanel === 'textColor'"
        role="group"
        :aria-label="toolbarButtonLabel('textColor', translate)"
        class="flex flex-wrap items-center gap-1 border-b p-1"
        data-slot="rich-editor-text-colors"
      >
        <!-- Palette colours are runtime values: no Tailwind class can hold them. -->
        <button
          v-for="color in props.component.textColors ?? []"
          :key="color.value"
          type="button"
          :title="color.label"
          :aria-label="color.label"
          :aria-pressed="currentTextColor() === color.value ? 'true' : 'false'"
          class="focus-visible:ring-ring/50 size-6 rounded-full border shadow-xs outline-none focus-visible:ring-[3px] aria-pressed:ring-2"
          :style="{ backgroundColor: color.value }"
          @mousedown.prevent
          @click="applyColor(color.value)"
        />
        <input
          v-if="props.component.customTextColors"
          type="color"
          :aria-label="t('editor.custom_color', {}, 'Custom color')"
          :title="t('editor.custom_color', {}, 'Custom color')"
          class="size-6 cursor-pointer rounded border bg-transparent p-0"
          @input="applyColor(($event.target as HTMLInputElement).value, false)"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('editor.remove_color', {}, 'Remove color')"
          :title="t('editor.remove_color', {}, 'Remove color')"
          @mousedown.prevent
          @click="applyColor(null)"
        >
          <EraserIcon />
        </Button>
      </div>
      <div
        v-if="editor && showTableToolbar()"
        :ref="(element) => setToolbar('table', element)"
        role="toolbar"
        :aria-label="toolbarButtonLabel('table', translate)"
        class="flex flex-wrap items-center gap-0.5 border-b p-1"
        data-slot="rich-editor-table-toolbar"
      >
        <RichEditorToolbarEntries
          :names="TABLE_TOOLBAR_BUTTONS"
          :component="props.component"
          :editor="editor"
          :editable="editable"
          :commands="commands"
          :tick="selectionTick"
          :open-panel="openPanel"
          :side-panel="sidePanel"
          @run="runCommand"
          @toggle-panel="toggleSidePanel"
        />
      </div>
      <div class="@container">
        <div class="flex flex-col-reverse @2xl:flex-row">
          <EditorContent
            :editor="editor"
            class="min-w-0 flex-1"
            :style="
              props.component.maxHeight
                ? { maxHeight: `${props.component.maxHeight}px`, overflowY: 'auto' }
                : undefined
            "
          />
          <RichEditorSidePanel
            v-if="editor && sidePanel"
            :panel="sidePanel"
            :component="props.component"
            :editable="editable"
            :sticky="props.component.stickyPanels ? (stickyTop ?? '0px') : null"
            @insert-block="(blockId: string) => void rich.insertBlock(blockId)"
            @insert-merge-tag="insertMergeTag"
            @close="sidePanel = null"
          />
        </div>
      </div>
      <!-- Runtime coordinates cannot be Tailwind classes. -->
      <div
        v-if="editor && floating && floating.buttons.length > 0"
        :ref="(element) => setToolbar('floating', element)"
        role="toolbar"
        :aria-label="t('editor.floating_toolbar', {}, 'Selection formatting')"
        data-slot="rich-editor-floating-toolbar"
        :data-node="floating.node"
        class="bg-popover text-popover-foreground fixed z-50 flex items-center gap-0.5 rounded-md border p-1 shadow-md"
        :style="floatingToolbarStyle(floating.coords)"
      >
        <RichEditorToolbarEntries
          :names="floating.buttons"
          :component="props.component"
          :editor="editor"
          :editable="editable"
          :commands="commands"
          :tick="selectionTick"
          :open-panel="openPanel"
          :side-panel="sidePanel"
          @run="runCommand"
          @toggle-panel="toggleSidePanel"
        />
      </div>
      <RichEditorSuggestions
        :id="`${id}-suggestions`"
        :suggestions="rich.suggestions"
        :editor="editor"
      />
      <p v-if="attachmentError" role="alert" class="text-destructive px-3 pb-2 text-xs">
        {{ attachmentError }}
      </p>
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFilePicked"
      />
    </div>
  </FieldWrapper>
</template>
