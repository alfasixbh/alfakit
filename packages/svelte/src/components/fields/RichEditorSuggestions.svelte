<script lang="ts">
  import { fixedContainingBlockOffset, type EditorSuggestions } from '@alfakit/core'
  import type { Editor } from '@tiptap/core'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'

  let {
    suggestions,
    editor,
    id,
  }: { suggestions: EditorSuggestions; editor: Editor | null; id: string } = $props()

  const t = useT()
  // svelte-ignore state_referenced_locally
  const state = useStore(suggestions.store)
  // Inside a modal the dialog's transform is the containing block of this fixed list.
  const offset = $derived(
    state.current.open && editor ? fixedContainingBlockOffset(editor.view.dom) : { x: 0, y: 0 },
  )
</script>

<!-- The mention / merge tag listbox under the trigger. -->
{#if state.current.open && editor}
  <div
    {id}
    role="listbox"
    aria-label={t('editor.suggestions', {}, 'Suggestions')}
    data-slot="rich-editor-suggestions"
    class="bg-popover text-popover-foreground fixed z-50 min-w-48 overflow-hidden rounded-md border p-1 shadow-md"
    style:left={state.current.coords ? `${state.current.coords.left - offset.x}px` : undefined}
    style:top={state.current.coords ? `${state.current.coords.bottom + 4 - offset.y}px` : undefined}
  >
    {#if state.current.loading && state.current.items.length === 0}
      <div class="text-muted-foreground px-2 py-1.5 text-sm">{t('loading', {}, 'Loading…')}</div>
    {:else if state.current.items.length === 0}
      <div class="text-muted-foreground px-2 py-1.5 text-sm">
        {t('no_results', {}, 'No results.')}
      </div>
    {:else}
      {#each state.current.items as item, index (item.id)}
        <div
          id={`${id}-${index}`}
          role="option"
          tabindex="-1"
          aria-selected={index === state.current.index}
          class={cn(
            'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
            index === state.current.index && 'bg-accent text-accent-foreground',
          )}
          onmousedown={(event) => event.preventDefault()}
          onmouseenter={() => suggestions.highlight(index)}
          onclick={() => editor && suggestions.select(index, editor)}
          onkeydown={() => {}}
        >
          {state.current.kind === 'mention' ? `${state.current.trigger}${item.label}` : item.label}
        </div>
      {/each}
    {/if}
  </div>
{/if}
