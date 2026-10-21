import type {
  LoadedRichEditorExtensions,
  RichEditorPanel,
  RichEditorSchema,
  ToolCommandContext,
} from '@alfakit/core'
import {
  allToolbarButtons,
  attachToolbarKeyboard,
  commandLabel,
  detailsNodeConfigs,
  documentNonce,
  EditorAttachments,
  fieldIds,
  fileAttachmentError,
  floatingToolbarStyle,
  focusToolbar,
  gridNodeConfigs,
  highlightMarkConfig,
  htmlToMarkdown,
  isToolbarGroup,
  isToolbarShortcut,
  leadExtensionConfig,
  linkExtensionOptions,
  loadRichEditorExtensions,
  panelUploadOptions,
  resizableImageAttributes,
  resizableImageOptions,
  resolveFloatingToolbar,
  resolveStickyOffset,
  setTextColor,
  showsTableToolbar,
  smallMarkConfig,
  subscriptMarkConfig,
  superscriptMarkConfig,
  TABLE_TOOLBAR_BUTTONS,
  textAlignExtensionConfig,
  textColorMarkConfig,
  toEditorDocument,
  toolbarButtonLabel,
  toolbarCommands,
  toolbarPanel,
  uploadTemporaryFile,
} from '@alfakit/core'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import {
  EditorContent,
  Extension,
  Mark,
  Node,
  useEditor,
  type Editor,
  type Extensions,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  ALargeSmallIcon,
  BaselineIcon,
  BetweenHorizontalEndIcon,
  BetweenHorizontalStartIcon,
  BetweenVerticalEndIcon,
  BetweenVerticalStartIcon,
  BoldIcon,
  CodeIcon,
  Columns2Icon,
  Columns3Icon,
  EraserIcon,
  Grid2x2XIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  HighlighterIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListCollapseIcon,
  ListIcon,
  ListOrderedIcon,
  Minus,
  PanelTopIcon,
  PilcrowIcon,
  QuoteIcon,
  RedoIcon,
  RemoveFormattingIcon,
  Rows3Icon,
  SquareCodeIcon,
  SquareXIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableCellsMergeIcon,
  TableCellsSplitIcon,
  TableIcon,
  TablePropertiesIcon,
  TextAlignCenterIcon,
  TextAlignEndIcon,
  TextAlignJustifyIcon,
  TextAlignStartIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useActionRunner, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Skeleton } from '../ui/skeleton'
import {
  ExtensionToolbarButton,
  RichEditorSidePanel,
  stickyStyle,
  SuggestionPopup,
  ToolbarGroupButton,
  useRichEditorExtensions,
} from './rich-editor-extensions'

type MarkConfig = Parameters<typeof Mark.create>[0]
type NodeConfig = Parameters<typeof Node.create>[0]
type ExtensionConfig = Parameters<typeof Extension.create>[0]

