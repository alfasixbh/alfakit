<script lang="ts">
  import type { CodeEditorSchema, TextEdit } from '@alfakit/core'
  import { countCodeLines, highlightCode, indentCode, newlineWithIndent } from '@alfakit/core'
  import { tick } from 'svelte'
  import { useT } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { codeTokenClasses } from './code-tokens'

  let { component }: { component: CodeEditorSchema } = $props()

  /**
   * A textarea layered over its highlighted copy: the browser keeps native editing,
   * selection, undo and screen reader support, and the copy underneath shows the colours.
   * Tab indents (Shift+Tab outdents); Escape then Tab moves focus on.
   */
  const t = useT()
  const field = useField<string | null>(() => component)
  const code = $derived(typeof field.value === 'string' ? field.value : '')
  const tokens = $derived(highlightCode(code, component.language))
  const lines = $derived(countCodeLines(code))
  const locked = $derived(field.disabled || field.readOnly)
  const hintId = $derived(`${field.id}-tab-hint`)
  const layer = $derived(
    cn(
      'col-start-1 row-start-1 m-0 min-w-0 border-0 p-3 font-mono text-sm leading-6',
      component.wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
    ),
  )
  let releaseTab = false
  // Keeps a trailing newline's empty line visible.
  const NEWLINE = '\n'

  const apply = async (target: HTMLTextAreaElement, edit: TextEdit) => {
    field.setValue(edit.value)
    await tick()
    target.setSelectionRange(edit.selectionStart, edit.selectionEnd)
  }

  const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (locked) return

    const target = event.currentTarget

    if (event.key === 'Escape') {
      releaseTab = true
      return
    }

    if (event.key === 'Tab' && !releaseTab) {
      event.preventDefault()
      void apply(
        target,
        indentCode(
          code,
          target.selectionStart,
          target.selectionEnd,
          component.tabSize,
          event.shiftKey,
        ),
      )
    } else if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      void apply(target, newlineWithIndent(code, target.selectionStart, target.selectionEnd))
    }

    releaseTab = false
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    dir="ltr"
    data-slot="code-editor"
    data-language={component.language}
    class={cn(
      'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex overflow-auto rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
      field.error && 'border-destructive',
      field.disabled && 'opacity-50',
    )}
    style:min-height={component.minHeight ? `${component.minHeight}px` : undefined}
    style:max-height={component.maxHeight ? `${component.maxHeight}px` : undefined}
  >
    {#if component.lineNumbers}
      <div
        aria-hidden="true"
        class="bg-muted/40 text-muted-foreground sticky start-0 shrink-0 border-e py-3 ps-3 pe-2 text-end font-mono text-sm leading-6 select-none"
      >
        {#each { length: lines } as _, index (index)}<div>{index + 1}</div>{/each}
      </div>
    {/if}
    <div class="grid min-w-0 flex-1">
      <pre
        aria-hidden="true"
        class={cn(
          layer,
          'pointer-events-none',
        )}>{#each tokens as token, index (index)}{#if token.kind === 'plain'}{token.text}{:else}<span
              class={codeTokenClasses[token.kind]}>{token.text}</span
            >{/if}{/each}{NEWLINE}</pre>
      <textarea
        id={field.id}
        name={component.name}
        value={code}
        disabled={field.disabled}
        readonly={field.readOnly}
        required={component.required}
        {...component.autofocus ? { autofocus: true } : {}}
        maxlength={component.maxLength}
        placeholder={component.placeholder}
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        wrap={component.wrap ? 'soft' : 'off'}
        {...field.aria}
        aria-describedby={[field.aria['aria-describedby'], locked ? null : hintId]
          .filter(Boolean)
          .join(' ') || undefined}
        {...extraProps(
          component.extraInputAttributes,
          cn(
            layer,
            'caret-foreground placeholder:text-muted-foreground resize-none overflow-hidden bg-transparent text-transparent outline-none selection:bg-primary/25 selection:text-transparent',
          ),
        )}
        style:tab-size={component.tabSize}
        oninput={(event) => field.setValue(event.currentTarget.value)}
        {onkeydown}
        onblur={field.blur}></textarea>
    </div>
  </div>
  {#if !locked}
    <span id={hintId} class="sr-only"
      >{t(
        'code_editor.tab_hint',
        {},
        'Tab indents. Press Escape, then Tab, to leave the editor.',
      )}</span
    >
  {/if}
</FieldWrapper>
