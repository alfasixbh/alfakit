<script lang="ts">
  import type { LoadedRichEditorExtensions, RichEditorPanel, RichEditorSchema } from '@alfakit/core'
  import {
    allToolbarButtons,
    attachToolbarKeyboard,
    focusToolbar,
    isToolbarShortcut,
    commandLabel,
    EditorAttachments,
    fieldIds,
    fileAttachmentError,
    floatingToolbarStyle,
    htmlToMarkdown,
    isToolbarGroup,
    linkExtensionOptions,
    resolveFloatingToolbar,
    resolveStickyOffset,
    setTextColor,
    showsTableToolbar,
    TABLE_TOOLBAR_BUTTONS,
    toEditorDocument,
    toolbarButtonLabel,
    toolbarCommands,
    toolbarPanel,
    panelUploadOptions,
    uploadTemporaryFile,
  } from '@alfakit/core'
  import EraserIcon from '@lucide/svelte/icons/eraser'
  import { Editor, type Extensions } from '@tiptap/core'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'
  import StarterKit from '@tiptap/starter-kit'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { useActionRunner, usePanel, useT } from '../../context.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField, useOptionalFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Separator } from '../ui/separator'
  import {
    imageExtension,
    MIRRORED_ICONS,
    RESIZE_HANDLE_CLASSES,
    TOOLBAR_ICONS,
    toolbarExtensions,
  } from './rich-editor-buttons'
  import { createRichEditorExtensions } from './rich-editor-extensions'
  import RichEditorExtensionButton from './RichEditorExtensionButton.svelte'
  import RichEditorSidePanel from './RichEditorSidePanel.svelte'
  import RichEditorSuggestions from './RichEditorSuggestions.svelte'
  import RichEditorToolbarGroup from './RichEditorToolbarGroup.svelte'

  let {
    component,
    plugins,
  }: {
    component: RichEditorSchema
    /** Extensions and commands of the plugins (`RichEditor::plugins()`), already loaded. */
    plugins: LoadedRichEditorExtensions
  } = $props()

  const t = useT()

  // Keyboard access to the toolbars (roving tabindex, arrows, Escape, Alt+F10).
  type ToolbarSlot = 'main' | 'table' | 'floating'
  const toolbarElements: Record<ToolbarSlot, HTMLElement | null> = {
    main: null,
    table: null,
    floating: null,
  }
  const toolbars = () => [toolbarElements.floating, toolbarElements.main, toolbarElements.table]
  const toolbarKeyboard = (slot: ToolbarSlot) => (element: HTMLElement) => {
    toolbarElements[slot] = element
    const detach = attachToolbarKeyboard(element, {
      onEscape: () => editor?.commands.focus(),
      toolbars,
    })

    return () => {
      detach()
      if (toolbarElements[slot] === element) toolbarElements[slot] = null
    }
  }
  const mainToolbarKeyboard = toolbarKeyboard('main')
  const tableToolbarKeyboard = toolbarKeyboard('table')
  const floatingToolbarKeyboard = toolbarKeyboard('floating')
  const panel = usePanel()
  const field = useField<unknown>(() => component)
  const isMarkdown = $derived(component.type === 'MarkdownEditor')

  let element = $state<HTMLDivElement | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  let editor = $state<Editor | null>(null)
  /** Bumped on every transaction so toolbar active states re-render. */
  let tick = $state(0)
  // The open toolbar panel (the text colour palette).
  let openPanel = $state<'textColor' | null>(null)
  let attachmentError = $state<string | null>(null)
  // The open side panel (custom blocks or merge tags).
  let sidePanel = $state<RichEditorPanel | null>(
    untrack(() => {
      const initial = component.activePanel ?? null

      if (initial === 'customBlocks') return component.customBlocks?.length ? initial : null
      if (initial === 'mergeTags') return component.mergeTags?.length ? initial : null

      return null
    }),
  )
  // `top` of the sticky toolbar and panels, measured once mounted.
  let stickyTop = $state<string | null>(null)

  // Uploaded images preview from a local URL but are stored by their `tmp:` key.
  const attachments = new EditorAttachments()
  const editable = $derived(!field.disabled && !field.readOnly)
  const isJson = $derived(Boolean(component.json) && !isMarkdown)

  const page = usePageActionContext()
  const runner = useActionRunner()
  const rich = createRichEditorExtensions({
    component: () => component,
    editor: () => editor,
    form: useOptionalFormStore(),
    token: () => page.token,
    runner,
    t,
  })

  // Built-in buttons, plugin tools and commands of plugin JavaScript extensions.
  const commands = $derived(
    toolbarCommands(
      component.editorTools,
      {
        runAction: (tool, args) =>
          tool.action
            ? runner.runField(tool.action, { ...rich.context(), arguments: args })
            : Promise.resolve(undefined),
        editor: () => editor,
      },
      plugins.commands,
    ),
  )

  // Field state ↔ editor content: HTML, Markdown (loaded from the server's HTML) or a
  // Tiptap JSON document. `tmp:` upload keys become local preview URLs and back.
  const stateToContent = (state: unknown): string | Record<string, unknown> => {
    if (untrack(() => isJson)) {
      const document = toEditorDocument(state)

      return document ? JSON.parse(attachments.toEditor(JSON.stringify(document))) : ''
    }

    return attachments.toEditor(
      ((untrack(() => isMarkdown)
        ? untrack(() => (typeof component.html === 'string' ? component.html : null))
        : state) as string | null) ?? '',
    )
  }
  const editorToState = (instance: Editor): unknown => {
    if (instance.isEmpty) return null
    if (untrack(() => isJson)) {
      return JSON.parse(attachments.toState(JSON.stringify(instance.getJSON())))
    }

    const html = instance.getHTML()

    return attachments.toState(untrack(() => isMarkdown) ? htmlToMarkdown(html) : html)
  }

  onMount(() => {
    if (!element) return

    const minHeight = untrack(() => component.minHeight)
    const resizable = untrack(() => Boolean(component.resizableImages))
    const markdown = untrack(() => isMarkdown)

    if (untrack(() => component.stickyToolbar || component.stickyPanels)) {
      stickyTop = resolveStickyOffset(untrack(() => component.stickyOffset))
    }

    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ link: false }),
        Link.configure(linkExtensionOptions(untrack(() => component.linkProtocols))),
        imageExtension(resizable && !markdown),
        Placeholder.configure({ placeholder: untrack(() => component.placeholder ?? '') }),
        ...toolbarExtensions(
          untrack(() => allToolbarButtons(component)),
          markdown,
        ),
        ...(markdown ? [] : rich.extensions),
        ...(markdown ? [] : (untrack(() => plugins.extensions) as Extensions)),
      ],
      // Markdown is loaded from the server's HTML rendering of it, never parsed as HTML.
      content: stateToContent(untrack(() => field.value)),
      editable: untrack(() => editable),
      editorProps: {
        // The mention / merge tag popup takes the arrow, Enter, Tab and Escape keys.
        handleKeyDown: (_view, event) => {
          // Alt+F10: into the floating toolbar, else the main one.
          if (isToolbarShortcut(event)) return focusToolbar(toolbars())

          return editor ? rich.suggestions.handleKeyDown(event, editor) : false
        },
        // ProseMirror reads its DOM attributes on every view update, so they follow `aria`.
        attributes: (): Record<string, string> => ({
          class: cn(
            'alfakit-prose min-h-32 px-3 py-2 text-sm outline-none',
            resizable && RESIZE_HANDLE_CLASSES,
          ),
          ...(minHeight ? { style: `min-height: ${minHeight}px` } : {}),
          id: untrack(() => field.id),
          // Each paragraph follows its own script, so Arabic and English mix correctly.
          dir: 'auto',
          role: 'textbox',
          'aria-multiline': 'true',
          ...untrack((): Record<string, string> =>
            component.label ? { 'aria-labelledby': fieldIds(field.id).label } : {},
          ),
          ...Object.fromEntries(
            Object.entries(untrack(() => field.aria)).map(([name, attribute]) => [
              name,
              String(attribute),
            ]),
          ),
        }),
      },
      onUpdate: ({ editor: instance }) => {
        field.setValue(editorToState(instance))
      },
      onTransaction: ({ editor: instance }) => {
        tick += 1
        rich.suggestions.update(instance)
      },
      onBlur: () => {
        rich.suggestions.close()
        field.blur()
      },
    })
  })

  // A floating toolbar follows its selection while the page scrolls.
  onMount(() => {
    if (!untrack(() => component.floatingToolbars)) return

    const onScroll = () => (tick += 1)

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })

    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  })

  onDestroy(() => {
    editor?.destroy()
    attachments.destroy()
    rich.suggestions.destroy()
  })

  // Keep editor in sync when the server refreshes the state.
  $effect(() => {
    const value = field.value
    const instance = editor

    if (!instance) return

    const current = editorToState(instance)
    const same = untrack(() => isJson)
      ? JSON.stringify(toEditorDocument(value)) === JSON.stringify(current)
      : (value ?? '') === (current ?? '')

    if (!same) {
      instance.commands.setContent(stateToContent(value), { emitUpdate: false })
    }
  })

  $effect(() => {
    editor?.setEditable(editable)
  })

  // Re-apply the editable element's attributes when the error or description changes.
  $effect(() => {
    void field.aria
    const instance = untrack(() => editor)

    if (instance && !instance.isDestroyed) {
      instance.view.setProps({})
    }
  })

  const pickImage = () => fileInput?.click()

  const uploadImage = async (file: File) => {
    if (!panel.endpoints.upload || !editor) return

    // The server checks again when the form is saved.
    const problem = fileAttachmentError(file, component.fileAttachments)

    if (problem) {
      attachmentError =
        problem === 'too_large'
          ? t('form.file_too_large', {}, 'This file is too large.')
          : t('form.file_invalid_type', {}, 'This file type is not allowed.')

      return
    }

    attachmentError = null

    let response: { key: string }

    try {
      // Large attachments go in resumable chunks.
      response = await uploadTemporaryFile(
        panel.endpoints.upload,
        file,
        panelUploadOptions(panel, component.fileAttachments.uploadPolicy),
      )
    } catch (error) {
      attachmentError =
        (error as { errors?: Record<string, string[]> }).errors?.file?.[0] ??
        t('form.upload_failed', {}, 'The file could not be uploaded.')

      return
    }

    const src = attachments.add(response.key, file)

    editor.chain().focus().setImage({ src, alt: file.name }).run()
  }

  const translate = (key: string, fallback: string) => t(key, {}, fallback)

  /** Pressed state of a toolbar button; undefined for buttons that only run a command. */
  const pressed = (name: string): boolean | undefined => {
    void tick
    const button = commands[name]

    if (!button || !editor || (!button.active && name !== 'textColor')) return undefined

    return Boolean(button.active?.(editor) || (name === 'textColor' && openPanel === name))
  }

  const colorPressed = (color: string): boolean => {
    void tick

    return editor?.getAttributes('textColor').color === color
  }

  const tableToolbar = $derived.by(() => {
    void tick

    // A `table` floating toolbar replaces the table row of buttons.
    return Boolean(
      editor &&
      editable &&
      !component.floatingToolbars?.table &&
      showsTableToolbar(allToolbarButtons(component), editor),
    )
  })

  const floating = $derived.by(() => {
    void tick

    return editable ? resolveFloatingToolbar(editor, component.floatingToolbars) : null
  })

  const insertMergeTag = (id: string) =>
    editor?.chain().focus().insertContent({ type: 'mergeTag', attrs: { id } }).run()

  const toggleSidePanel = (target: RichEditorPanel) =>
    (sidePanel = sidePanel === target ? null : target)

  const runButton = (name: string) => {
    const button = commands[name]

    if (!button || !editor) return

    button.run(editor, {
      // Messages arrive translated (`form.link_prompt`, `editor.grid_columns`).
      prompt: (message) => window.prompt(message),
      pickImage,
      togglePanel: (target) => (openPanel = openPanel === target ? null : target),
      t: translate,
    })
  }