/** Toolbar button icons; what each button does lives in `@alfakit/core` (`TOOLBAR_COMMANDS`). */
const ICONS: Record<string, ReactNode> = {
  bold: <BoldIcon />,
  italic: <ItalicIcon />,
  underline: <UnderlineIcon />,
  strike: <StrikethroughIcon />,
  subscript: <SubscriptIcon />,
  superscript: <SuperscriptIcon />,
  code: <CodeIcon />,
  highlight: <HighlighterIcon />,
  textColor: <BaselineIcon />,
  link: <LinkIcon />,
  h1: <Heading1Icon />,
  h2: <Heading2Icon />,
  h3: <Heading3Icon />,
  h4: <Heading4Icon />,
  h5: <Heading5Icon />,
  h6: <Heading6Icon />,
  paragraph: <TypeIcon />,
  heading: <Heading2Icon />,
  // Alignment and column icons point at a side: mirror them right to left.
  alignStart: <TextAlignStartIcon className="rtl:-scale-x-100" />,
  alignCenter: <TextAlignCenterIcon />,
  alignEnd: <TextAlignEndIcon className="rtl:-scale-x-100" />,
  alignJustify: <TextAlignJustifyIcon />,
  blockquote: <QuoteIcon />,
  codeBlock: <SquareCodeIcon />,
  bulletList: <ListIcon />,
  orderedList: <ListOrderedIcon />,
  horizontalRule: <Minus />,
  details: <ListCollapseIcon />,
  lead: <PilcrowIcon />,
  small: <ALargeSmallIcon />,
  grid: <Columns2Icon />,
  gridAddColumnBefore: <BetweenVerticalStartIcon className="rtl:-scale-x-100" />,
  gridAddColumnAfter: <BetweenVerticalEndIcon className="rtl:-scale-x-100" />,
  gridDeleteColumn: <Columns3Icon />,
  gridDelete: <SquareXIcon />,
  table: <TableIcon />,
  tableAddColumnBefore: <BetweenVerticalStartIcon className="rtl:-scale-x-100" />,
  tableAddColumnAfter: <BetweenVerticalEndIcon className="rtl:-scale-x-100" />,
  tableDeleteColumn: <Columns3Icon />,
  tableAddRowBefore: <BetweenHorizontalStartIcon />,
  tableAddRowAfter: <BetweenHorizontalEndIcon />,
  tableDeleteRow: <Rows3Icon />,
  tableMergeCells: <TableCellsMergeIcon />,
  tableSplitCell: <TableCellsSplitIcon />,
  tableToggleHeaderRow: <PanelTopIcon />,
  tableToggleHeaderCell: <TablePropertiesIcon />,
  tableDelete: <Grid2x2XIcon />,
  clearFormatting: <RemoveFormattingIcon />,
  attachFiles: <ImageIcon />,
  undo: <UndoIcon />,
  redo: <RedoIcon />,
}

/**
 * Resize handles of `resizableImages()` (Tiptap's node view adds bare `data-resize-handle`
 * elements): round dots on the corners, shown on hover and while the image is selected.
 */
const RESIZE_HANDLE_CLASSES =
  '[&_[data-resize-handle]]:z-10 [&_[data-resize-handle]]:size-3 [&_[data-resize-handle]]:rounded-full [&_[data-resize-handle]]:border-2 [&_[data-resize-handle]]:border-background [&_[data-resize-handle]]:bg-primary [&_[data-resize-handle]]:opacity-0 [&_[data-resize-container]:hover_[data-resize-handle]]:opacity-100 [&_.ProseMirror-selectednode_[data-resize-handle]]:opacity-100 [&_[data-resize-handle=bottom-right]]:cursor-nwse-resize [&_[data-resize-handle=top-left]]:cursor-nwse-resize [&_[data-resize-handle=bottom-left]]:cursor-nesw-resize [&_[data-resize-handle=top-right]]:cursor-nesw-resize'

/** The image extension, with drag handles for `resizableImages()`. */
export function imageExtension(resizable: boolean) {
  if (!resizable) return Image

  return Image.extend({
    addAttributes() {
      return resizableImageAttributes(this.parent?.() ?? {})
    },
  }).configure(resizableImageOptions())
}

/** Extensions for the extra toolbar buttons (only those the toolbar uses are loaded). */
export function toolbarExtensions(buttons: string[], markdown: boolean): Extensions {
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

const NO_EXTENSIONS: LoadedRichEditorExtensions = { extensions: [], commands: {} }

/**
 * The rich and Markdown editors. Plugin extensions (`RichEditor::plugins()`) load before
 * the editor is created, since Tiptap extensions can't be added afterwards.
 */
export function RichEditorField({ component }: { component: RichEditorSchema }) {
  const keys = component.type === 'MarkdownEditor' ? [] : (component.extensions ?? [])
  const signature = keys.join('|')
  const [loaded, setLoaded] = useState<{
    signature: string
    value: LoadedRichEditorExtensions
  } | null>(() => (keys.length === 0 ? { signature, value: NO_EXTENSIONS } : null))

  useEffect(() => {
    if (loaded?.signature === signature) return

    let cancelled = false

    void loadRichEditorExtensions(signature === '' ? [] : signature.split('|')).then((value) => {
      if (!cancelled) setLoaded({ signature, value })
    })

    return () => {
      cancelled = true
    }
  }, [signature, loaded?.signature])

  if (loaded?.signature !== signature) {
    return <RichEditorLoading component={component} />
  }

  return <RichEditorInput key={signature} component={component} plugins={loaded.value} />
}

function RichEditorLoading({ component }: { component: RichEditorSchema }) {
  const { id, error } = useField<unknown>(component)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <Skeleton className="h-40 w-full" aria-hidden="true" />
    </FieldWrapper>
  )
}

