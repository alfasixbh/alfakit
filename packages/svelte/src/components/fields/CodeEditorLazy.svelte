<script lang="ts" module>
  import type { CodeEditorSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // The editor's code loads the first time a code editor is shown.
  const loader = lazyLoader<{ component: CodeEditorSchema }>(() =>
    import('./CodeEditorField.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'

  let { component }: { component: CodeEditorSchema } = $props()

  const field = useField<string | null>(() => component)
  // Keeps a trailing newline's empty line visible.
  const NEWLINE = '\n'
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <!-- What the server renders and hydration shows: the code, read-only and unhighlighted. -->
    <FieldWrapper field={component} htmlFor={field.id} error={field.error}>
      <pre
        dir="ltr"
        data-slot="code-editor"
        aria-busy="true"
        class="border-input dark:bg-input/30 m-0 overflow-auto rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre"
        style:min-height={component.minHeight ? `${component.minHeight}px` : undefined}
        style:max-height={component.maxHeight
          ? `${component.maxHeight}px`
          : undefined}>{typeof field.value === 'string' ? field.value : ''}{NEWLINE}</pre>
    </FieldWrapper>
  {/snippet}
</Lazy>
