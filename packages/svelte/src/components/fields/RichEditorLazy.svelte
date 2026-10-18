<script lang="ts" module>
  import type { RichEditorSchema } from '@alfakit/core'
  import { lazyLoader } from '../../lib/lazy'

  // Tiptap loads the first time a rich or Markdown editor is shown.
  const loader = lazyLoader<{ component: RichEditorSchema }>(() =>
    import('./RichEditorField.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import Lazy from '../../lib/Lazy.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Skeleton } from '../ui/skeleton'

  let { component }: { component: RichEditorSchema } = $props()

  const field = useField<string | null>(() => component)
</script>

<Lazy {loader} props={{ component }}>
  {#snippet fallback()}
    <FieldWrapper field={component} htmlFor={field.id} error={field.error}>
      <Skeleton class="h-40 w-full" aria-hidden="true" />
    </FieldWrapper>
  {/snippet}
</Lazy>
