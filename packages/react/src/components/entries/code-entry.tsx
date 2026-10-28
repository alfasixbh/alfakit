import type { CodeEntrySchema } from '@alfakit/core'
import { highlightCode } from '@alfakit/core'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { codeTokenClasses } from '../fields/code-tokens'
import { EntryPlaceholder, EntryWrapper } from './entry-wrapper'

/** `CodeEntry`: read-only code highlighted with the CodeEditor field's tokenizer. */
export function CodeEntryComponent({ component }: { component: CodeEntrySchema }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const code = typeof component.state === 'string' ? component.state : ''
  const tokens = useMemo(() => highlightCode(code, component.grammar), [code, component.grammar])

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), component.copyMessageDuration ?? 1500)
    })
  }

  return (
    <EntryWrapper entry={component}>
      {code === '' ? (
        <EntryPlaceholder entry={component} />
      ) : (
        <div>
          {/* Code reads left to right in every panel, and the copy button sits at its end.
            The `<pre>` keeps its padding while the `<code>` scrolls inside it, so a long first
            line scrolls under the padding, never under the button. */}
          <div dir="ltr" className="relative">
            <pre
              dir="ltr"
              data-slot="code-entry"
              data-grammar={component.grammar ?? undefined}
              data-light-theme={component.lightTheme ?? undefined}
              data-dark-theme={component.darkTheme ?? undefined}
              className={cn(
                'bg-muted/40 m-0 rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre',
                component.copyable && 'pe-10',
              )}
            >
              <code className="block overflow-x-auto">
                {tokens.map((token, index) =>
                  token.kind === 'plain' ? (
                    token.text
                  ) : (
                    <span key={index} className={codeTokenClasses[token.kind]}>
                      {token.text}
                    </span>
                  ),
                )}
              </code>
            </pre>
            {component.copyable && (
              <button
                type="button"
                data-slot="code-entry-copy"
                className="text-muted-foreground hover:text-foreground bg-background/80 absolute end-2 top-2 rounded-md p-1"
                onClick={copy}
                aria-label={t('copy', {}, 'Copy')}
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </button>
            )}
          </div>
          {component.copyable && copied && (
            <span role="status" className={cn('text-xs', !component.copyMessage && 'sr-only')}>
              {component.copyMessage ?? t('copied', {}, 'Copied')}
            </span>
          )}
        </div>
      )}
    </EntryWrapper>
  )
}