</script>

{#snippet buttonIcon(name: string)}
  {@const ButtonIcon = TOOLBAR_ICONS[name]}
  {@const tool = component.editorTools?.find((candidate) => candidate.name === name)}
  {#if ButtonIcon}
    <ButtonIcon class={cn(MIRRORED_ICONS.has(name) && 'rtl:-scale-x-100')} />
  {:else if tool?.icon}
    <Icon name={tool.icon} />
  {:else}
    <span class="text-xs">{commandLabel(name, commands, translate)}</span>
  {/if}
{/snippet}

{#snippet toolbarButton(name: string)}
  {#if commands[name] && editor}
    {@const label = commandLabel(name, commands, translate)}
    {@const isPressed = pressed(name)}
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={isPressed}
      disabled={!editable}
      class={cn(isPressed && 'bg-accent text-accent-foreground')}
      onmousedown={(event) => event.preventDefault()}
      onclick={() => runButton(name)}
    >
      {@render buttonIcon(name)}
    </Button>
  {/if}
{/snippet}

<!-- A toolbar entry: separator, group dropdown, panel toggle or button. -->
{#snippet toolbarEntry(name: string)}
  {#if name === '|'}
    <Separator orientation="vertical" class="mx-1 h-5" />
  {:else if isToolbarGroup(name)}
    {@const group = component.toolbarButtonGroups?.[name]}
    {#if group && editor}
      <RichEditorToolbarGroup
        {group}
        {editor}
        {editable}
        {commands}
        {tick}
        icon={buttonIcon}
        {translate}
        onRun={runButton}
      />
    {/if}
  {:else if toolbarPanel(name)}
    {@const target = toolbarPanel(name)!}
    <RichEditorExtensionButton
      name={target}
      {component}
      {editable}
      open={sidePanel === target}
      onToggle={() => toggleSidePanel(target)}
    />
  {:else}
    {@render toolbarButton(name)}
  {/if}
{/snippet}

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    class={cn(
      'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 rounded-md border shadow-xs focus-within:ring-[3px]',
      field.error && 'border-destructive',
      field.disabled && 'opacity-60',
    )}
  >
    {#if component.toolbarButtons.length > 0 && editor}
      <!-- The sticky offset is a runtime value: no Tailwind class can hold it. -->
      <div
        {@attach mainToolbarKeyboard}
        role="toolbar"
        aria-label={t('editor.toolbar', {}, 'Formatting')}
        aria-keyshortcuts="Alt+F10"
        data-slot="rich-editor-toolbar"
        class={cn(
          'flex flex-wrap items-center gap-0.5 border-b p-1',
          component.stickyToolbar && 'bg-background sticky z-10 rounded-t-md',
        )}
        style:top={component.stickyToolbar ? (stickyTop ?? '0px') : undefined}
      >
        {#each component.toolbarButtons as name, index (`${name}-${index}`)}
          {@render toolbarEntry(name)}
        {/each}
      </div>
    {/if}
    {#if editor && openPanel === 'textColor'}
      {@const instance = editor}
      <div
        role="group"
        aria-label={toolbarButtonLabel('textColor', translate)}
        class="flex flex-wrap items-center gap-1 border-b p-1"
        data-slot="rich-editor-text-colors"
      >
        {#each component.textColors ?? [] as color (color.value)}
          <!-- Palette colours are runtime values: no Tailwind class can hold them. -->
          <button
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={colorPressed(color.value)}
            class="focus-visible:ring-ring/50 size-6 rounded-full border shadow-xs outline-none focus-visible:ring-[3px] aria-pressed:ring-2"
            style:background-color={color.value}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => {
              setTextColor(instance, color.value)
              openPanel = null
            }}
          ></button>
        {/each}
        {#if component.customTextColors}
          <input
            type="color"
            aria-label={t('editor.custom_color', {}, 'Custom color')}
            title={t('editor.custom_color', {}, 'Custom color')}
            class="size-6 cursor-pointer rounded border bg-transparent p-0"
            oninput={(event) => setTextColor(instance, event.currentTarget.value)}
          />
        {/if}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('editor.remove_color', {}, 'Remove color')}
          title={t('editor.remove_color', {}, 'Remove color')}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => {
            setTextColor(instance, null)
            openPanel = null
          }}
        >
          <EraserIcon />
        </Button>
      </div>
    {/if}
    {#if tableToolbar}
      <div
        {@attach tableToolbarKeyboard}
        role="toolbar"
        aria-label={toolbarButtonLabel('table', translate)}
        class="flex flex-wrap items-center gap-0.5 border-b p-1"
        data-slot="rich-editor-table-toolbar"
      >
        {#each TABLE_TOOLBAR_BUTTONS as name (name)}
          {@render toolbarButton(name)}
        {/each}
      </div>
    {/if}
    <div class="@container">
      <div class="flex flex-col-reverse @2xl:flex-row">
        <div
          bind:this={element}
          data-slot="rich-editor"
          class="min-w-0 flex-1"
          style:max-height={component.maxHeight ? `${component.maxHeight}px` : undefined}
          style:overflow-y={component.maxHeight ? 'auto' : undefined}
        ></div>
        {#if editor && sidePanel}
          <RichEditorSidePanel
            panel={sidePanel}
            {component}
            {editable}
            sticky={component.stickyPanels ? (stickyTop ?? '0px') : null}
            onInsertBlock={(blockId) => void rich.insertBlock(blockId)}
            onInsertMergeTag={insertMergeTag}
            onClose={() => (sidePanel = null)}
          />
        {/if}
      </div>
    </div>
    {#if editor && floating && floating.buttons.length > 0}
      {@const style = floatingToolbarStyle(floating.coords)}
      <!-- Runtime coordinates cannot be Tailwind classes. -->
      <div
        {@attach floatingToolbarKeyboard}
        role="toolbar"
        aria-label={t('editor.floating_toolbar', {}, 'Selection formatting')}
        data-slot="rich-editor-floating-toolbar"
        data-node={floating.node}
        class="bg-popover text-popover-foreground fixed z-50 flex items-center gap-0.5 rounded-md border p-1 shadow-md"
        style:left={style?.left}
        style:top={style?.top}
        style:transform={style?.transform}
      >
        {#each floating.buttons as name, index (`${name}-${index}`)}
          {@render toolbarEntry(name)}
        {/each}
      </div>
    {/if}
    <RichEditorSuggestions suggestions={rich.suggestions} {editor} id={`${field.id}-suggestions`} />
    {#if attachmentError}
      <p role="alert" class="text-destructive px-3 pb-2 text-xs">{attachmentError}</p>
    {/if}
    <input
      bind:this={fileInput}
      type="file"
      accept={(component.fileAttachments.acceptedFileTypes ?? ['image/*']).join(',')}
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      onchange={(event) =>
        event.currentTarget.files?.[0] && void uploadImage(event.currentTarget.files[0])}
    />
  </div>
</FieldWrapper>
