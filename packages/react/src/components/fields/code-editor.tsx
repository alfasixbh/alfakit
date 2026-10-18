import type { CodeEditorSchema } from '@alfakit/core'
import { countCodeLines, highlightCode, indentCode, newlineWithIndent } from '@alfakit/core'
import { useMemo, useRef, type KeyboardEvent } from 'react'
import { useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { codeTokenClasses } from './code-tokens'

export { codeTokenClasses }

/**
 * A textarea layered over its highlighted copy: the browser keeps native editing,
 * selection, undo and screen reader support, and the copy underneath shows the colours.
 * Tab indents (Shift+Tab outdents); Escape then Tab moves focus on.
 */
export function CodeEditorField({ component }: { component: CodeEditorSchema }) {
  const t = useT()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
    component,
  )
  const code = typeof value === 'string' ? value : ''
  const tokens = useMemo(() => highlightCode(code, component.language), [code, component.language])
  const lines = countCodeLines(code)
  const releaseTab = useRef(false)
  const hintId = `${id}-tab-hint`
  const locked = disabled || readOnly

  const apply = (target: HTMLTextAreaElement, edit: ReturnType<typeof indentCode>) => {
    setValue(edit.value)
    // Restore the caret once React has written the new value.
    requestAnimationFrame(() => target.setSelectionRange(edit.selectionStart, edit.selectionEnd))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (locked) return

    const target = event.currentTarget

    if (event.key === 'Escape') {
      releaseTab.current = true
      return
    }

    if (event.key === 'Tab' && !releaseTab.current) {
      event.preventDefault()
      apply(
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
      apply(target, newlineWithIndent(code, target.selectionStart, target.selectionEnd))
    }

    releaseTab.current = false
  }

  const wrap = Boolean(component.wrap)
  const layer = cn(
    'col-start-1 row-start-1 m-0 min-w-0 border-0 p-3 font-mono text-sm leading-6',
    wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
  )

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        dir="ltr"
        data-slot="code-editor"
        data-language={component.language ?? undefined}
        className={cn(
          'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex overflow-auto rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )}
        style={{
          minHeight: component.minHeight ? `${component.minHeight}px` : undefined,
          maxHeight: component.maxHeight ? `${component.maxHeight}px` : undefined,
        }}
      >
        {component.lineNumbers && (
          <div
            aria-hidden="true"
            className="bg-muted/40 text-muted-foreground sticky start-0 shrink-0 border-e py-3 ps-3 pe-2 text-end font-mono text-sm leading-6 select-none"
          >
            {Array.from({ length: lines }, (_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
        )}
        <div className="grid min-w-0 flex-1">
          <pre aria-hidden="true" className={cn(layer, 'pointer-events-none')}>
            {tokens.map((token, index) =>
              token.kind === 'plain' ? (
                token.text
              ) : (
                <span key={index} className={codeTokenClasses[token.kind]}>
                  {token.text}
                </span>
              ),
            )}
            {/* Keeps a trailing newline's empty line visible. */}
            {'\n'}
          </pre>
          <textarea
            id={id}
            name={component.name}
            value={code}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={blur}
            disabled={disabled}
            readOnly={readOnly}
            required={component.required}
            autoFocus={component.autofocus}
            maxLength={component.maxLength}
            placeholder={component.placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap={wrap ? 'soft' : 'off'}
            {...aria}
            aria-describedby={
              [aria['aria-describedby'], locked ? null : hintId].filter(Boolean).join(' ') ||
              undefined
            }
            {...extraProps(
              component.extraInputAttributes,
              cn(
                layer,
                'caret-foreground placeholder:text-muted-foreground selection:bg-primary/25 resize-none overflow-hidden bg-transparent text-transparent outline-none selection:text-transparent',
              ),
            )}
            style={{ tabSize: component.tabSize }}
          />
        </div>
      </div>
      {!locked && (
        <span id={hintId} className="sr-only">
          {t(
            'code_editor.tab_hint',
            {},
            'Tab indents. Press Escape, then Tab, to leave the editor.',
          )}
        </span>
      )}
    </FieldWrapper>
  )
}