function RichEditorInput({
  component,
  plugins,
}: {
  component: RichEditorSchema
  plugins: LoadedRichEditorExtensions
}) {
  const t = useT()
  const panel = usePanel()
  const runner = useActionRunner()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } =
    useField<unknown>(component)
  const fileInput = useRef<HTMLInputElement>(null)
  // ProseMirror reads its DOM attributes on every view update; the ref keeps them current.
  const ariaRef = useRef(aria)
  const isMarkdown = component.type === 'MarkdownEditor'
  // Uploaded images preview from a local URL but are stored by their `tmp:` key.
  const [attachments] = useState(() => new EditorAttachments())
  const editable = !disabled && !readOnly
  const isJson = Boolean(component.json) && !isMarkdown
  // The editor's live instance, for the custom block node views and suggestions.
  const editorRef = useRef<Editor | null>(null)
  const richExtensions = useRichEditorExtensions(component, editorRef)
  // The open toolbar panel (the text colour palette).
  const [openPanel, setOpenPanel] = useState<'textColor' | null>(null)
  // The open side panel (custom blocks or merge tags).
  const [sidePanel, setSidePanel] = useState<RichEditorPanel | null>(() => {
    const initial = component.activePanel ?? null

    if (initial === 'customBlocks') return component.customBlocks?.length ? initial : null
    if (initial === 'mergeTags') return component.mergeTags?.length ? initial : null

    return null
  })
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  // Re-render on selection changes so active states and the table row follow the cursor.
  const [, setSelectionTick] = useState(0)
  const sticky = Boolean(component.stickyToolbar || component.stickyPanels)
  const contextRef = useRef(richExtensions.context)
  // Keyboard access to the toolbars (roving tabindex, arrows, Escape, Alt+F10).
  const toolbarElements = useRef<Record<'main' | 'table' | 'floating', HTMLElement | null>>({
    main: null,
    table: null,
    floating: null,
  })
  const toolbars = useCallback(
    () => [
      toolbarElements.current.floating,
      toolbarElements.current.main,
      toolbarElements.current.table,
    ],
    [],
  )
  const attachKeyboard = useCallback(
    (slot: 'main' | 'table' | 'floating', element: HTMLElement | null) => {
      toolbarElements.current[slot] = element

      if (!element) return

      const detach = attachToolbarKeyboard(element, {
        onEscape: () => editorRef.current?.commands.focus(),
        toolbars,
      })

      return () => {
        detach()
        if (toolbarElements.current[slot] === element) toolbarElements.current[slot] = null
      }
    },
    [toolbars],
  )
  const mainToolbarRef = useCallback(
    (element: HTMLElement | null) => attachKeyboard('main', element),
    [attachKeyboard],
  )
  const tableToolbarRef = useCallback(
    (element: HTMLElement | null) => attachKeyboard('table', element),
    [attachKeyboard],
  )
  const floatingToolbarRef = useCallback(
    (element: HTMLElement | null) => attachKeyboard('floating', element),
    [attachKeyboard],
  )

  useEffect(() => {
    contextRef.current = richExtensions.context
  })

  // How plugin tools open their editor action. The refs are read when a tool runs (on
  // click), never during render.
  const [toolContext] = useState<ToolCommandContext>(() => ({
    runAction: (tool, args) =>
      tool.action
        ? runner.runField(tool.action, { ...contextRef.current, arguments: args })
        : Promise.resolve(undefined),
    editor: () => editorRef.current,
  }))

  // Built-in buttons, plugin tools and commands of plugin JavaScript extensions.
  const commands = useMemo(
    () => toolbarCommands(component.editorTools, toolContext, plugins.commands),
    [component.editorTools, plugins.commands, toolContext],
  )

  // Field state ↔ editor content: HTML, Markdown (loaded from the server's HTML) or a
  // Tiptap JSON document. `tmp:` upload keys become local preview URLs and back.
  const stateToContent = (): string | Record<string, unknown> => {
    if (isJson) {
      const document = toEditorDocument(value)

      return document ? JSON.parse(attachments.toEditor(JSON.stringify(document))) : ''
    }

    const markdownHtml = typeof component.html === 'string' ? component.html : null

    return attachments.toEditor(((isMarkdown ? markdownHtml : value) as string | null) ?? '')
  }
  const editorToState = (instance: Editor): unknown => {
    if (instance.isEmpty) return null
    if (isJson) return JSON.parse(attachments.toState(JSON.stringify(instance.getJSON())))

    const html = instance.getHTML()

    return attachments.toState(isMarkdown ? htmlToMarkdown(html) : html)
  }

  useEffect(() => () => attachments.destroy(), [attachments])

  const editor = useEditor({
    // TipTap injects its base CSS; with the page's CSP nonce a nonce-based policy allows it.
    injectNonce: documentNonce(),
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure(linkExtensionOptions(component.linkProtocols)),
      imageExtension(Boolean(component.resizableImages) && !isMarkdown),
      Placeholder.configure({ placeholder: component.placeholder ?? '' }),
      ...toolbarExtensions(allToolbarButtons(component), isMarkdown),
      ...(isMarkdown ? [] : richExtensions.extensions),
      ...(isMarkdown ? [] : (plugins.extensions as Extensions)),
    ],
    // Markdown is loaded from the server's HTML rendering of it, never parsed as HTML.
    content: stateToContent(),
    editable,
    editorProps: {
      // The mention / merge tag popup takes the arrow, Enter, Tab and Escape keys.
      handleKeyDown: (_view, event) => {
        // Alt+F10: into the floating toolbar, else the main one.
        if (isToolbarShortcut(event)) {
          return focusToolbar(toolbars())
        }

        return editorRef.current
          ? richExtensions.suggestions.handleKeyDown(event, editorRef.current)
          : false
      },
      attributes: () => ({
        class: cn(
          'alfakit-prose min-h-32 px-3 py-2 text-sm outline-none',
          component.resizableImages && RESIZE_HANDLE_CLASSES,
        ),
        // Runtime sizes cannot be Tailwind classes (they would never be generated).
        ...(component.minHeight ? { style: `min-height: ${component.minHeight}px` } : {}),
        id,
        // Each paragraph follows its own script, so Arabic and English mix correctly.
        dir: 'auto',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(component.label ? { 'aria-labelledby': fieldIds(id).label } : {}),
        ...Object.fromEntries(
          Object.entries(ariaRef.current).map(([name, attribute]) => [name, String(attribute)]),
        ),
      }),
    },
    onUpdate: ({ editor: instance }) => {
      setValue(editorToState(instance))
    },
    onTransaction: ({ editor: instance }) => {
      richExtensions.suggestions.update(instance)
      setSelectionTick((tick) => tick + 1)
    },
    onBlur: () => {
      richExtensions.suggestions.close()
      blur()
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Keep editor in sync when the server refreshes the state.
  useEffect(() => {
    // Tiptap may replace the instance on mount (e.g. when the editor loads lazily); the
    // replaced one has no schema left, and the new one starts from the current value.
    if (!editor?.schema) return

    const current = editorToState(editor)
    const same = isJson
      ? JSON.stringify(toEditorDocument(value)) === JSON.stringify(current)
      : (value ?? '') === (current ?? '')

    if (!same) {
      editor.commands.setContent(stateToContent(), { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  // Re-apply the editable element's attributes when the error or description changes.
  useEffect(() => {
    ariaRef.current = aria

    if (editor && !editor.isDestroyed) {
      editor.view.setProps({})
    }
  }, [editor, aria])

  // Measured in the browser once the editor exists (the toolbar only renders then).
  const stickyTop = useMemo(
    () => (sticky && editor ? resolveStickyOffset(component.stickyOffset) : null),
    [sticky, editor, component.stickyOffset],
  )

  // A floating toolbar follows its selection while the page scrolls.
  const hasFloatingToolbars = Boolean(component.floatingToolbars)

  useEffect(() => {
    if (!hasFloatingToolbars) return

    const onScroll = () => setSelectionTick((tick) => tick + 1)

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })

    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [hasFloatingToolbars])

  const pickImage = () => fileInput.current?.click()

  const uploadImage = async (file: File) => {
    if (!panel.endpoints.upload || !editor) return

    // The server checks again when the form is saved.
    const problem = fileAttachmentError(file, component.fileAttachments)

    if (problem) {
      setAttachmentError(
        problem === 'too_large'
          ? t('form.file_too_large', {}, 'This file is too large.')
          : t('form.file_invalid_type', {}, 'This file type is not allowed.'),
      )

      return
    }

    setAttachmentError(null)

    let response: { key: string }

    try {
      // Large attachments go in resumable chunks.
      response = await uploadTemporaryFile(
        panel.endpoints.upload,
        file,
        panelUploadOptions(panel, component.fileAttachments.uploadPolicy),
      )
    } catch (error) {
      setAttachmentError(
        (error as { errors?: Record<string, string[]> }).errors?.file?.[0] ??
          t('form.upload_failed', {}, 'The file could not be uploaded.'),
      )

      return
    }

    const src = attachments.add(response.key, file)

    editor.chain().focus().setImage({ src, alt: file.name }).run()
  }

  const translate = (key: string, fallback: string) => t(key, {}, fallback)

  const iconFor = (name: string): ReactNode => {
    if (ICONS[name]) return ICONS[name]

    const tool = component.editorTools?.find((candidate) => candidate.name === name)

    return tool?.icon ? (
      <Icon name={tool.icon} />
    ) : (
      <span className="text-xs">{commandLabel(name, commands, translate)}</span>
    )
  }

  const runCommand = (name: string) => {
    const button = commands[name]

    if (!button || !editor) return

    button.run(editor, {
      // Messages arrive translated (`form.link_prompt`, `editor.grid_columns`).
      prompt: (message) => window.prompt(message),
      pickImage,
      togglePanel: (target) => setOpenPanel((current) => (current === target ? null : target)),
      t: translate,
    })
  }

  const renderButton = (name: string) => {
    const button = commands[name]

    if (!button || !editor) return null

    const label = commandLabel(name, commands, translate)
    const active = button.active?.(editor) || (name === 'textColor' && openPanel === name)

    return (
      <Button
        key={name}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={label}
        aria-pressed={button.active || name === 'textColor' ? Boolean(active) : undefined}
        disabled={!editable}
        className={cn(active && 'bg-accent text-accent-foreground')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand(name)}
      >
        {iconFor(name)}
      </Button>
    )
  }

  /** A toolbar entry: separator, group dropdown, panel toggle or button. */
  const renderEntry = (name: string, index: number) => {
    if (!editor) return null

    if (name === '|') {
      return <Separator key={`sep-${index}`} orientation="vertical" className="mx-1 h-5" />
    }

    if (isToolbarGroup(name)) {
      const group = component.toolbarButtonGroups?.[name]

      return group ? (
        <ToolbarGroupButton
          key={name}
          group={group}
          editor={editor}
          editable={editable}
          commands={commands}
          icons={iconFor}
          translate={translate}
          onRun={runCommand}
        />
      ) : null
    }

    const target = toolbarPanel(name)

    if (target) {
      return (
        <ExtensionToolbarButton
          key={name}
          name={target}
          component={component}
          editable={editable}
          open={sidePanel === target}
          onToggle={() => setSidePanel((current) => (current === target ? null : target))}
        />
      )
    }

    return renderButton(name)
  }

  const floating = editable ? resolveFloatingToolbar(editor, component.floatingToolbars) : null
  // A `table` floating toolbar replaces the table row of buttons.
  const tableRow =
    editor &&
    editable &&
    !component.floatingToolbars?.table &&
    showsTableToolbar(allToolbarButtons(component), editor)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        className={cn(
          'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 rounded-md border shadow-xs focus-within:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-60',
        )}
      >
        {component.toolbarButtons.length > 0 && editor && (
          <div
            ref={mainToolbarRef}
            role="toolbar"
            aria-label={t('editor.toolbar', {}, 'Formatting')}
            aria-keyshortcuts="Alt+F10"
            data-slot="rich-editor-toolbar"
            className={cn(
              'flex flex-wrap items-center gap-0.5 border-b p-1',
              component.stickyToolbar && 'bg-background sticky z-10 rounded-t-md',
            )}
            // The offset is a runtime value: no Tailwind class can hold it.
            style={component.stickyToolbar ? stickyStyle(stickyTop ?? '0px') : undefined}
          >
            {component.toolbarButtons.map(renderEntry)}
          </div>
        )}
        {editor && openPanel === 'textColor' && (
          <div
            role="group"
            aria-label={toolbarButtonLabel('textColor', translate)}
            className="flex flex-wrap items-center gap-1 border-b p-1"
            data-slot="rich-editor-text-colors"
          >
            {(component.textColors ?? []).map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={editor.getAttributes('textColor').color === color.value}
                className="focus-visible:ring-ring/50 size-6 rounded-full border shadow-xs outline-none focus-visible:ring-[3px] aria-pressed:ring-2"
                // Palette colours are runtime values: no Tailwind class can hold them.
                style={{ backgroundColor: color.value }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setTextColor(editor, color.value)
                  setOpenPanel(null)
                }}
              />
            ))}
            {component.customTextColors && (
              <input
                type="color"
                aria-label={t('editor.custom_color', {}, 'Custom color')}
                title={t('editor.custom_color', {}, 'Custom color')}
                className="size-6 cursor-pointer rounded border bg-transparent p-0"
                onChange={(event) => setTextColor(editor, event.target.value)}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('editor.remove_color', {}, 'Remove color')}
              title={t('editor.remove_color', {}, 'Remove color')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setTextColor(editor, null)
                setOpenPanel(null)
              }}
            >
              <EraserIcon />
            </Button>
          </div>
        )}
        {tableRow && (
          <div
            ref={tableToolbarRef}
            role="toolbar"
            aria-label={toolbarButtonLabel('table', translate)}
            className="flex flex-wrap items-center gap-0.5 border-b p-1"
            data-slot="rich-editor-table-toolbar"
          >
            {TABLE_TOOLBAR_BUTTONS.map((name) => renderButton(name))}
          </div>
        )}
        <div className="@container">
          <div className="flex flex-col-reverse @2xl:flex-row">
            <EditorContent
              editor={editor}
              className="min-w-0 flex-1"
              style={
                component.maxHeight
                  ? { maxHeight: component.maxHeight, overflowY: 'auto' }
                  : undefined
              }
            />
            {editor && sidePanel && (
              <RichEditorSidePanel
                panel={sidePanel}
                component={component}
                editable={editable}
                sticky={component.stickyPanels ? (stickyTop ?? '0px') : null}
                onInsertBlock={(blockId) => void richExtensions.insertBlock(blockId)}
                onInsertMergeTag={(tagId) =>
                  editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'mergeTag', attrs: { id: tagId } })
                    .run()
                }
                onClose={() => setSidePanel(null)}
              />
            )}
          </div>
        </div>
        {editor && floating && floating.buttons.length > 0 && (
          <div
            ref={floatingToolbarRef}
            role="toolbar"
            aria-label={t('editor.floating_toolbar', {}, 'Selection formatting')}
            data-slot="rich-editor-floating-toolbar"
            data-node={floating.node}
            className="bg-popover text-popover-foreground fixed z-50 flex items-center gap-0.5 rounded-md border p-1 shadow-md"
            // Runtime coordinates cannot be Tailwind classes.
            style={floatingToolbarStyle(floating.coords)}
          >
            {floating.buttons.map(renderEntry)}
          </div>
        )}
        <SuggestionPopup
          suggestions={richExtensions.suggestions}
          editor={editor}
          id={`${id}-suggestions`}
        />
        {attachmentError && (
          <p role="alert" className="text-destructive px-3 pb-2 text-xs">
            {attachmentError}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={(component.fileAttachments.acceptedFileTypes ?? ['image/*']).join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0])}
        />
      </div>
    </FieldWrapper>
  )
}
