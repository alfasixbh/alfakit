<script lang="ts">
  import type { CodeEntrySchema } from '@alfakit/core'
  import { highlightCode } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { codeTokenClasses } from '../fields/code-tokens'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'

  /** `CodeEntry`: read-only code highlighted with the CodeEditor field's tokenizer. */
  let { component }: { component: CodeEntrySchema } = $props()

  const t = useT()
  let copied = $state(false)
  const code = $derived(typeof component.state === 'string' ? component.state : '')
  const tokens = $derived(highlightCode(code, component.grammar))

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      copied = true
      setTimeout(() => (copied = false), component.copyMessageDuration ?? 1500)
    })
  }
</script>

<EntryWrapper entry={component}>
  {#if code === ''}
    <EntryPlaceholder entry={component} />
  {:else}
    <div>
      <!-- Code reads left to right in every panel, and the copy button sits at its end. The
        `<pre>` keeps its padding while the `<code>` scrolls inside it, so a long first line
        scrolls under the padding, never under the button. -->
      <div dir="ltr" class="relative">
        <pre
          dir="ltr"
          data-slot="code-entry"
          data-grammar={component.grammar ?? undefined}
          data-light-theme={component.lightTheme ?? undefined}
          data-dark-theme={component.darkTheme ?? undefined}
          class={cn(
            'bg-muted/40 m-0 rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre',
            component.copyable && 'pe-10',
          )}><code class="block overflow-x-auto"
            >{#each tokens as token, index (index)}{#if token.kind === 'plain'}{token.text}{:else}<span
                  class={codeTokenClasses[token.kind]}>{token.text}</span
                >{/if}{/each}</code
          ></pre>
        {#if component.copyable}
          <button
            type="button"
            data-slot="code-entry-copy"
            class="text-muted-foreground hover:text-foreground bg-background/80 absolute end-2 top-2 rounded-md p-1"
            onclick={copy}
            aria-label={t('copy', {}, 'Copy')}
          >
            {#if copied}<CheckIcon class="size-4" />{:else}<CopyIcon class="size-4" />{/if}
          </button>
        {/if}
      </div>
      {#if component.copyable}
        {#if copied}
          <span role="status" class={cn('text-xs', !component.copyMessage && 'sr-only')}
            >{component.copyMessage ?? t('copied', {}, 'Copied')}</span
          >
        {/if}
      {/if}
    </div>
  {/if}
</EntryWrapper>
