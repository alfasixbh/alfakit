<script lang="ts">
  import type { LoadedRichEditorExtensions, RichEditorSchema } from '@alfakit/core'
  import { loadRichEditorExtensions } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Skeleton } from '../ui/skeleton'
  import RichEditorInput from './RichEditorInput.svelte'

  /**
   * The rich and Markdown editors. Plugin extensions (`RichEditor::plugins()`) load before
   * the editor is created, since Tiptap extensions can't be added afterwards.
   */
  let { component }: { component: RichEditorSchema } = $props()

  const NO_EXTENSIONS: LoadedRichEditorExtensions = { extensions: [], commands: {} }

  const field = useField<unknown>(() => component)
  const signature = $derived(
    (component.type === 'MarkdownEditor' ? [] : (component.extensions ?? [])).join('|'),
  )

  let loaded = $state<{ signature: string; value: LoadedRichEditorExtensions } | null>(null)

  $effect(() => {
    const current = signature

    if (current === '') return

    let cancelled = false

    void loadRichEditorExtensions(current.split('|')).then((value) => {
      if (!cancelled) loaded = { signature: current, value }
    })

    return () => {
      cancelled = true
    }
  })

  const ready = $derived.by(() => {
    if (signature === '') return NO_EXTENSIONS

    return loaded?.signature === signature ? loaded.value : null
  })
</script>

{#if ready}
  {#key signature}
    <RichEditorInput {component} plugins={ready} />
  {/key}
{:else}
  <FieldWrapper field={component} htmlFor={field.id} error={field.error}>
    <Skeleton class="h-40 w-full" aria-hidden="true" />
  </FieldWrapper>
{/if}
